import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const updatePlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  number: z.number().int().positive().nullable().optional(),
  position: z.string().min(1).optional(),
  gradeLevel: z.string().min(1).optional(),
});

interface RouteParams {
  params: { id: string };
}

// GET - get player with itemsSold count
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const player = await prisma.player.findUnique({
      where: { id: params.id },
      include: {
        orderItems: {
          select: { id: true },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Access check
    if (session.role !== 'ADMIN' && player.teamId !== session.teamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      player: {
        ...player,
        itemsSold: player.orderItems.length,
      },
    });
  } catch (error) {
    console.error('Get player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - update player
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const player = await prisma.player.findUnique({
      where: { id: params.id },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Access check
    if (session.role !== 'ADMIN' && player.teamId !== session.teamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updatePlayerSchema.parse(body);

    const updated = await prisma.player.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ player: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Update player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - remove player (only if no orderItems)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const player = await prisma.player.findUnique({
      where: { id: params.id },
      include: {
        orderItems: { select: { id: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Access check
    if (session.role !== 'ADMIN' && player.teamId !== session.teamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check for existing orders
    if (player.orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete player with existing orders. Please remove all order items first.' },
        { status: 400 }
      );
    }

    await prisma.player.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}