import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

// GET /api/admin/crm/bot/templates
export async function GET() {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.botTemplate.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Bot templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/crm/bot/templates
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, triggerEvent, channel, subject, body: templateBody, isActive, priority } = body;

    if (!name || !triggerEvent || !templateBody) {
      return NextResponse.json({ error: 'name, triggerEvent, and body are required' }, { status: 400 });
    }

    const validTriggerEvents = ['LEAD_CREATED', 'STAGE_CHANGED', 'REPLY_RECEIVED', 'PROPOSAL_SENT'];
    if (!validTriggerEvents.includes(triggerEvent)) {
      return NextResponse.json({ error: 'Invalid triggerEvent' }, { status: 400 });
    }

    const channelValue = channel || 'EMAIL';
    const validChannels = ['EMAIL', 'SMS'];
    if (!validChannels.includes(channelValue)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    const template = await prisma.botTemplate.create({
      data: {
        name,
        triggerEvent: triggerEvent as any,
        channel: channelValue as any,
        subject: subject || null,
        body: templateBody,
        isActive: isActive ?? true,
        priority: priority ?? 0,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Bot templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/crm/bot/templates (update)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, triggerEvent, channel, subject, body: templateBody, isActive, priority } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.botTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updated = await prisma.botTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(triggerEvent !== undefined && { triggerEvent: triggerEvent as any }),
        ...(channel !== undefined && { channel: channel as any }),
        ...(subject !== undefined && { subject }),
        ...(templateBody !== undefined && { body: templateBody }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Bot templates PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/crm/bot/templates
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.botTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bot templates DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}