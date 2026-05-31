import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - all orders for coach's team
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'COACH' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const teamId = session.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found for user' }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: { teamId },
      include: {
        team: { select: { name: true, slug: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
            player: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get coach orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}