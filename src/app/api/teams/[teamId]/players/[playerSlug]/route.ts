import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to detect if a string is a UUID
function isUUID(str: string): boolean {
  return str.includes('-') && str.length === 36;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string; playerSlug: string } }
) {
  try {
    const teamId = params.teamId;
    
    // First find the team - by UUID or slug
    let team;
    if (isUUID(teamId)) {
      team = await prisma.team.findUnique({
        where: { id: teamId, status: 'APPROVED' },
      });
    } else {
      team = await prisma.team.findUnique({
        where: { slug: teamId, status: 'APPROVED' },
      });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const player = await prisma.player.findFirst({
      where: {
        teamId: team.id,
        slug: params.playerSlug,
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get items sold for this player
    const itemsSold = await prisma.orderItem.count({
      where: { playerId: player.id },
    });

    return NextResponse.json({
      player: {
        ...player,
        itemsSold,
      },
      team,
    });
  } catch (error) {
    console.error('Get player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
