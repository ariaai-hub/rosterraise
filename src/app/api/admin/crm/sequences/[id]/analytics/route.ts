import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/sequences/[id]/analytics
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Map sequence ID to channel
    const seqChannels: Record<string, string> = {
      touch1: 'fb_comment', touch2: 'fb_dm', touch3: 'email',
      day7: 'email', day10: 'email',
    };

    const channel = seqChannels[params.id];
    if (!channel) {
      return NextResponse.json({ error: 'Invalid sequence ID' }, { status: 404 });
    }

    const [sent, replied] = await Promise.all([
      prisma.engagementEvent.count({ where: { channel, actionType: 'sent' } }),
      prisma.engagementEvent.count({ where: { channel, responseText: { not: null } } }),
    ]);

    return NextResponse.json({
      sequenceId: params.id,
      sent,
      replied,
      replyRate: sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0,
    });
  } catch (error) {
    console.error('CRM sequence analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}