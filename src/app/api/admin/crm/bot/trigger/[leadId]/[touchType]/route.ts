import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/bot/trigger/[leadId]/[touchType]
export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string; touchType: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, touchType } = params;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Determine channel and actionType based on touchType
    const touchMap: Record<string, { channel: string; actionType: string }> = {
      touch1: { channel: 'fb_comment', actionType: 'sent' },
      touch2: { channel: 'fb_dm', actionType: 'sent' },
      touch3: { channel: 'email', actionType: 'sent' },
      day7: { channel: 'email', actionType: 'follow_up' },
      day10: { channel: 'email', actionType: 'follow_up' },
    };

    const touch = touchMap[touchType];
    if (!touch) {
      return NextResponse.json({ error: 'Invalid touchType' }, { status: 400 });
    }

    const event = await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: touch.channel,
        actionType: touch.actionType,
        contentPreview: `Manual touch triggered: ${touchType}`,
        fullContent: `Manually triggered ${touchType} for lead ${lead.schoolName}`,
        isAuto: false,
        sentBy: session.id || 'admin',
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('CRM bot trigger error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}