import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to detect if a string is a UUID
function isUUID(str: string): boolean {
  return str.includes('-') && str.length === 36;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
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

    // Get all players with their total items sold (sum of quantities from PAID orders)
    const playersData = await prisma.player.findMany({
      where: { teamId: team.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        number: true,
        position: true,
        gradeLevel: true,
        slug: true,
        orderItems: {
          where: {
            order: {
              status: 'PAID',
            },
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    // Sort by items sold (sum of quantities) descending and take top 50
    const sortedPlayers = playersData
      .map((player) => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number,
        position: player.position,
        gradeLevel: player.gradeLevel,
        slug: player.slug,
        itemsSold: player.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      }))
      .filter(p => p.itemsSold > 0)
      .sort((a, b) => b.itemsSold - a.itemsSold)
      .slice(0, 50);

    // Add rank to each player
    const rankedPlayers = sortedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    // Calculate totals
    const totalItemsSold = rankedPlayers.reduce((sum, p) => sum + p.itemsSold, 0);
    const topPlayer = rankedPlayers.length > 0 ? rankedPlayers[0] : null;

    return NextResponse.json({
      players: rankedPlayers,
      totalItemsSold,
      topPlayer,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
