import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/team/performance
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { role: { in: ['SALES_REP', 'CS', 'ADMIN'] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const leaderboard = await Promise.all(users.map(async (u) => {
      const [assignedLeads, qualifiedLeads, proposals, wonLeads, revenueAgg] = await Promise.all([
        prisma.lead.count({ where: { assignedTo: u.id } }),
        prisma.lead.count({ where: { assignedTo: u.id, stage: { gte: 7 } } }),
        prisma.lead.count({ where: { assignedTo: u.id, stage: 8 } }),
        prisma.lead.count({ where: { assignedTo: u.id, stage: 10 } }),
        prisma.lead.aggregate({ where: { assignedTo: u.id, stage: 10 }, _sum: { contractValue: true } }),
      ]);

      return {
        rep: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email },
        assignedLeads, qualifiedLeads, proposals, won: wonLeads,
        revenue: revenueAgg._sum.contractValue || 0,
      };
    }));

    // Sort by won count then revenue
    leaderboard.sort((a, b) => b.won - a.won || b.revenue - a.revenue);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('CRM team performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}