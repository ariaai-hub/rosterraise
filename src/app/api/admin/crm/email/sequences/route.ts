import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequences = await prisma.emailSequence.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    const result = sequences.map(seq => ({
      id: seq.id,
      name: seq.name,
      trigger: seq.trigger,
      stages: seq.stages,
      steps: seq.steps,
      isActive: seq.isActive,
      createdAt: seq.createdAt,
      enrollmentCount: seq._count.enrollments,
      activeEnrollments: seq.enrollments.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email sequences GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, trigger = 'AUTO_STAGE_CHANGE', stages = [], steps = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const sequence = await prisma.emailSequence.create({
      data: {
        name,
        trigger,
        stages: JSON.stringify(stages),
        steps: JSON.stringify(steps),
        isActive: true,
      },
    });

    return NextResponse.json({
      id: sequence.id,
      name: sequence.name,
      trigger: sequence.trigger,
      stages: JSON.parse(sequence.stages as string),
      steps: JSON.parse(sequence.steps as string),
      isActive: sequence.isActive,
      createdAt: sequence.createdAt,
      enrollmentCount: 0,
      activeEnrollments: 0,
    }, { status: 201 });
  } catch (error) {
    console.error('Email sequences POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
