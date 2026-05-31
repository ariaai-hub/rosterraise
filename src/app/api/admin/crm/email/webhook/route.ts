import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const WEBHOOK_API_KEY = process.env.EMAIL_WEBHOOK_API_KEY || process.env.RESEND_WEBHOOK_API_KEY;

function verifyWebhookAuth(request: NextRequest): boolean {
  if (!WEBHOOK_API_KEY) return true;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  return authHeader === `Bearer ${WEBHOOK_API_KEY}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyWebhookAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const emailId = data.id;
    if (!emailId) {
      return NextResponse.json({ error: 'Missing email ID' }, { status: 400 });
    }

    switch (type) {
      case 'email.delivered':
        await handleDelivered(emailId, data);
        break;
      case 'email.opened':
        await handleOpened(emailId, data);
        break;
      case 'email.clicked':
        await handleClicked(emailId, data);
        break;
      case 'email.bounced':
        await handleBounced(emailId, data);
        break;
      case 'email.complained':
        await handleComplained(emailId, data);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDelivered(emailId: string, data: Record<string, unknown>) {
  const event = await prisma.engagementEvent.findFirst({
    where: { emailMessageId: emailId },
    orderBy: { createdAt: 'desc' },
  });

  if (event) {
    console.log(`Email delivered: ${emailId}`);
  }
}

async function handleOpened(emailId: string, data: Record<string, unknown>) {
  const event = await prisma.engagementEvent.findFirst({
    where: { emailMessageId: emailId },
    orderBy: { createdAt: 'desc' },
  });

  if (event) {
    await prisma.engagementEvent.update({
      where: { id: event.id },
      data: { openedAt: new Date() },
    });

    await prisma.lead.update({
      where: { id: event.leadId },
      data: { emailOpened: { increment: 1 } },
    });

    await prisma.engagementEvent.create({
      data: {
        leadId: event.leadId,
        channel: 'EMAIL',
        actionType: 'EMAIL_OPENED',
        emailMessageId: emailId,
        contentPreview: 'Email opened',
        isAuto: true,
        responseText: null,
      },
    });

    console.log(`Email opened tracked: ${emailId}`);
  }
}

async function handleClicked(emailId: string, data: Record<string, unknown>) {
  const event = await prisma.engagementEvent.findFirst({
    where: { emailMessageId: emailId },
    orderBy: { createdAt: 'desc' },
  });

  if (event) {
    await prisma.lead.update({
      where: { id: event.leadId },
      data: { emailClicked: { increment: 1 } },
    });

    await prisma.engagementEvent.create({
      data: {
        leadId: event.leadId,
        channel: 'EMAIL',
        actionType: 'EMAIL_CLICKED',
        emailMessageId: emailId,
        contentPreview: 'Link clicked',
        isAuto: true,
        responseText: null,
      },
    });

    console.log(`Email click tracked: ${emailId}`);
  }
}

async function handleBounced(emailId: string, data: Record<string, unknown>) {
  const event = await prisma.engagementEvent.findFirst({
    where: { emailMessageId: emailId },
    orderBy: { createdAt: 'desc' },
  });

  if (event) {
    const bounceReason = typeof data.bounce === 'object' && data.bounce !== null
      ? (data.bounce as Record<string, unknown>).bounceType as string || 'unknown'
      : 'unknown';

    await prisma.engagementEvent.create({
      data: {
        leadId: event.leadId,
        channel: 'EMAIL',
        actionType: 'EMAIL_BOUNCED',
        emailMessageId: emailId,
        contentPreview: `Bounced: ${bounceReason}`,
        isAuto: true,
        responseText: bounceReason,
      },
    });

    console.log(`Email bounced: ${emailId}, reason: ${bounceReason}`);
  }
}

async function handleComplained(emailId: string, data: Record<string, unknown>) {
  const event = await prisma.engagementEvent.findFirst({
    where: { emailMessageId: emailId },
    orderBy: { createdAt: 'desc' },
  });

  if (event) {
    await prisma.engagementEvent.create({
      data: {
        leadId: event.leadId,
        channel: 'EMAIL',
        actionType: 'EMAIL_SPAM',
        emailMessageId: emailId,
        contentPreview: 'Marked as spam',
        isAuto: true,
        responseText: 'spam_complaint',
      },
    });

    console.log(`Email spam complaint: ${emailId}`);
  }
}
