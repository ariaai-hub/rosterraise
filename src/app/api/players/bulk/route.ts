import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  number: z.number().int().positive().optional(),
  position: z.string().min(1),
  gradeLevel: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

const bulkPlayersSchema = z.object({
  players: z.array(playerSchema),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = bulkPlayersSchema.parse(body);

    const results = {
      created: [] as string[],
      failed: [] as { slug: string; error: string }[],
    };

    for (const player of validated.players) {
      try {
        await prisma.player.create({
          data: {
            ...player,
            teamId: session.teamId!,
          },
        });
        results.created.push(player.slug);
      } catch (error) {
        results.failed.push({
          slug: player.slug,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Bulk create players error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
