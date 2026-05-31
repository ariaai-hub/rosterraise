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

// POST /api/admin/crm/ghl/create-proposal
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return NextResponse.json({ configured: false, message: 'GHL not configured — add GHL_API_KEY to enable' });
    }

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Step 1: Search for contact in GHL
    let ghlContactId: string | null = null;
    if (lead.email) {
      const searchResponse = await fetch(
        `${GHL_API_BASE}/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(lead.email)}`,
        { headers: ghlHeaders(GHL_API_KEY), cache: 'no-store' }
      );
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.contacts && searchData.contacts.length > 0) {
          ghlContactId = searchData.contacts[0].id;
        }
      }
    }

    // Step 2: Create contact if not found
    if (!ghlContactId) {
      const contactPayload = {
        locationId: GHL_LOCATION_ID,
        email: lead.email || '',
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '',
        companyName: lead.schoolName,
        website: lead.schoolUrl || '',
        city: lead.schoolCity || '',
        state: lead.schoolState || '',
        postalCode: lead.schoolZip || '',
        tags: lead.tags || [],
        source: lead.sourceChannel || 'rosterraise',
        customFields: [
          { key: 'school_name', field_value: lead.schoolName },
          { key: 'school_city', field_value: lead.schoolCity || '' },
          { key: 'school_state', field_value: lead.schoolState || '' },
          { key: 'sport', field_value: lead.sport || '' },
          { key: 'estimated_students', field_value: String(lead.estimatedStudents) },
          { key: 'lead_id', field_value: lead.id },
        ].filter((f) => f.field_value !== ''),
      };

      const contactResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: 'POST',
        headers: ghlHeaders(GHL_API_KEY),
        body: JSON.stringify(contactPayload),
      });

      if (contactResponse.ok) {
        const newContact = await contactResponse.json();
        ghlContactId = newContact.id;
      }
    }

    // Step 3: Create deal
    let ghlDealId: string | null = null;
    const dealValue = lead.aiEstimatedValue || lead.contractValue || lead.estimatedStudents * 25;

    const dealPayload = {
      locationId: GHL_LOCATION_ID,
      name: `RosterRaise — ${lead.schoolName}`,
      pipelineId: process.env.GHL_PIPELINE_ID || '',
      pipelineStageId: process.env.GHL_PIPELINE_STAGE_ID || '',
      contactId: ghlContactId || '',
      status: 'open',
      monetaryValue: dealValue,
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
      ].filter((f) => f.field_value !== ''),
    };

    const dealResponse = await fetch(`${GHL_API_BASE}/deals/`, {
      method: 'POST',
      headers: ghlHeaders(GHL_API_KEY),
      body: JSON.stringify(dealPayload),
    });

    if (dealResponse.ok) {
      const ghlDeal = await dealResponse.json();
      ghlDealId = ghlDeal.id;
    }

    // Step 4: Create proposal
    const proposalPayload = {
      locationId: GHL_LOCATION_ID,
      proposalName: `RosterRaise Proposal - ${lead.schoolName}`,
      prospectEmail: lead.email,
      prospectName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.schoolName,
      proposalValue: dealValue,
      status: 'draft',
      dealId: ghlDealId,
      contactId: ghlContactId,
    };

    const proposalResponse = await fetch(`${GHL_API_BASE}/proposals/standard/create`, {
      method: 'POST',
      headers: ghlHeaders(GHL_API_KEY),
      body: JSON.stringify(proposalPayload),
    });

    if (!proposalResponse.ok) {
      const err = await proposalResponse.text();
      console.error('GHL proposal create error:', err);
      return NextResponse.json({ error: 'Failed to create GHL proposal' }, { status: 500 });
    }

    const ghlProposal = await proposalResponse.json();

    // Step 5: Update lead to stage 8 (Proposal Sent)
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { stage: 8, stageChangedAt: new Date() },
      include: { engagementEvents: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    // Step 6: Create engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId,
        channel: 'ghl',
        actionType: 'proposal_created',
        contentPreview: `Proposal created in GoHighLevel: $${dealValue}`,
        fullContent: JSON.stringify({
          ghlProposalId: ghlProposal.id,
          ghlDealId,
          ghlContactId,
          proposalUrl: ghlProposal.proposalUrl,
        }),
        isAuto: false,
        sentBy: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      ghlProposalId: ghlProposal.id,
      ghlDealId,
      ghlContactId,
      proposalUrl: ghlProposal.proposalUrl,
      lead: updatedLead,
    });
  } catch (error) {
    console.error('CRM GHL create proposal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
