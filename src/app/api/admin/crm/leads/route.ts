import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/leads - List leads with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const sport = searchParams.get('sport');
    const state = searchParams.get('state');
    const hot = searchParams.get('hot');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const where: Record<string, unknown> = {};
    if (stage) where.stage = parseInt(stage, 10);
    if (sport) where.sport = sport;
    if (state) where.schoolState = state;
    if (hot === 'true') where.isHot = true;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { schoolName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: { assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('CRM leads list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/crm/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { schoolName, estimatedStudents = 200, ...rest } = body;

    if (!schoolName) {
      return NextResponse.json({ error: 'schoolName is required' }, { status: 400 });
    }

    const aiEstimatedValue = estimatedStudents * 10 * 0.70;

    const lead = await prisma.lead.create({
      data: {
        ...rest,
        schoolName,
        estimatedStudents,
        aiEstimatedValue,
        stage: 1,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('CRM lead create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}