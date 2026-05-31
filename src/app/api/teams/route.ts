import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const createTeamSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  sport: z.string().min(1),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET - admin lists all teams, coach/parent see approved teams
export async function GET() {
  try {
    const session = await getSession();

    // Admin sees all teams including pending
    if (session?.role === 'ADMIN') {
      const teams = await prisma.team.findMany({
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { users: true, players: true } } },
      });
      return NextResponse.json({ teams });
    }

    // Others only see approved teams
    const teams = await prisma.team.findMany({
      where: { status: 'APPROVED' },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - coach applies to create a team
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coaches can create teams
    if (session.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can create teams' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createTeamSchema.parse(body);

    // Check if user already has a team
    if (session.teamId) {
      return NextResponse.json({ error: 'You already belong to a team' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingSlug = await prisma.team.findUnique({ where: { slug: validated.slug } });
    if (existingSlug) {
      return NextResponse.json({ error: 'Team slug already exists' }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: validated,
    });

    // Link current user to the new team
    await prisma.user.update({
      where: { id: session.id },
      data: { teamId: team.id },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
