import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdmin(session: { role?: string } | null) {
  return session?.role === 'ADMIN';
}

// Score a single lead using MiniMax
async function scoreLead(lead: any, MINIMAX_API_KEY: string): Promise<{ score: number; signals: any; summary: string }> {
  const signals: any = {
    hasEmail: !!lead.email,
    hasPhone: !!lead.phone,
    hasSport: !!lead.sport,
    schoolNameComplete: lead.schoolName?.length > 5,
    estimatedStudents: lead.estimatedStudents || 200,
    engagementCount: 0,
    stage: lead.stage,
    isHot: lead.isHot,
  };

  if (!MINIMAX_API_KEY) {
    // Fallback scoring without AI
    let score = 30; // base score
    
    if (lead.email) score += 15;
    if (lead.phone) score += 10;
    if (lead.sport) score += 15;
    if (lead.schoolName?.length > 5) score += 10;
    if (lead.estimatedStudents > 300) score += 10;
    if (lead.isHot) score += 10;
    
    return {
      score: Math.min(score, 100),
      signals,
      summary: `Fallback scoring: email=${!!lead.email}, phone=${!!lead.phone}, sport=${!!lead.sport}`,
    };
  }

  try {
    const context = `Lead: ${lead.firstName || ''} ${lead.lastName || ''}
School: ${lead.schoolName}
State: ${lead.schoolState || 'Unknown'}
Sport: ${lead.sport || 'Unknown'}
Stage: ${lead.stage}
Estimated Students: ${lead.estimatedStudents}
Has Email: ${!!lead.email}
Has Phone: ${!!lead.phone}
Is Hot: ${lead.isHot}
AI Estimated Value: ${lead.aiEstimatedValue || 'N/A'}`;

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
            content: 'You are a lead scoring agent. Analyze this lead and return ONLY a JSON object with fields: score (integer 0-100), summary (string with reasoning). Base score on: sport (basketball/football score higher), state, estimated students, engagement, stage, and data completeness.',
          },
          { role: 'user', content: context },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('MiniMax API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let parsed: { score?: number; summary?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse MiniMax scoring response');
    }

    return {
      score: parsed.score || 50,
      signals,
      summary: parsed.summary || 'AI scoring unavailable',
    };
  } catch (error) {
    console.error('MiniMax scoring error:', error);
    // Fallback scoring
    let score = 30;
    if (lead.email) score += 15;
    if (lead.phone) score += 10;
    if (lead.sport) score += 15;
    if (lead.schoolName?.length > 5) score += 10;
    if (lead.estimatedStudents > 300) score += 10;
    if (lead.isHot) score += 10;
    
    return {
      score: Math.min(score, 100),
      signals,
      summary: 'Fallback scoring due to API error',
    };
  }
}

// POST /api/admin/crm/bot/ai-score
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';

    // Get all leads without LeadAIAnalysis
    const existingAnalyses = await prisma.leadAIAnalysis.findMany({ select: { leadId: true } });
    const scoredLeadIds = existingAnalyses.map(a => a.leadId);

    const leadsToScore = await prisma.lead.findMany({
      where: {
        id: { notIn: scoredLeadIds },
      },
      take: 100, // Process in batches
    });

    const scored: string[] = [];
    const errors: string[] = [];

    for (const lead of leadsToScore) {
      try {
        const result = await scoreLead(lead, MINIMAX_API_KEY);

        // Store in LeadAIAnalysis
        await prisma.leadAIAnalysis.upsert({
          where: { leadId: lead.id },
          create: {
            leadId: lead.id,
            score: result.score,
            signals: result.signals,
            summary: result.summary,
            analyzedAt: new Date(),
          },
          update: {
            score: result.score,
            signals: result.signals,
            summary: result.summary,
            analyzedAt: new Date(),
          },
        });

        // Also update the lead's aiScore field
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            aiScore: result.score,
            aiNotes: result.summary,
            lastAiAnalysisAt: new Date(),
          },
        });

        // Create engagement event
        await prisma.engagementEvent.create({
          data: {
            leadId: lead.id,
            channel: 'ai',
            actionType: 'ai_scored',
            contentPreview: `AI Score: ${result.score}/100 - ${result.summary}`,
            fullContent: `AI Analysis:\nScore: ${result.score}/100\nSignals: ${JSON.stringify(result.signals)}\nSummary: ${result.summary}`,
            isAuto: true,
            sentBy: 'ai_agent',
          },
        });

        scored.push(lead.id);
      } catch (error) {
        console.error(`Failed to score lead ${lead.id}:`, error);
        errors.push(lead.id);
      }
    }

    return NextResponse.json({
      scored: scored.length,
      errors: errors.length,
      leadIds: scored,
    });
  } catch (error) {
    console.error('Bot AI score error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}