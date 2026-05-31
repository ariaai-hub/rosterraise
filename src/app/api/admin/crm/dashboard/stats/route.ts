import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/dashboard/stats
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, activeLeads, wonThisMonth, pipelineValue, totalReplies, totalSent] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { stage: { lt: 10 } } }),
      prisma.lead.count({
        where: {
          stage: 10,
          wonAt: { gte: startOfMonth },
        },
      }),
      prisma.lead.aggregate({
        where: { stage: { lt: 10 } },
        _sum: { aiEstimatedValue: true },
      }),
      prisma.engagementEvent.count({ where: { responseText: { not: null } } }),
      prisma.engagementEvent.count({ where: { channel: { in: ['email', 'fb_dm', 'fb_comment'] } } }),
    ]);

    // Won this month with contract value
    const wonLeadsThisMonth = await prisma.lead.findMany({
      where: { stage: 10, wonAt: { gte: startOfMonth } },
      select: { contractValue: true },
    });
    const wonRevenueThisMonth = wonLeadsThisMonth.reduce((sum, l) => sum + (l.contractValue || 0), 0);

    const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;

    return NextResponse.json({
      totalLeads,
      activeLeads,
      wonThisMonth: wonLeadsThisMonth.length,
      wonRevenueThisMonth,
      pipelineValue: pipelineValue._sum.aiEstimatedValue || 0,
      totalReplies,
      totalSent,
      replyRate: Math.round(replyRate * 100) / 100,
    });
  } catch (error) {
    console.error('CRM dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}