import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// GET /api/admin/crm/ai/scaling-signals
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Gather data for analysis
    const [events, leads] = await Promise.all([
      prisma.engagementEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: { lead: { select: { sport: true, stage: true, schoolState: true } } },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { sport: true, stage: true, schoolState: true, isHot: true },
      }),
    ]);

    // Calculate stats
    const byChannel: Record<string, { sent: number; replied: number }> = {};
    const bySport: Record<string, { sent: number; replied: number }> = {};
    const byState: Record<string, { sent: number; replied: number; leads: number }> = {};

    for (const ev of events) {
      const ch = ev.channel;
      if (!byChannel[ch]) byChannel[ch] = { sent: 0, replied: 0 };
      byChannel[ch].sent++;
      if (ev.responseText) byChannel[ch].replied++;

      const sport = ev.lead?.sport;
      if (sport) {
        if (!bySport[sport]) bySport[sport] = { sent: 0, replied: 0 };
        bySport[sport].sent++;
        if (ev.responseText) bySport[sport].replied++;
      }

      const state = ev.lead?.schoolState;
      if (state) {
        if (!byState[state]) byState[state] = { sent: 0, replied: 0, leads: 0 };
        byState[state].sent++;
        if (ev.responseText) byState[state].replied++;
      }
    }

    for (const lead of leads) {
      const state = lead.schoolState;
      if (state && !byState[state]) byState[state] = { sent: 0, replied: 0, leads: 0 };
      if (state) byState[state].leads++;
    }

    // Find best performing channel
    let bestChannel = { channel: '', rate: 0 };
    for (const [ch, stats] of Object.entries(byChannel)) {
      const rate = stats.sent > 0 ? stats.replied / stats.sent : 0;
      if (rate > bestChannel.rate) bestChannel = { channel: ch, rate };
    }

    // Find best performing sport
    let bestSport = { sport: '', rate: 0 };
    for (const [sport, stats] of Object.entries(bySport)) {
      const rate = stats.sent > 0 ? stats.replied / stats.sent : 0;
      if (rate > bestSport.rate) bestSport = { sport, rate };
    }

    // Find top states
    const topStates = Object.entries(byState)
      .map(([state, stats]) => ({ state, rate: stats.sent > 0 ? stats.replied / stats.sent : 0, leads: stats.leads }))
      .filter(s => s.leads >= 5)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Get AI insights
    const context = `
Analytics from last 30 days:
Total Events: ${events.length}
Total Leads: ${leads.length}

Channel Performance:
${Object.entries(byChannel).map(([ch, s]) => `${ch}: ${s.sent} sent, ${s.replied} replied, ${s.sent > 0 ? Math.round((s.replied/s.sent)*100) : 0}% reply rate`).join('\n')}

Sport Performance:
${Object.entries(bySport).map(([sp, s]) => `${sp}: ${s.sent} sent, ${s.replied} replied, ${s.sent > 0 ? Math.round((s.replied/s.sent)*100) : 0}% reply rate`).join('\n')}

Top States by Reply Rate:
${topStates.map(s => `${s.state}: ${s.rate}% (${s.leads} leads)`).join('\n')}
`;

    const response = await fetch('https://api.minimax.chat/v1/chat completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          {
            role: 'system',
            content: 'You are a sales scaling analyst. Based on the data, provide 3-5 specific, actionable suggestions for scaling outreach. Consider: which channels work best, which sports/states have highest conversion, timing recommendations, and any patterns you see. Return JSON: { suggestions: [{ title: string, reasoning: string, impact: "high/medium/low" }] }',
          },
          { role: 'user', content: context },
        ],
        temperature: 0.5,
      }),
    });

    let suggestions: { title: string; reasoning: string; impact: string }[] = [];
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      try {
        const parsed = JSON.parse(content);
        suggestions = parsed.suggestions || [];
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      bestChannel: bestChannel.channel || null,
      bestSport: bestSport.sport || null,
      topStates,
      suggestions,
    });
  } catch (error) {
    console.error('CRM AI scaling signals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}