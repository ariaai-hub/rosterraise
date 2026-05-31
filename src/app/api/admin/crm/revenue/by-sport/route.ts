import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/revenue/by-sport
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: { stage: 10, sport: { not: null } },
      select: { sport: true, contractValue: true },
    });

    const bySport: Record<string, { count: number; revenue: number }> = {};
    for (const lead of leads) {
      if (!lead.sport) continue;
      if (!bySport[lead.sport]) bySport[lead.sport] = { count: 0, revenue: 0 };
      bySport[lead.sport].count++;
      bySport[lead.sport].revenue += lead.contractValue || 0;
    }

    return NextResponse.json(
      Object.entries(bySport)
        .map(([sport, data]) => ({ sport, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
    );
  } catch (error) {
    console.error('CRM revenue by-sport error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}