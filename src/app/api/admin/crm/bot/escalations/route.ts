import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/bot/escalations
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { isHot: true },
          { stage: { gte: 8 }, stageChangedAt: { lte: tenDaysAgo } },
          { contractValue: { gt: 2500000 } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        engagementEvents: { orderBy: { createdAt: 'desc' }, take: 5 },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('CRM bot escalations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}