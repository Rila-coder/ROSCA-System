import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/utils/auth";
import connectDB from "@/lib/db/connect";
import { Group } from "@/lib/db/models/Group";
import { GroupSettings } from "@/lib/db/models/GroupSettings";
import { GroupMember } from "@/lib/db/models/GroupMember"; // ✅ Added Import
import { User } from "@/lib/db/models/User";
import {
  sendNotificationToAllMembers,
  NotificationType,
} from "@/lib/utils/notifications";

// --- GET SETTINGS ---
export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;

    // Check permissions
    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (!group.leaderId.equals(user._id))
      return NextResponse.json(
        { error: "Only leader can view settings" },
        { status: 403 }
      );

    // ✅ NEW: Count current active members
    const currentMemberCount = await GroupMember.countDocuments({
      groupId,
      status: { $in: ['active', 'pending'] } // We count active and pending as "occupied spots"
    });

    // Fetch or Init settings
    let settings = await GroupSettings.findOne({ groupId });
    if (!settings) {
      settings = new GroupSettings({
        groupId,
        groupName: group.name,
        description: group.description || "",
        contributionAmount: group.contributionAmount,
        frequency: group.frequency,
      });
      await settings.save();
    }

    return NextResponse.json({ 
      settings,
      currentMemberCount // ✅ Send this to frontend
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// --- UPDATE SETTINGS ---
export async function PUT(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    const params = await context.params;
    const groupId = params.groupsId || params.groupId || params.id;
    const data = await request.json();

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (!group.leaderId.equals(user._id))
      return NextResponse.json(
        { error: "Only leader can update settings" },
        { status: 403 }
      );

    // ✅ VALIDATION: Check Max Members Limit
    if (data.maxMembers !== undefined) {
      const currentCount = await GroupMember.countDocuments({
        groupId,
        status: { $in: ['active', 'pending'] }
      });

      if (data.maxMembers < currentCount) {
        return NextResponse.json(
          { 
            error: `Cannot set max members to ${data.maxMembers}. Group already has ${currentCount} members.` 
          },
          { status: 400 }
        );
      }
    }

    // Track changes for notifications
    const oldGroupName = group.name;
    const oldContributionAmount = group.contributionAmount;
    const oldFrequency = group.frequency;
    const changes = [];

    // 1. Update Settings Document
    let settings = await GroupSettings.findOne({ groupId });
    if (!settings) {
      settings = new GroupSettings({ groupId, ...data });
    } else {
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined) settings[key] = data[key];
      });
    }
    await settings.save();

    // 2. DYNAMIC UPDATE: Sync Core Group Data
    let groupUpdated = false;

    if (data.groupName && data.groupName !== group.name) {
      group.name = data.groupName;
      groupUpdated = true;
      changes.push(
        `Group name changed from "${oldGroupName}" to "${data.groupName}"`
      );
    }

    if (
      data.description !== undefined &&
      data.description !== group.description
    ) {
      group.description = data.description;
      groupUpdated = true;
      changes.push("Group description updated");
    }

    if (
      data.contributionAmount &&
      data.contributionAmount !== group.contributionAmount
    ) {
      group.contributionAmount = data.contributionAmount;
      groupUpdated = true;
      changes.push(
        `Contribution amount changed from ₹${oldContributionAmount} to ₹${data.contributionAmount}`
      );
    }

    if (data.frequency && data.frequency !== group.frequency) {
      group.frequency = data.frequency;
      groupUpdated = true;
      changes.push(
        `Payment frequency changed from ${oldFrequency} to ${data.frequency}`
      );
    }

    if (groupUpdated) {
      await group.save();
    }

    // NOTIFICATION: Notify members about settings changes
    if (changes.length > 0) {
      let notificationTitle = "Group Settings Updated";
      let notificationMessage = "";

      if (changes.length === 1) {
        notificationMessage = `${changes[0]}.`;
      } else {
        notificationMessage = `Multiple settings updated by the leader.`;
      }

      await sendNotificationToAllMembers({
        groupId,
        type: NotificationType.GROUP,
        title: notificationTitle,
        message: notificationMessage,
        priority: "medium",
        data: {
          changes: changes,
          changedBy: user.name,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
      groupUpdates: groupUpdated ? changes : [],
      message:
        changes.length > 0
          ? `Settings updated successfully. ${changes.join(" ")}`
          : "Settings saved.",
    });
  } catch (error) {
    console.error("Error updating settings:", error);

    let message = "Unknown error";

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: "Failed to update settings",
        details: message,
      },
      { status: 500 }
    );
  }
}