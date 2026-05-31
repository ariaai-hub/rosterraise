import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/ai/run-batch
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadIds, action } = await request.json();
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }
    if (!action || !['enrich', 'score'].includes(action)) {
      return NextResponse.json({ error: 'action must be "enrich" or "score"' }, { status: 400 });
    }

    const results: { leadId: string; success: boolean; error?: string }[] = [];

    for (const leadId of leadIds) {
      try {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
          results.push({ leadId, success: false, error: 'Lead not found' });
          continue;
        }

        if (action === 'enrich') {
          // Simplified enrich without MiniMax for batch
          const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: { stage: 2, stageChangedAt: new Date() },
          });
          await prisma.engagementEvent.create({
            data: {
              leadId,
              channel: 'ai',
              actionType: 'batch_enrichment',
              contentPreview: 'Batch enrichment completed',
              fullContent: 'Lead enriched via batch process',
              isAuto: true,
              sentBy: session.id || 'admin',
            },
          });
          results.push({ leadId, success: true });
        } else if (action === 'score') {
          // Simplified scoring without MiniMax for batch
          const baseScore = Math.min(100, Math.max(1, 
            (lead.estimatedStudents / 500) * 30 +
            (lead.stage * 5) +
            (lead.isHot ? 20 : 0) +
            (lead.email ? 10 : 0) +
            (lead.phone ? 10 : 0)
          ));
          await prisma.lead.update({
            where: { id: leadId },
            data: { aiScore: Math.round(baseScore), lastAiAnalysisAt: new Date() },
          });
          await prisma.engagementEvent.create({
            data: {
              leadId,
              channel: 'ai',
              actionType: 'batch_scored',
              contentPreview: `Batch scored: ${Math.round(baseScore)}/100`,
              fullContent: 'Lead scored via batch process',
              isAuto: true,
              sentBy: session.id || 'admin',
            },
          });
          results.push({ leadId, success: true });
        }
      } catch (err) {
        results.push({ leadId, success: false, error: String(err) });
      }
    }

    return NextResponse.json({
      total: leadIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('CRM AI run-batch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}