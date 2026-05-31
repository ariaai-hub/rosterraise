import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/ai/score
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
    }

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { engagementEvents: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build context for scoring
    const context = `Lead: ${lead.firstName || ''} ${lead.lastName || ''}
School: ${lead.schoolName}
State: ${lead.schoolState || 'Unknown'}
Sport: ${lead.sport || 'Unknown'}
Stage: ${lead.stage}
Estimated Students: ${lead.estimatedStudents}
AI Estimated Value: ${lead.aiEstimatedValue || 'N/A'}
Is Hot: ${lead.isHot}
Engagement Events: ${lead.engagementEvents.length}`;

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
            content: 'You are a lead scoring agent. Score this lead 1-100 based on: sport (basketball/football score higher), state, estimated students, engagement history, and stage. Also provide reasoning in aiNotes. Return JSON: { score: number, reason: string }',
          },
          { role: 'user', content: context },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI scoring failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let scored: { score?: number; reason?: string } = {};
    try {
      scored = JSON.parse(content);
    } catch {
      console.error('Failed to parse MiniMax response');
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: scored.score || 50,
        aiNotes: scored.reason || 'Scoring unavailable',
        lastAiAnalysisAt: new Date(),
      },
    });

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'ai',
        actionType: 'scored',
        contentPreview: `AI scored lead: ${scored.score || 'N/A'}/100`,
        fullContent: `AI Score: ${scored.score}/100. Reason: ${scored.reason}`,
        isAuto: true,
        sentBy: 'ai_agent',
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead, score: scored.score, notes: scored.reason });
  } catch (error) {
    console.error('CRM AI score error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}