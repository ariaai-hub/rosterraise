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
    const { leadIds, message } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: 'Message exceeds 1600 character limit' }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { leadId: string; error: string }[],
      timestamp: new Date().toISOString(),
    };

    for (const lead of leads) {
      if (!validatePhone(lead.phone)) {
        results.failed++;
        results.errors.push({ leadId: lead.id, error: 'Invalid or missing phone number' });
        continue;
      }

      const formattedPhone = formatPhoneForTwilio(lead.phone || '');
      const result = await sendSms(formattedPhone, message);

      if (result.success) {
        results.sent++;
        await prisma.engagementEvent.create({
          data: {
            leadId: lead.id,
            channel: 'sms',
            actionType: 'SMS_SENT',
            messageId: result.sid || null,
            contentPreview: message.substring(0, 100),
            fullContent: message,
            isAuto: false,
            sentBy: session.id || 'admin',
          },
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { lastContactedAt: new Date() },
        });
      } else {
        results.failed++;
        results.errors.push({ leadId: lead.id, error: result.error || 'Unknown error' });
        await prisma.engagementEvent.create({
          data: {
            leadId: lead.id,
            channel: 'sms',
            actionType: 'SMS_FAILED',
            contentPreview: message.substring(0, 100),
            fullContent: message,
            isAuto: false,
            sentBy: session.id || 'admin',
            responseText: result.error || null,
          },
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('SMS bulk send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
