import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const events = await prisma.engagementEvent.findMany({
      where: {
        leadId,
        channel: { in: ['sms', 'SMS_SENT', 'SMS_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const smsHistory = events
      .filter(e => e.channel === 'sms' || e.actionType === 'SMS_SENT' || e.actionType === 'SMS_FAILED')
      .map(e => ({
        id: e.id,
        actionType: e.actionType,
        contentPreview: e.contentPreview,
        fullContent: e.fullContent,
        messageId: e.messageId,
        sentBy: e.sentBy,
        responseText: e.responseText,
        createdAt: e.createdAt,
        isSuccess: e.actionType === 'SMS_SENT',
      }));

    return NextResponse.json(smsHistory);
  } catch (error) {
    console.error('SMS history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
