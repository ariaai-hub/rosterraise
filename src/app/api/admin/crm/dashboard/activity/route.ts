import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/dashboard/activity
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const events = await prisma.engagementEvent.findMany({
      where: { createdAt: { gte: last24h } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { lead: { select: { id: true, schoolName: true, stage: true } } },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('CRM activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}