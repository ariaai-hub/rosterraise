import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/bot/queue
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Touch 1: stage=1 AND !fbCommentSent
    const touch1 = await prisma.lead.count({ where: { stage: 1, fbCommentSent: false } });

    // Touch 2: stage=2 AND !fbDmSent
    const touch2 = await prisma.lead.count({ where: { stage: 2, fbDmSent: false } });

    // Touch 3: stage=3 AND emailSent==0
    const touch3 = await prisma.lead.count({ where: { stage: 3, emailSent: 0 } });

    // Day7: stage=4 AND days since last touch >= 7
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const day7Leads = await prisma.lead.findMany({
      where: { stage: 4 },
      select: { lastContactedAt: true },
    });
    const day7 = day7Leads.filter(l => !l.lastContactedAt || l.lastContactedAt <= sevenDaysAgo).length;

    // Day10: stage=5 AND days since last touch >= 10
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const day10Leads = await prisma.lead.findMany({
      where: { stage: 5 },
      select: { lastContactedAt: true },
    });
    const day10 = day10Leads.filter(l => !l.lastContactedAt || l.lastContactedAt <= tenDaysAgo).length;

    return NextResponse.json({
      touch1, touch2, touch3, day7, day10,
      total: touch1 + touch2 + touch3 + day7 + day10,
    });
  } catch (error) {
    console.error('CRM bot queue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}