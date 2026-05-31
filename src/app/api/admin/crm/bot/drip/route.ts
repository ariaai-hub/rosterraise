import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string } | null) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/bot/drip
// Enroll a lead in an email sequence
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, sequenceId } = body;

    if (!leadId || !sequenceId) {
      return NextResponse.json({ error: 'leadId and sequenceId are required' }, { status: 400 });
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify sequence exists
    const sequence = await prisma.emailSequence.findUnique({ where: { id: sequenceId } });
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    if (!sequence.isActive) {
      return NextResponse.json({ error: 'Sequence is inactive' }, { status: 400 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.emailSequenceEnrollment.findUnique({
      where: {
        leadId_sequenceId: { leadId, sequenceId },
      },
    });

    if (existingEnrollment && existingEnrollment.isActive) {
      return NextResponse.json({ 
        success: false, 
        reason: 'Lead already enrolled in this sequence',
        enrollment: existingEnrollment,
      });
    }

    // Parse sequence steps to determine next step timing
    let steps: any[] = [];
    try {
      steps = typeof sequence.steps === 'string' ? JSON.parse(sequence.steps as string) : sequence.steps;
    } catch {
      steps = [];
    }

    const firstStep = steps.find((s: any) => s.day === 0) || steps[0];
    const nextStepAt = firstStep?.delayHours 
      ? new Date(Date.now() + (firstStep.delayHours * 60 * 60 * 1000))
      : new Date(Date.now() + (24 * 60 * 60 * 1000)); // Default to 24 hours

    // Create or update enrollment
    const enrollment = await prisma.emailSequenceEnrollment.upsert({
      where: {
        leadId_sequenceId: { leadId, sequenceId },
      },
      create: {
        leadId,
        sequenceId,
        enrolledAt: new Date(),
        currentStep: 0,
        nextStepAt,
        isActive: true,
      },
      update: {
        enrolledAt: new Date(),
        currentStep: 0,
        nextStepAt,
        isActive: true,
        completedAt: null,
      },
      include: {
        sequence: { select: { name: true } },
      },
    });

    // Create engagement event
    const event = await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'email',
        actionType: 'sequence_enrolled',
        contentPreview: `Enrolled in sequence: ${enrollment.sequence.name}`,
        fullContent: `Lead enrolled in drip sequence "${enrollment.sequence.name}" (ID: ${sequenceId}). Next step at: ${nextStepAt.toISOString()}`,
        isAuto: true,
        sentBy: session.id || 'system',
      },
    });

    // Update lead's lastContactedAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        sequenceName: enrollment.sequence.name,
        enrolledAt: enrollment.enrolledAt,
        nextStepAt: enrollment.nextStepAt,
        currentStep: enrollment.currentStep,
      },
      eventId: event.id,
    });
  } catch (error) {
    console.error('Bot drip enrollment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/crm/bot/drip
// Get enrollment status for a lead
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const enrollments = await prisma.emailSequenceEnrollment.findMany({
      where: { leadId },
      include: {
        sequence: { select: { id: true, name: true, trigger: true, steps: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({
      enrollments: enrollments.map(e => ({
        id: e.id,
        sequenceId: e.sequenceId,
        sequenceName: e.sequence.name,
        trigger: e.sequence.trigger,
        enrolledAt: e.enrolledAt,
        currentStep: e.currentStep,
        nextStepAt: e.nextStepAt,
        completedAt: e.completedAt,
        isActive: e.isActive,
        steps: e.sequence.steps,
      })),
    });
  } catch (error) {
    console.error('Bot drip GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}