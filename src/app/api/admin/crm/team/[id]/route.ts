import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// PATCH /api/admin/crm/team/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = ['firstName', 'lastName', 'role', 'commissionRate', 'isActive'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, commissionRate: true, isActive: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('CRM team patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/crm/team/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CRM team delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}