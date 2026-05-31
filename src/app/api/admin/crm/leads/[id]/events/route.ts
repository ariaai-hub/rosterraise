import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/leads/[id]/events
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.engagementEvent.findMany({
      where: { leadId: params.id },
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { id: true, schoolName: true, stage: true } } },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('CRM lead events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}