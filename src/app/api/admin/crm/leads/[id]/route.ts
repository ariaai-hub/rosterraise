import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/leads/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        engagementEvents: { orderBy: { createdAt: 'desc' } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('CRM lead get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/crm/leads/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { estimatedStudents, stage, ...rest } = body;

    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Auto-update aiEstimatedValue if estimatedStudents changed
    let aiEstimatedValue = existing.aiEstimatedValue;
    if (estimatedStudents !== undefined && estimatedStudents !== existing.estimatedStudents) {
      aiEstimatedValue = estimatedStudents * 10 * 0.70;
    }

    // Stage change: auto-set stageChangedAt
    const stageChangedAt = stage !== undefined && stage !== existing.stage ? new Date() : existing.stageChangedAt;

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(estimatedStudents !== undefined ? { estimatedStudents, aiEstimatedValue } : {}),
        ...(stage !== undefined ? { stage, stageChangedAt } : {}),
      },
      include: { engagementEvents: { orderBy: { createdAt: 'desc' } } },
    });

    // Log engagement event for stage change
    if (stage !== undefined && stage !== existing.stage) {
      await prisma.engagementEvent.create({
        data: {
          leadId: params.id,
          channel: 'system',
          actionType: 'stage_change',
          contentPreview: `Stage changed from ${existing.stage} to ${stage}`,
          fullContent: `Lead moved from stage ${existing.stage} to stage ${stage}`,
          isAuto: false,
          sentBy: session.id || 'admin',
        },
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('CRM lead patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/crm/leads/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete: set deletedAt or just mark as inactive
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: { schoolName: '[ARCHIVED] ' + params.id },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('CRM lead delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}