import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/dashboard/trends
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Leads per day
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });
    const leadsPerDay: Record<string, number> = {};
    for (const lead of leads) {
      const key = lead.createdAt.toISOString().split('T')[0];
      leadsPerDay[key] = (leadsPerDay[key] || 0) + 1;
    }

    // Touches per day
    const events = await prisma.engagementEvent.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });
    const touchesPerDay: Record<string, number> = {};
    for (const ev of events) {
      const key = ev.createdAt.toISOString().split('T')[0];
      touchesPerDay[key] = (touchesPerDay[key] || 0) + 1;
    }

    // Won per week
    const wonLeads = await prisma.lead.findMany({
      where: { stage: 10, wonAt: { gte: startDate } },
      select: { wonAt: true },
    });
    const wonPerWeek: Record<string, number> = {};
    for (const lead of wonLeads) {
      if (!lead.wonAt) continue;
      const weekStart = getWeekStart(lead.wonAt);
      wonPerWeek[weekStart] = (wonPerWeek[weekStart] || 0) + 1;
    }

    return NextResponse.json({
      leadsPerDay: Object.entries(leadsPerDay).map(([date, count]) => ({ date, count })),
      touchesPerDay: Object.entries(touchesPerDay).map(([date, count]) => ({ date, count })),
      wonPerWeek: Object.entries(wonPerWeek).map(([week, count]) => ({ week, count })),
    });
  } catch (error) {
    console.error('CRM trends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}