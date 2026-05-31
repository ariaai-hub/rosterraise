import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - admin lists all teams (with optional status filter)
// Pagination: limit 20, offset query param
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Auth check
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where = status ? { status: status as 'PENDING' | 'APPROVED' } : {};

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          _count: {
            select: { players: true, orders: true },
          },
        },
      }),
      prisma.team.count({ where }),
    ]);

    return NextResponse.json({
      teams,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + teams.length < total,
      },
    });
  } catch (error) {
    console.error('Admin get teams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
