import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/revenue/by-state
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: { stage: 10, schoolState: { not: null } },
      select: { schoolState: true, contractValue: true },
    });

    const byState: Record<string, { count: number; revenue: number }> = {};
    for (const lead of leads) {
      if (!lead.schoolState) continue;
      if (!byState[lead.schoolState]) byState[lead.schoolState] = { count: 0, revenue: 0 };
      byState[lead.schoolState].count++;
      byState[lead.schoolState].revenue += lead.contractValue || 0;
    }

    return NextResponse.json(
      Object.entries(byState)
        .map(([state, data]) => ({ state, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
    );
  } catch (error) {
    console.error('CRM revenue by-state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}