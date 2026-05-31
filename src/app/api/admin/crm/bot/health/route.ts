import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/bot/health
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [sentToday, sentLast7Days, repliedLast7Days] = await Promise.all([
      prisma.engagementEvent.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.engagementEvent.count({ where: { createdAt: { gte: sevenDaysAgo }, channel: { in: ['email', 'fb_dm', 'fb_comment'] } } }),
      prisma.engagementEvent.count({ where: { createdAt: { gte: sevenDaysAgo }, responseText: { not: null } } }),
    ]);

    const successRate = sentLast7Days > 0 ? Math.round((repliedLast7Days / sentLast7Days) * 10000) / 100 : 0;

    // Last error: find most recent failed event (placeholder - real impl would track errors)
    const lastError = null;

    return NextResponse.json({
      sentToday,
      sentLast7Days,
      repliedLast7Days,
      successRate,
      lastError,
    });
  } catch (error) {
    console.error('CRM bot health error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}