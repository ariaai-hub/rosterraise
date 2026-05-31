import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string } | null) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, sequenceId } = body;

    if (!leadId || !sequenceId) {
      return NextResponse.json({ error: 'leadId and sequenceId are required' }, { status: 400 });
    }

    const [lead, sequence] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.emailSequence.findUnique({
        where: { id: sequenceId },
      }),
    ]);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    if (!sequence.isActive) {
      return NextResponse.json({ error: 'Sequence is not active' }, { status: 400 });
    }

    const steps = JSON.parse(sequence.steps as string) as Array<{ delayDays: number }>;
    if (!steps || steps.length === 0) {
      return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 });
    }

    const firstStep = steps[0];
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + (firstStep.delayDays || 0));

    const enrollment = await prisma.emailSequenceEnrollment.upsert({
      where: {
        leadId_sequenceId: { leadId, sequenceId },
      },
      create: {
        leadId,
        sequenceId,
        currentStep: 0,
        nextStepAt,
        isActive: true,
      },
      update: {
        currentStep: 0,
        nextStepAt,
        completedAt: null,
        isActive: true,
      },
    });

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'EMAIL',
        actionType: 'SEQUENCE_ENROLLED',
        contentPreview: `Enrolled in sequence: ${sequence.name}`,
        fullContent: JSON.stringify({ sequenceId, sequenceName: sequence.name, enrolledAt: enrollment.enrolledAt }),
        isAuto: false,
        sentBy: session?.id || 'admin',
        responseText: null,
      },
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        leadId: enrollment.leadId,
        sequenceId: enrollment.sequenceId,
        currentStep: enrollment.currentStep,
        nextStepAt: enrollment.nextStepAt,
      },
    });
  } catch (error) {
    console.error('Email sequence enroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
