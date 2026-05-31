import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/leads/export
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const sport = searchParams.get('sport');
    const state = searchParams.get('state');

    const where: Record<string, unknown> = {};
    if (stage) where.stage = parseInt(stage, 10);
    if (sport) where.sport = sport;
    if (state) where.schoolState = state;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { assignedUser: { select: { firstName: true, lastName: true } } },
    });

    const headers = [
      'id', 'firstName', 'lastName', 'schoolName', 'schoolCity', 'schoolState',
      'email', 'phone', 'sport', 'stage', 'isHot', 'estimatedStudents',
      'aiEstimatedValue', 'contractValue', 'assignedTo', 'tags', 'createdAt',
    ];

    const rows = leads.map(l => [
      l.id, l.firstName || '', l.lastName || '', l.schoolName, l.schoolCity || '',
      l.schoolState || '', l.email || '', l.phone || '', l.sport || '',
      l.stage, l.isHot, l.estimatedStudents, l.aiEstimatedValue || '',
      l.contractValue || '', l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}` : '',
      JSON.stringify(l.tags), l.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="leads-export.csv"',
      },
    });
  } catch (error) {
    console.error('CRM leads export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}