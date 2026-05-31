import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/team
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { role: { in: ['SALES_REP', 'CS', 'ADMIN'] } },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        commissionRate: true, isActive: true, createdAt: true,
        _count: { select: { assignedLeads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get won counts and revenue per rep
    const enriched = await Promise.all(users.map(async (u) => {
      const won = await prisma.lead.count({ where: { assignedTo: u.id, stage: 10 } });
      const revenue = await prisma.lead.aggregate({
        where: { assignedTo: u.id, stage: 10 },
        _sum: { contractValue: true },
      });
      return { ...u, assignedLeadsCount: u._count.assignedLeads, won, revenue: revenue._sum.contractValue || 0 };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('CRM team list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/crm/team
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, firstName, lastName, role, password, commissionRate } = await request.json();

    if (!email || !firstName || !lastName || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email, firstName, lastName, role, passwordHash,
        commissionRate: commissionRate || 0,
        emailVerified: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, commissionRate: true, isActive: true, emailVerified: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('CRM team create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}