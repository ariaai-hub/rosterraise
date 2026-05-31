import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/ai/analyze-reply
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

    const { leadId, responseText } = await request.json();
    if (!leadId || !responseText) {
      return NextResponse.json({ error: 'leadId and responseText are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

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
            content: 'Classify this lead reply. Categories: INTERESTED (wants to learn more), NOT_INTERESTED (declined), QUESTIONS (has questions), NEED_HUMAN (complex, legal, financial, emotional). Reply: { "classification": "CATEGORY", "summary": "brief summary" }',
          },
          { role: 'user', content: `Lead: ${lead.schoolName}\nReply: ${responseText}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let analyzed: { classification?: string; summary?: string } = {};
    try {
      analyzed = JSON.parse(content);
    } catch {
      console.error('Failed to parse MiniMax response');
    }

    const classification = analyzed.classification || 'NEED_HUMAN';

    // Update lead based on classification
    const updateData: Record<string, unknown> = {};
    if (classification === 'INTERESTED') {
      updateData.isHot = true;
      updateData.stage = Math.min(lead.stage + 1, 10);
      updateData.stageChangedAt = new Date();
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'ai',
        actionType: 'reply_analyzed',
        contentPreview: `Reply classified: ${classification}`,
        fullContent: `Classification: ${classification}. Summary: ${analyzed.summary}`,
        responseText,
        isAuto: true,
        sentBy: 'ai_agent',
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead, classification, summary: analyzed.summary });
  } catch (error) {
    console.error('CRM AI analyze-reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}