import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendEmail, interpolateTemplate, getLeadVariables, isResendConfigured } from '@/lib/resend';

function isAdminOrSalesRep(session: { role?: string } | null) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResendConfigured()) {
      return NextResponse.json({ error: 'Email service not configured. Set RESEND_API_KEY.' }, { status: 503 });
    }

    const body = await request.json();
    const { leadId, subject, body: emailBody } = body;

    if (!leadId || !subject || !emailBody) {
      return NextResponse.json({ error: 'leadId, subject, and body are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, email: true, firstName: true, lastName: true, schoolName: true, sport: true, sourceGroupName: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 });
    }

    const variables = getLeadVariables(lead);
    const interpolatedSubject = interpolateTemplate(subject, variables);
    const interpolatedBody = interpolateTemplate(emailBody, variables);

    const result = await sendEmail({
      to: lead.email,
      subject: interpolatedSubject,
      body: interpolatedBody,
      leadId: lead.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'EMAIL',
        actionType: 'EMAIL_SENT',
        emailMessageId: result.messageId,
        contentPreview: interpolatedSubject,
        fullContent: interpolatedBody,
        isAuto: false,
        sentBy: session?.id || 'admin',
        responseText: null,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        emailSent: { increment: 1 },
        lastContactedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
