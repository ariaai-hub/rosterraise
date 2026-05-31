import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/seed — creates demo team + players if they don't exist
export async function GET() {
  try {
    const existing = await prisma.team.findUnique({
      where: { slug: 'demo-team' },
    });

    if (existing) {
      return NextResponse.json({ message: 'Demo team already exists', team: existing });
    }

    const team = await prisma.team.create({
      data: {
        name: 'Demo Warriors',
        slug: 'demo-team',
        sport: 'Basketball',
        status: 'APPROVED',
        primaryColor: '#DC2626',
        logoUrl: null,
      },
    });

    const playerNames = [
      { firstName: 'Marcus', lastName: 'Thompson', number: 23, position: 'Guard', gradeLevel: '10th' },
      { firstName: 'Jaylen', lastName: 'Williams', number: 11, position: 'Forward', gradeLevel: '11th' },
      { firstName: 'DeShawn', lastName: 'Johnson', number: 5, position: 'Center', gradeLevel: '12th' },
      { firstName: 'Malik', lastName: 'Brown', number: 3, position: 'Guard', gradeLevel: '9th' },
      { firstName: 'Tyler', lastName: 'Davis', number: 21, position: 'Forward', gradeLevel: '10th' },
      { firstName: 'Chris', lastName: 'Miller', number: 14, position: 'Guard', gradeLevel: '11th' },
      { firstName: 'Andre', lastName: 'Garcia', number: 7, position: 'Center', gradeLevel: '12th' },
      { firstName: 'Brandon', lastName: 'Martinez', number: 9, position: 'Forward', gradeLevel: '10th' },
      { firstName: 'Darius', lastName: 'Robinson', number: 1, position: 'Guard', gradeLevel: '11th' },
      { firstName: 'Ethan', lastName: 'Clark', number: 17, position: 'Forward', gradeLevel: '9th' },
    ];

    const createdPlayers = [];
    for (const p of playerNames) {
      const slug = `${p.firstName.toLowerCase()}-${p.lastName.toLowerCase()}`;
      const player = await prisma.player.create({
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          number: p.number,
          position: p.position,
          gradeLevel: p.gradeLevel,
          teamId: team.id,
          slug,
        },
      });
      createdPlayers.push(player);
    }

    return NextResponse.json({
      message: 'Demo team and players created',
      team,
      playersCreated: createdPlayers.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error('Seed error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
