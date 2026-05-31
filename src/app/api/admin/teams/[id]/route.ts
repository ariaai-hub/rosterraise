import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendTeamApprovedEmail, sendTeamRejectedEmail } from '@/lib/email';

// GET - single team detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
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
        players: {
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { players: true, orders: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Admin get team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - admin approves or rejects team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        users: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Team has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Generate unique slug from team name
      const baseSlug = team.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let counter = 1;

      // Check for existing slug and append number if needed
      while (await prisma.team.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const updatedTeam = await prisma.team.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          slug,
        },
      });

      // Send email to all coaches on the team
      const coachUsers = team.users.filter((u) => u.role === 'COACH');
      for (const coach of coachUsers) {
        await sendTeamApprovedEmail(coach.email, slug, team.name);
      }

      return NextResponse.json({
        message: 'Team approved',
        team: updatedTeam,
      });
    } else {
      // Reject
      const updatedTeam = await prisma.team.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
        },
      });

      // Send email to all coaches on the team
      const coachUsers = team.users.filter((u) => u.role === 'COACH');
      for (const coach of coachUsers) {
        await sendTeamRejectedEmail(coach.email, team.name);
      }

      return NextResponse.json({
        message: 'Team rejected',
        team: updatedTeam,
      });
    }
  } catch (error) {
    console.error('Admin update team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
