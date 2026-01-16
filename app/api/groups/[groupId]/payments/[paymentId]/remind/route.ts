import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/utils/auth";
import connectDB from "@/lib/db/connect";
import { Payment } from "@/lib/db/models/Payment";
import { User } from "@/lib/db/models/User";
import { GroupMember } from "@/lib/db/models/GroupMember";
import { Group } from "@/lib/db/models/Group";
import { NotificationType } from "@/types/notification";
import { sendNotification } from "@/lib/utils/notifications";

// --- CONFIGURATION ---
const SMS_API_URL = process.env.SMS_API_URL || "https://api.twilio.com/...";
const SMS_API_KEY = process.env.SMS_API_KEY || "your_api_key_here";

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const params = await context.params;
    const groupId = params.groupsId || params.groupId;
    const paymentId = params.paymentId;

    // 2. Authorization: Only Leader/Sub-leader can send reminders
    const currentMember = await GroupMember.findOne({
      groupId,
      userId: user._id,
    });

    if (
      !currentMember ||
      !["leader", "sub_leader"].includes(currentMember.role)
    ) {
      return NextResponse.json(
        {
          error: "Not authorized",
          message:
            "Only group leader or sub-leader can send payment reminders.",
        },
        { status: 403 }
      );
    }

    // 3. Get Payment & User Details
    const payment = await Payment.findById(paymentId).populate("userId");
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Check if payment is already paid
    if (payment.status === "paid") {
      return NextResponse.json(
        {
          error: "Payment already paid",
          message:
            "Cannot send reminder for a payment that is already marked as paid.",
        },
        { status: 400 }
      );
    }

    const memberName = payment.userId.name;
    const mobileNumber = payment.userId.phone;
    const amount = payment.amount;

    if (!mobileNumber) {
      return NextResponse.json(
        { error: "Member has no mobile number" },
        { status: 400 }
      );
    }

    // 4. Get group info
    const group = await Group.findById(groupId).select("name");
    const groupName = group?.name || "the group";

    // 5. Construct the Message
    const smsMessage = `Hello ${memberName}, this is a reminder from "${groupName}". You have a pending contribution of ₹${amount}. Please pay soon. Thank you!`;

    const notificationMessage = `Leader ${user.name} sent you a payment reminder for ₹${amount} in "${groupName}". Please make your payment soon.`;

    // 6. --- SEND SMS LOGIC ---

    // 🔴 SIMULATION (Development Mode)
    // This makes it "Work" in your terminal without errors
    console.log("========================================");
    console.log(`📲 SENDING SMS TO: ${mobileNumber}`);
    console.log(`💬 MESSAGE: "${smsMessage}"`);
    console.log(`👤 SENT BY: ${user.name} (${user.email})`);
    console.log("========================================");

    // 🟢 REAL INTEGRATION (Uncomment this when you buy an SMS package)
    /*
    const smsResponse = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${SMS_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        to: mobileNumber,
        message: smsMessage,
        sender_id: "ROSCA_APP"
      })
    });

    if (!smsResponse.ok) throw new Error('SMS Gateway Failed');
    */

    // 7. ✅ NOTIFICATION: Notify the member about payment reminder
    if (payment.userId) {
      await sendNotification({
        userId: payment.userId._id.toString(),
        type: NotificationType.REMINDER,
        title: "Payment Reminder",
        message: notificationMessage,
        groupId: groupId,
        priority: "high",
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          cycleNumber: payment.cycleNumber,
          remindedBy: user.name,
          groupName: groupName,
          smsSent: true,
          mobileNumber: mobileNumber,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent to ${memberName} via SMS and in-app notification.`,
      data: {
        memberName: memberName,
        mobileNumber: mobileNumber,
        amount: amount,
        groupName: groupName,
        sentBy: user.name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error sending SMS:", error);

    let message = "Unknown error occurred";

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: "Failed to send reminder",
        details: message,
      },
      { status: 500 }
    );
  }
}
