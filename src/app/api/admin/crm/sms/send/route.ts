import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendSms, formatPhoneForTwilio, validatePhone } from '@/lib/twilio';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, message } = body;

    if (!leadId || !message) {
      return NextResponse.json({ error: 'leadId and message are required' }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: 'Message exceeds 1600 character limit' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, phone: true, firstName: true, lastName: true, schoolName: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!validatePhone(lead.phone)) {
      return NextResponse.json({ error: 'Lead has no valid phone number' }, { status: 400 });
    }

    const formattedPhone = formatPhoneForTwilio(lead.phone || '');
    const result = await sendSms(formattedPhone, message);

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'sms',
        actionType: 'SMS_SENT',
        messageId: result.sid || null,
        contentPreview: message.substring(0, 100),
        fullContent: message,
        isAuto: false,
        sentBy: session.id || 'admin',
        responseText: result.error || null,
      },
    });

    if (result.success) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { lastContactedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: result.success,
      sid: result.sid,
      timestamp: result.timestamp,
      error: result.error || null,
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
