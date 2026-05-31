import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/ai/auto-respond
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

    const { leadId, classification, responseText } = await request.json();
    if (!leadId || !classification) {
      return NextResponse.json({ error: 'leadId and classification are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    let autoResponse = '';

    if (classification === 'INTERESTED') {
      autoResponse = `Hi ${lead.firstName || 'there'}, thanks for your interest in RosterRaise! I'd love to schedule a quick 15-minute call to discuss how we can help ${lead.schoolName} raise funds. What time works best for you this week?`;
    } else if (classification === 'QUESTIONS') {
      autoResponse = `Hi ${lead.firstName || 'there'}, thanks for your questions about RosterRaise! I'd be happy to clarify anything. What specific questions do you have? I'm here to help!`;
    } else if (classification === 'NEED_HUMAN') {
      // Flag for escalation - don't auto-respond
      await prisma.lead.update({
        where: { id: leadId },
        data: { isHot: true },
      });
      return NextResponse.json({ success: true, escalated: true, message: 'Flagged for human review' });
    } else {
      // NOT_INTERESTED - simple close
      autoResponse = `Thanks for getting back to us, ${lead.firstName || 'there'}. We completely understand if now isn't the right time. If you change your mind, feel free to reach out. Best of luck with ${lead.schoolName}!`;
    }

    // Generate custom response using MiniMax
    if (lead.email) {
      const aiResponse = await fetch('https://api.minimax.chat/v1/chat completions', {
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
              content: `You are a professional sales assistant. Generate a brief, warm auto-response email. Keep it under 100 words. Original reply from lead: "${responseText || 'N/A'}"`,
            },
            { role: 'user', content: `Generate an auto-response for a ${classification} lead at ${lead.schoolName}` },
          ],
          temperature: 0.5,
        }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) autoResponse = content;
      }
    }

    // Log engagement event
    const event = await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'email',
        actionType: 'auto_response',
        contentPreview: autoResponse.substring(0, 100),
        fullContent: autoResponse,
        responseText,
        isAuto: true,
        sentBy: 'ai_agent',
      },
    });

    return NextResponse.json({ success: true, event, autoResponse });
  } catch (error) {
    console.error('CRM AI auto-respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}