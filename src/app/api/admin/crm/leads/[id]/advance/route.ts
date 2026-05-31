import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/leads/[id]/advance
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toStage } = await request.json();
    if (toStage === undefined) {
      return NextResponse.json({ error: 'toStage is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        stage: toStage,
        stageChangedAt: new Date(),
        lastContactedAt: new Date(),
        ...(toStage >= 6 ? { isHot: true } : {}),
      },
      include: { engagementEvents: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    // Log engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId: params.id,
        channel: 'system',
        actionType: 'advance',
        contentPreview: `Stage advanced to ${toStage}`,
        fullContent: `Lead advanced from stage ${lead.stage} to stage ${toStage}`,
        isAuto: false,
        sentBy: session.id || 'admin',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('CRM lead advance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}