import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await prisma.emailSequence.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { isActive: true },
          take: 20,
          orderBy: { enrolledAt: 'desc' },
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, schoolName: true, email: true, stage: true },
            },
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: sequence.id,
      name: sequence.name,
      trigger: sequence.trigger,
      stages: JSON.parse(sequence.stages as string),
      steps: JSON.parse(sequence.steps as string),
      isActive: sequence.isActive,
      createdAt: sequence.createdAt,
      enrollmentCount: sequence._count.enrollments,
      recentEnrollments: sequence.enrollments.map(e => ({
        id: e.id,
        enrolledAt: e.enrolledAt,
        currentStep: e.currentStep,
        nextStepAt: e.nextStepAt,
        lead: e.lead,
      })),
    });
  } catch (error) {
    console.error('Email sequence GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, trigger, stages, steps, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (trigger !== undefined) updateData.trigger = trigger;
    if (stages !== undefined) updateData.stages = JSON.stringify(stages);
    if (steps !== undefined) updateData.steps = JSON.stringify(steps);
    if (isActive !== undefined) updateData.isActive = isActive;

    const sequence = await prisma.emailSequence.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      id: sequence.id,
      name: sequence.name,
      trigger: sequence.trigger,
      stages: JSON.parse(sequence.stages as string),
      steps: JSON.parse(sequence.steps as string),
      isActive: sequence.isActive,
      createdAt: sequence.createdAt,
    });
  } catch (error) {
    console.error('Email sequence PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.emailSequence.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email sequence DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
