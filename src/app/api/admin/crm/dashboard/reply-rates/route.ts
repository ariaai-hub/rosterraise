import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/dashboard/reply-rates
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = ['email', 'fb_dm', 'fb_comment'];
    const channelStats = await Promise.all(
      channels.map(async (ch) => {
        const sent = await prisma.engagementEvent.count({ where: { channel: ch } });
        const replied = await prisma.engagementEvent.count({ where: { channel: ch, responseText: { not: null } } });
        return { channel: ch, sent, replied, rate: sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0 };
      })
    );

    // By sport
    const sportStats = await prisma.lead.findMany({
      where: { sport: { not: null } },
      select: { sport: true, engagementEvents: { where: { responseText: { not: null } } } },
    });
    const sportMap = new Map<string, { sent: number; replied: number }>();
    for (const lead of sportStats) {
      if (!lead.sport) continue;
      if (!sportMap.has(lead.sport)) sportMap.set(lead.sport, { sent: 0, replied: 0 });
      const stats = sportMap.get(lead.sport)!;
      stats.sent += lead.engagementEvents.length;
      stats.replied += lead.engagementEvents.filter(e => e.responseText).length;
    }
    const bySport = Array.from(sportMap.entries()).map(([sport, s]) => ({
      sport,
      sent: s.sent,
      replied: s.replied,
      rate: s.sent > 0 ? Math.round((s.replied / s.sent) * 10000) / 100 : 0,
    }));

    // By stage
    const stageStats = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(async (st) => {
        const sent = await prisma.engagementEvent.count({
          where: { lead: { stage: st } },
        });
        const replied = await prisma.engagementEvent.count({
          where: { lead: { stage: st }, responseText: { not: null } },
        });
        return { stage: st, sent, replied, rate: sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0 };
      })
    );

    // Overall
    const totalSent = channelStats.reduce((s, c) => s + c.sent, 0);
    const totalReplied = channelStats.reduce((s, c) => s + c.replied, 0);

    return NextResponse.json({
      overall: { sent: totalSent, replied: totalReplied, rate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 10000) / 100 : 0 },
      byChannel: channelStats,
      bySport,
      byStage: stageStats,
    });
  } catch (error) {
    console.error('CRM reply rates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}