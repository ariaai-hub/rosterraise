import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendSms, formatPhoneForTwilio, isTwilioConfigured, validatePhone } from '@/lib/twilio';
import { getResend } from '@/lib/email';

function isAdminOrSalesRep(session: { role?: string } | null) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// Merge template variables into body
function mergeTemplate(body: string, lead: any): string {
  return body
    .replace(/\{\{firstName\}\}/g, lead.firstName || '')
    .replace(/\{\{lastName\}\}/g, lead.lastName || '')
    .replace(/\{\{schoolName\}\}/g, lead.schoolName || '')
    .replace(/\{\{sport\}\}/g, lead.sport || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{phone\}\}/g, lead.phone || '')
    .replace(/\{\{sourceGroupName\}\}/g, lead.sourceGroupName || '');
}

// Generate AI response via MiniMax
async function generateAIResponse(lead: any, context: string, MINIMAX_API_KEY: string): Promise<string | null> {
  if (!MINIMAX_API_KEY) return null;

  try {
    const prompt = `Lead: ${lead.firstName || ''} ${lead.lastName || ''}
School: ${lead.schoolName}
Sport: ${lead.sport || 'Unknown'}
State: ${lead.schoolState || 'Unknown'}
Email: ${lead.email || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Context: ${context}`;

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
            content: 'You are a professional sales bot. Generate a concise, warm auto-response under 80 words. Personalize based on the lead info. Return ONLY the response text, no JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('MiniMax AI response generation failed:', error);
    return null;
  }
}

// Send email via Resend
async function sendEmail(to: string, subject: string, htmlBody: string): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: 'Resend not configured' };
  }

  try {
    await resend.emails.send({
      from: 'RosterRaise <noreply@rosterraise.com>',
      to,
      subject,
      html: htmlBody,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error?.message || 'Email failed' };
  }
}

// POST /api/admin/crm/bot/auto-respond
// Handles incoming lead reply or stage change
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, triggerEvent, responseText } = body;

    if (!leadId || !triggerEvent) {
      return NextResponse.json({ error: 'leadId and triggerEvent are required' }, { status: 400 });
    }

    // Get bot config
    const config = await prisma.botConfig.findFirst({ take: 1 });
    
    if (!config?.isActive) {
      return NextResponse.json({ triggered: false, reason: 'Bot is inactive' });
    }

    if (!config?.autoRespondEnabled) {
      return NextResponse.json({ triggered: false, reason: 'Auto-respond is disabled' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Apply response delay if configured
    if (config.responseDelayMinutes > 0) {
      console.log(`Response delay configured: ${config.responseDelayMinutes} minutes`);
    }

    // Find matching templates for this trigger event
    const templates = await prisma.botTemplate.findMany({
      where: { triggerEvent: triggerEvent as any, isActive: true },
      orderBy: { priority: 'desc' },
    });

    if (templates.length === 0) {
      return NextResponse.json({ triggered: false, reason: 'No active template for this trigger event' });
    }

    // Use highest priority template
    const template = templates[0];
    let content = template.body;
    let channel = template.channel;

    // If REPLY_RECEIVED and AI is enabled, use MiniMax to generate personalized response
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
    if (triggerEvent === 'REPLY_RECEIVED' && config.aiScoringEnabled && MINIMAX_API_KEY) {
      const aiContent = await generateAIResponse(lead, `Reply received: ${responseText || 'No text'}`, MINIMAX_API_KEY);
      if (aiContent) {
        content = aiContent;
      }
    } else {
      // Merge template variables
      content = mergeTemplate(content, lead);
    }

    const subject = template.subject ? mergeTemplate(template.subject, lead) : null;
    let sent = false;

    // Send via appropriate channel
    if (channel === 'EMAIL') {
      if (lead.email) {
        const result = await sendEmail(lead.email, subject || 'RosterRaise', `<p>${content.replace(/\n/g, '<br>')}</p>`);
        if (result.success) sent = true;
      }
    } else if (channel === 'SMS') {
      if (lead.phone && validatePhone(lead.phone) && isTwilioConfigured()) {
        const formattedPhone = formatPhoneForTwilio(lead.phone);
        const result = await sendSms(formattedPhone, content);
        if (result.success) sent = true;
      }
    }

    // Create engagement event
    const event = await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: channel.toLowerCase(),
        actionType: 'auto_response',
        contentPreview: content.substring(0, 100),
        fullContent: content,
        responseText,
        isAuto: true,
        sentBy: 'bot',
      },
    });

    // Update lead lastContactedAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    });

    // If lead replied and is marked hot, alert sales rep (in-app notification via engagement event)
    if (triggerEvent === 'REPLY_RECEIVED' && lead.isHot) {
      await prisma.engagementEvent.create({
        data: {
          leadId,
          channel: 'notification',
          actionType: 'escalation_alert',
          contentPreview: `Hot lead ${lead.firstName || ''} ${lead.lastName || ''} replied - requires attention`,
          isAuto: true,
          sentBy: 'bot',
        },
      });
    }

    return NextResponse.json({
      triggered: true,
      sent,
      channel,
      templateUsed: template.name,
      eventId: event.id,
    });
  } catch (error) {
    console.error('Bot auto-respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}