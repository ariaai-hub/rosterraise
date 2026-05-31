import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/revenue/forecast
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 30-day: stage>=7 leads × 0.3 probability factor
    const thirtyDayLeads = await prisma.lead.aggregate({
      where: { stage: { gte: 7 } },
      _sum: { contractValue: true },
    });
    const thirtyDay = ((thirtyDayLeads._sum.contractValue || 0) * 0.3);

    // 90-day: stage>=5 leads × 0.15 probability factor
    const ninetyDayLeads = await prisma.lead.aggregate({
      where: { stage: { gte: 5 } },
      _sum: { contractValue: true },
    });
    const ninetyDay = ((ninetyDayLeads._sum.contractValue || 0) * 0.15);

    return NextResponse.json({ thirtyDay: Math.round(thirtyDay), ninetyDay: Math.round(ninetyDay) });
  } catch (error) {
    console.error('CRM revenue forecast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}