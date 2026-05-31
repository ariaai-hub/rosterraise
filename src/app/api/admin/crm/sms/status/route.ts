import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missingKeys: string[] = [];
    if (!process.env.TWILIO_ACCOUNT_SID) missingKeys.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) missingKeys.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_PHONE_NUMBER) missingKeys.push('TWILIO_PHONE_NUMBER');

    return NextResponse.json({
      configured: missingKeys.length === 0,
      missingKeys,
    });
  } catch {
    return NextResponse.json({
      configured: false,
      missingKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    });
  }
}
