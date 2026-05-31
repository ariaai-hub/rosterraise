import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, interpolateTemplate, getLeadVariables, isResendConfigured } from '@/lib/resend';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ processed: 0, errors: ['Email service not configured'] }, { status: 503 });
  }

  try {
    const now = new Date();

    const dueEnrollments = await prisma.emailSequenceEnrollment.findMany({
      where: {
        isActive: true,
        nextStepAt: { lte: now },
      },
      take: 50,
      include: {
        sequence: true,
        lead: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            schoolName: true,
            sport: true,
            sourceGroupName: true,
          },
        },
      },
    });

    const results: { enrollmentId: string; leadId: string; step: number; success: boolean; error?: string }[] = [];

    for (const enrollment of dueEnrollments) {
      try {
        const steps = JSON.parse(enrollment.sequence.steps as string) as Array<{
          delayDays: number;
          subject: string;
          body: string;
        }>;

        const stepIndex = enrollment.currentStep;
        if (stepIndex >= steps.length) {
          await prisma.emailSequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { isActive: false, completedAt: new Date() },
          });
          continue;
        }

        const step = steps[stepIndex];

        if (!enrollment.lead.email) {
          results.push({
            enrollmentId: enrollment.id,
            leadId: enrollment.leadId,
            step: stepIndex,
            success: false,
            error: 'No email address',
          });
          continue;
        }

        const variables = getLeadVariables(enrollment.lead);
        const subject = interpolateTemplate(step.subject, variables);
        const body = interpolateTemplate(step.body, variables);

        const emailResult = await sendEmail({
          to: enrollment.lead.email,
          subject,
          body,
          leadId: enrollment.lead.id,
        });

        if (!emailResult.success) {
          results.push({
            enrollmentId: enrollment.id,
            leadId: enrollment.leadId,
            step: stepIndex,
            success: false,
            error: emailResult.error,
          });
          continue;
        }

        await prisma.engagementEvent.create({
          data: {
            leadId: enrollment.leadId,
            channel: 'EMAIL',
            actionType: 'EMAIL_SENT',
            emailMessageId: emailResult.messageId,
            contentPreview: subject,
            fullContent: body,
            isAuto: true,
            sentBy: null,
            responseText: null,
          },
        });

        await prisma.lead.update({
          where: { id: enrollment.leadId },
          data: {
            emailSent: { increment: 1 },
            lastContactedAt: new Date(),
          },
        });

        const nextStepIndex = stepIndex + 1;
        let nextStepAt: Date | null = null;

        if (nextStepIndex < steps.length) {
          const nextStep = steps[nextStepIndex];
          nextStepAt = new Date();
          nextStepAt.setDate(nextStepAt.getDate() + (nextStep.delayDays || 0));
        }

        await prisma.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepIndex,
            nextStepAt,
            completedAt: nextStepIndex >= steps.length ? new Date() : null,
            isActive: nextStepIndex < steps.length,
          },
        });

        results.push({
          enrollmentId: enrollment.id,
          leadId: enrollment.leadId,
          step: stepIndex,
          success: true,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          enrollmentId: enrollment.id,
          leadId: enrollment.leadId,
          step: enrollment.currentStep,
          success: false,
          error,
        });
      }
    }

    const processed = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).map(r => ({
      enrollmentId: r.enrollmentId,
      leadId: r.leadId,
      error: r.error,
    }));

    return NextResponse.json({
      processed,
      total: dueEnrollments.length,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email sequence processor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
