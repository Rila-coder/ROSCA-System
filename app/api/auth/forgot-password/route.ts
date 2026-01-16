import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { z } from "zod";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate request data
    const validation = forgotPasswordSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: "Validation error",
          errors: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }, 
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { message: "No account found with this email" }, 
        { status: 404 }
      );
    }

    // Set the new password (the User model will hash it automatically via pre-save hook)
    user.password = password;
    
    // Clear any existing reset tokens if present
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    return NextResponse.json({ 
      message: "Password updated successfully!",
      success: true
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Server error. Please try again later." }, 
      { status: 500 }
    );
  }
}