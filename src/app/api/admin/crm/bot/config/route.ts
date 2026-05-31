import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

// GET /api/admin/crm/bot/config
export async function GET() {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let config = await prisma.botConfig.findFirst({ take: 1 });
    
    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          isActive: true,
          autoRespondEnabled: true,
          aiScoringEnabled: true,
          responseDelayMinutes: 5,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Bot config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/crm/bot/config
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isActive, autoRespondEnabled, aiScoringEnabled, responseDelayMinutes } = body;

    let config = await prisma.botConfig.findFirst({ take: 1 });

    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          isActive: isActive ?? true,
          autoRespondEnabled: autoRespondEnabled ?? true,
          aiScoringEnabled: aiScoringEnabled ?? true,
          responseDelayMinutes: responseDelayMinutes ?? 5,
        },
      });
    } else {
      config = await prisma.botConfig.update({
        where: { id: config.id },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(autoRespondEnabled !== undefined && { autoRespondEnabled }),
          ...(aiScoringEnabled !== undefined && { aiScoringEnabled }),
          ...(responseDelayMinutes !== undefined && { responseDelayMinutes }),
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Bot config PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}