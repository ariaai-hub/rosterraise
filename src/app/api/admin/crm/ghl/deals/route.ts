import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

function ghlHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// POST /api/admin/crm/ghl/deals — create a deal when lead moves to Proposal Sent
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminOrSalesRep(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return NextResponse.json({ configured: false, message: 'GHL not configured — add GHL_API_KEY to enable' });
  }

  try {
    const { leadId, stage } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build deal payload
    const dealPayload = {
      locationId: GHL_LOCATION_ID,
      name: `RosterRaise — ${lead.schoolName}`,
      pipelineId: process.env.GHL_PIPELINE_ID || '',
      pipelineStageId: process.env.GHL_PIPELINE_STAGE_ID || '',
      contactId: '', // Will be linked after contact creation
      leadId: lead.id,
      status: stage === 10 ? 'won' : 'open',
      monetaryValue: lead.aiEstimatedValue || lead.contractValue || lead.estimatedStudents * 25,
      source: lead.sourceChannel || 'rosterraise',
      customFields: [
        { key: 'school_name', field_value: lead.schoolName },
        { key: 'school_city', field_value: lead.schoolCity || '' },
        { key: 'school_state', field_value: lead.schoolState || '' },
        { key: 'sport', field_value: lead.sport || '' },
        { key: 'estimated_students', field_value: String(lead.estimatedStudents) },
        { key: 'ai_estimated_value', field_value: String(lead.aiEstimatedValue || 0) },
        { key: 'contract_value', field_value: String(lead.contractValue || 0) },
        { key: 'lead_id', field_value: lead.id },
        { key: 'rosterraise_deal', field_value: 'true' },
      ],
    };

    // Filter empty custom fields
    dealPayload.customFields = dealPayload.customFields.filter(
      (f: { key: string; field_value: string }) => f.field_value !== ''
    );

    const response = await fetch(`${GHL_API_BASE}/deals/`, {
      method: 'POST',
      headers: ghlHeaders(GHL_API_KEY),
      body: JSON.stringify(dealPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('GHL create deal error:', err);
      return NextResponse.json({ error: 'Failed to create GHL deal' }, { status: 500 });
    }

    const ghlDeal = await response.json();

    // Log engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId: lead.id,
        channel: 'ghl',
        actionType: 'deal_created',
        contentPreview: `Deal created in GoHighLevel: $${dealPayload.monetaryValue}`,
        fullContent: `GHL Deal ID: ${ghlDeal.id}`,
        isAuto: false,
        sentBy: session.id,
      },
    });

    return NextResponse.json({ success: true, ghlDeal });
  } catch (error) {
    console.error('GHL deals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
