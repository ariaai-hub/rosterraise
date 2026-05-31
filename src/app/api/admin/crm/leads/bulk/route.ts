import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/leads/bulk
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, action, value } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    switch (action) {
      case 'tag': {
        await prisma.lead.updateMany({
          where: { id: { in: ids } },
          data: { tags: { push: value } },
        });
        break;
      }
      case 'assign': {
        await prisma.lead.updateMany({
          where: { id: { in: ids } },
          data: { assignedTo: value },
        });
        break;
      }
      case 'stage': {
        await prisma.lead.updateMany({
          where: { id: { in: ids } },
          data: { stage: parseInt(value, 10), stageChangedAt: new Date() },
        });
        break;
      }
      case 'archive': {
        await prisma.lead.updateMany({
          where: { id: { in: ids } },
          data: { schoolName: { set: '[ARCHIVED] id' } }, // placeholder for soft archive
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.lead.findMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, updated: updated.length });
  } catch (error) {
    console.error('CRM bulk action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}