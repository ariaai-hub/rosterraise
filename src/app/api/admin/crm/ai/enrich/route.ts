import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/ai/enrich
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

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Call MiniMax API for enrichment
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
            content: 'You are a lead enrichment agent. Given a school name and sport, find: email address, phone number, school website URL, athletic department URL. Return JSON with email, phone, schoolUrl, athleticUrl fields. If you cannot find information, use null.',
          },
          {
            role: 'user',
            content: `School: ${lead.schoolName}\nSport: ${lead.sport || 'Not specified'}\nState: ${lead.schoolState || 'Unknown'}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('MiniMax API error:', err);
      return NextResponse.json({ error: 'AI enrichment failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let enriched = {};
    try {
      enriched = JSON.parse(content);
    } catch {
      console.error('Failed to parse MiniMax response');
    }

    const { email, phone, schoolUrl, athleticUrl } = enriched as { email?: string; phone?: string; schoolUrl?: string; athleticUrl?: string };

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(schoolUrl ? { schoolUrl } : {}),
        stage: 2,
        stageChangedAt: new Date(),
      },
      include: { engagementEvents: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'ai',
        actionType: 'enrichment',
        contentPreview: 'AI enrichment completed',
        fullContent: `Enriched with data: ${JSON.stringify(enriched)}`,
        isAuto: true,
        sentBy: 'ai_agent',
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead, enriched });
  } catch (error) {
    console.error('CRM AI enrich error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}