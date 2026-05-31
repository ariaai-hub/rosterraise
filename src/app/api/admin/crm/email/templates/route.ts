import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

const VALID_CATEGORIES = ['FOLLOW_UP', 'INTRODUCTION', 'PROPOSAL', 'CLOSING'];

export async function GET() {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Email templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, body: templateBody, category = 'FOLLOW_UP' } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: templateBody,
        category,
        createdBy: session?.id || null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Email templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
