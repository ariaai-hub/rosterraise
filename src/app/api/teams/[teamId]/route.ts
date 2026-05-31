import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendTeamApprovedEmail } from '@/lib/email';

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  sport: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['PENDING', 'APPROVED']).optional(),
});

interface RouteParams {
  params: { teamId: string };
}

// Helper to detect if a string is a UUID
function isUUID(str: string): boolean {
  return str.includes('-') && str.length === 36;
}

// GET - team by ID or slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const teamId = params.teamId;
    
    let team;
    if (isUUID(teamId)) {
      team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          players: {
            orderBy: [{ number: 'asc' }, { lastName: 'asc' }],
          },
        },
      });
    } else {
      team = await prisma.team.findUnique({
        where: { slug: teamId, status: 'APPROVED' },
        include: {
          players: {
            orderBy: [{ number: 'asc' }, { lastName: 'asc' }],
          },
        },
      });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - update team (coach of team or admin)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.teamId;
    
    let team;
    if (isUUID(teamId)) {
      team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { users: true },
      });
    } else {
      team = await prisma.team.findUnique({
        where: { slug: teamId },
        include: { users: true },
      });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check access: admin can update any team, coach can only update their own
    if (session.role !== 'ADMIN' && session.teamId !== team.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Non-admin trying to change status? Only admin can approve teams
    const body = await request.json();
    if (body.status && session.role !== 'ADMIN') {
      delete body.status;
    }

    const validated = updateTeamSchema.parse(body);

    const wasPending = team.status === 'PENDING';
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: validated,
    });

    // Send email if team was just approved
    if (validated.status === 'APPROVED' && wasPending) {
      for (const user of team.users) {
        if (user.emailVerified) {
          await sendTeamApprovedEmail(user.email, team.slug, team.name);
        }
      }
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Team slug already exists' }, { status: 409 });
    }
    console.error('Update team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - partial update team
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.teamId;
    
    let team;
    if (isUUID(teamId)) {
      team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { users: true },
      });
    } else {
      team = await prisma.team.findUnique({
        where: { slug: teamId },
        include: { users: true },
      });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateTeamSchema.parse(body);

    const wasPending = team.status === 'PENDING';
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: validated,
    });

    // Send email if team was just approved
    if (validated.status === 'APPROVED' && wasPending) {
      for (const user of team.users) {
        if (user.emailVerified) {
          await sendTeamApprovedEmail(user.email, team.slug, team.name);
        }
      }
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Update team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
