import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const createPlayerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  number: z.number().int().positive().optional(),
  position: z.string().min(1),
  gradeLevel: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const players = await prisma.player.findMany({
      where: { teamId: params.teamId },
      orderBy: [{ number: 'asc' }, { lastName: 'asc' }],
    });
    return NextResponse.json({ players });
  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createPlayerSchema.parse(body);

    const player = await prisma.player.create({
      data: {
        ...validated,
        teamId: params.teamId,
      },
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Player with this slug already exists in team' }, { status: 409 });
    }
    console.error('Create player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
