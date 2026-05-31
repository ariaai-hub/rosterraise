import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/events
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const channel = searchParams.get('channel');
    const actionType = searchParams.get('actionType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: Record<string, unknown> = {};
    if (leadId) where.leadId = leadId;
    if (channel) where.channel = channel;
    if (actionType) where.actionType = actionType;

    const [events, total] = await Promise.all([
      prisma.engagementEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, firstName: true, lastName: true, schoolName: true, stage: true } } },
      }),
      prisma.engagementEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('CRM events list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/crm/events
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, channel, actionType, contentPreview, fullContent, isAuto, sentBy, responseText } = await request.json();

    if (!leadId || !channel || !actionType) {
      return NextResponse.json({ error: 'leadId, channel, and actionType are required' }, { status: 400 });
    }

    const event = await prisma.engagementEvent.create({
      data: {
        leadId,
        channel,
        actionType,
        contentPreview,
        fullContent,
        isAuto: isAuto ?? false,
        sentBy: sentBy ?? (session.id || 'admin'),
        responseText,
      },
      include: { lead: { select: { id: true, schoolName: true, stage: true } } },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('CRM event create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}