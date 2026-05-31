import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/revenue/summary
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [wonThisMonth, wonLastMonth, avgDealSize, pipelineValue] = await Promise.all([
      prisma.lead.findMany({
        where: { stage: 10, wonAt: { gte: startOfMonth } },
        select: { contractValue: true },
      }),
      prisma.lead.findMany({
        where: { stage: 10, wonAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        select: { contractValue: true },
      }),
      prisma.lead.aggregate({ where: { stage: 10 }, _avg: { contractValue: true } }),
      prisma.lead.aggregate({ where: { stage: { lt: 10 } }, _sum: { aiEstimatedValue: true } }),
    ]);

    const thisMonthRevenue = wonThisMonth.reduce((s, l) => s + (l.contractValue || 0), 0);
    const lastMonthRevenue = wonLastMonth.reduce((s, l) => s + (l.contractValue || 0), 0);
    const trend = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100 : 0;

    return NextResponse.json({
      wonThisMonth: { count: wonThisMonth.length, revenue: thisMonthRevenue },
      wonLastMonth: { count: wonLastMonth.length, revenue: lastMonthRevenue },
      trend,
      avgDealSize: avgDealSize._avg.contractValue || 0,
      pipelineValue: pipelineValue._sum.aiEstimatedValue || 0,
    });
  } catch (error) {
    console.error('CRM revenue summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}