import { sendPaymentReminders, NotificationType } from '@/lib/utils/notifications';
import connectDB from '@/lib/db/connect';
import { GroupMember } from '@/lib/db/models/GroupMember';
import { Group } from '@/lib/db/models/Group';
import { User } from '@/lib/db/models/User';

// Import email service if available, or create a simple one
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    // Replace with your actual email service (Resend, SendGrid, Nodemailer, etc.)
    console.log(`📧 [Email Simulation] To: ${to}, Subject: ${subject}`);
    
    // Example using Resend (uncomment and configure if you have Resend set up)
    /*
    const { data, error } = await resend.emails.send({
      from: 'ROSCA System <notifications@yourdomain.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
    */
    
    // For now, just log and return success
    console.log('📧 Email content:', html.substring(0, 100) + '...');
    return true;
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

export async function runPaymentReminders() {
  try {
    console.log('🔔 Running payment reminder cron job...');
    
    // Connect to database
    await connectDB();
    
    // Send automatic payment reminders using the enhanced function
    await sendEnhancedPaymentReminders();
    
    // Also run the standard notification reminders
    await sendPaymentReminders();
    
    console.log('✅ Payment reminder cron job completed');
    return { success: true, timestamp: new Date().toISOString() };
    
  } catch (error) {
    console.error('❌ Error in payment reminder cron:', error);
    throw error;
  }
}

// ✅ Enhanced payment reminder function with snapshot data
async function sendEnhancedPaymentReminders() {
  try {
    await connectDB();
    
    // Get current date for filtering
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Find active members in active groups with upcoming payments
    const membersToRemind = await GroupMember.find({
      status: 'active',
      nextPaymentDue: { 
        $lte: nextWeek, // Due within the next week
        $gte: today     // Not past due
      }
    }).populate('groupId');

    let reminderCount = 0;
    let emailCount = 0;

    for (const member of membersToRemind) {
      if (!member.groupId) continue;

      // ✅ EMAIL SENT TO SNAPSHOT ADDRESS
      const emailTarget = member.email; 
      const memberName = member.name;
      const group = member.groupId as any;
      const groupName = group.name;
      
      // Only send if email exists and group is active
      if (!emailTarget || group.status !== 'active') continue;
      
      try {
        // Calculate days until due
        const dueDate = member.nextPaymentDue ? new Date(member.nextPaymentDue) : null;
        const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        // Determine urgency based on days until due
        let urgency = 'normal';
        if (daysUntilDue <= 1) urgency = 'urgent';
        else if (daysUntilDue <= 3) urgency = 'soon';
        
        // Send email
        const emailSent = await sendEmail({
          to: emailTarget,
          subject: `[${urgency === 'urgent' ? 'URGENT' : 'Reminder'}] Payment Due for ${groupName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${urgency === 'urgent' ? '#dc2626' : '#333'};">Payment ${urgency === 'urgent' ? 'Due Soon!' : 'Reminder'}</h2>
              <p>Hi <strong>${memberName}</strong>,</p>
              <p>This is a friendly reminder that your payment for <strong>${groupName}</strong> is due soon.</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Payment Details:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Group:</strong> ${groupName}</li>
                  <li><strong>Amount Due:</strong> ₹${group.contributionAmount}</li>
                  <li><strong>Due Date:</strong> ${dueDate ? dueDate.toLocaleDateString() : 'ASAP'}</li>
                  <li><strong>Days Remaining:</strong> ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</li>
                  <li><strong>Payment Status:</strong> ${member.totalPaid >= group.contributionAmount ? 'Fully Paid' : 
                    member.totalPaid > 0 ? 'Partially Paid' : 'Not Paid'}</li>
                  <li><strong>Total Paid:</strong> ₹${member.totalPaid || 0}</li>
                  <li><strong>Frequency:</strong> ${group.frequency}</li>
                </ul>
              </div>
              ${urgency === 'urgent' ? 
                `<div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 10px 15px; margin: 20px 0;">
                  <p style="color: #dc2626; margin: 0;"><strong>⚠️ URGENT:</strong> Payment is due within 24 hours!</p>
                </div>` : ''}
              <p>Please make your payment at your earliest convenience to avoid any late fees.</p>
              <div style="margin: 25px 0; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Make Payment Now
                </a>
              </div>
              <p>If you have already made the payment, please ignore this reminder.</p>
              <p>Thank you,<br>The ROSCA Team</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                This is an automated reminder. Please do not reply to this email.<br>
                To manage your notification preferences, visit your account settings.
              </p>
            </div>
          `
        });
        
        if (emailSent) {
          emailCount++;
        }
        
        // Also send in-app notification
        try {
          if (member.userId) {
            const user = await User.findById(member.userId);
            if (user) {
              await import('@/lib/utils/notifications').then(async ({ sendNotification }) => {
                await sendNotification({
                  userId: user._id.toString(),
                  type: NotificationType.REMINDER,
                  title: daysUntilDue <= 1 ? 'Payment Due Tomorrow!' : 'Payment Reminder',
                  message: `Payment of ₹${group.contributionAmount} for ${groupName} is due ${dueDate ? 'on ' + dueDate.toLocaleDateString() : 'soon'}.`,
                  groupId: group._id.toString(),
                  priority: urgency === 'urgent' ? 'high' : 'medium',
                  data: {
                    memberId: member._id,
                    amount: group.contributionAmount,
                    dueDate: dueDate,
                    daysUntilDue: daysUntilDue
                  }
                });
              });
            }
          }
        } catch (notificationError) {
          console.error(`❌ Failed to send notification for ${memberName}:`, notificationError);
        }
        
        reminderCount++;
        console.log(`📧 Reminder sent to ${memberName} (${emailTarget}) for group ${groupName}`);
        
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${emailTarget}:`, emailError);
      }
    }
    
    console.log(`📊 Sent ${reminderCount} reminders (${emailCount} emails)`);
    return { reminderCount, emailCount };
    
  } catch (error) {
    console.error('❌ Error in enhanced payment reminders:', error);
    throw error;
  }
}

// ✅ POST endpoint for manual trigger (if needed)
export async function POST() {
  try {
    console.log('📮 Manual payment reminder trigger');
    
    const result = await runPaymentReminders();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ Error in POST payment reminder:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}