import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// Removed bcrypt import because the User Model handles hashing automatically via pre('save')
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { GroupMember } from "@/lib/db/models/GroupMember";
import { registerSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Phone";
      return NextResponse.json(
        { message: `${field} already registered` },
        { status: 409 }
      );
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // ✅ FIX: Do NOT hash password manually here.
    // The User Model's pre('save') hook will hash the plain password securely.
    // This prevents the "Double Hashing" bug that causes 401 login errors.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: password, // Sent as plain text -> Model hashes it
      verificationToken,
      isVerified: true, // Set to true if you don't want email verification
    });

    // ============================================================
    // 🔗 THE LINKING FIX
    // ============================================================
    try {
      // Search GroupMember by the SNAPSHOT email field
      const updateResult = await GroupMember.updateMany(
        { 
          email: email.toLowerCase(), 
          userId: null // Only link if not already linked
        },
        { 
          $set: { 
            userId: user._id, 
            status: 'active' 
          } 
        }
      );
      
      console.log(`Linked ${updateResult.modifiedCount} memberships to user ${email}`);
      
      // Also check the old pendingMemberDetails structure for backward compatibility
      if (updateResult.modifiedCount === 0) {
        const legacyUpdateResult = await GroupMember.updateMany(
          {
            "pendingMemberDetails.email": email.toLowerCase().trim(),
            userId: null,
          },
          {
            $set: {
              userId: user._id,
              status: "active",
              pendingMemberDetails: null,
            },
          }
        );
        console.log(`Legacy linking: Linked ${legacyUpdateResult.modifiedCount} memberships`);
      }
      
    } catch (linkError) {
      console.error("Error linking group memberships:", linkError);
    }
    // ============================================================

    // ✅ FIX: Do NOT generate token here.
    // This ensures the middleware doesn't think the user is logged in,
    // allowing the redirect to the Login page to work correctly.
    
    return NextResponse.json({
      message: "Registration successful. Please login.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
      },
      // No token returned implies no auto-login
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Email or phone number already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { message: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}