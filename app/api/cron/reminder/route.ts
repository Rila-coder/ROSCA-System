import { NextRequest, NextResponse } from 'next/server';
import { runPaymentReminders } from '@/lib/cron/reminders';

export async function GET(request: NextRequest) {
  try {
    // Security check for cron job execution
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If cron secret is set, validate the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔔 Starting automatic payment reminder cron job...');
    
    // Run the payment reminders
    await runPaymentReminders();
    
    console.log('✅ Cron job completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}