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

// GET /api/admin/crm/ghl/contacts?email=... — search for contact by email
export async function GET(request: NextRequest) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return NextResponse.json({ configured: false, message: 'GHL not configured — add GHL_API_KEY to enable' });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const ghlContactId = searchParams.get('ghlContactId');

  if (!email && !ghlContactId) {
    return NextResponse.json({ error: 'email or ghlContactId query param required' }, { status: 400 });
  }

  try {
    // Search by email
    if (email) {
      const response = await fetch(
        `${GHL_API_BASE}/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`,
        { headers: ghlHeaders(GHL_API_KEY), cache: 'no-store' }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('GHL contact search error:', err);
        return NextResponse.json({ error: 'Failed to search GHL contacts' }, { status: 500 });
      }

      const data = await response.json();
      const contacts = data.contacts || [];

      if (contacts.length > 0) {
        return NextResponse.json({ found: true, contact: contacts[0] });
      }
      return NextResponse.json({ found: false });
    }

    // Fetch by ID directly
    if (ghlContactId) {
      const response = await fetch(
        `${GHL_API_BASE}/contacts/${ghlContactId}`,
        { headers: ghlHeaders(GHL_API_KEY), cache: 'no-store' }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json({ found: false });
        }
        return NextResponse.json({ error: 'Failed to fetch GHL contact' }, { status: 500 });
      }

      const contact = await response.json();
      return NextResponse.json({ found: true, contact });
    }
  } catch (error) {
    console.error('GHL contacts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/crm/ghl/contacts — create a new contact in GHL
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
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Build GHL contact payload
    const contactPayload: Record<string, unknown> = {
      locationId: GHL_LOCATION_ID,
      email: lead.email,
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      phone: lead.phone || '',
      companyName: lead.schoolName,
      website: lead.schoolUrl || '',
      address1: '',
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
        { key: 'ai_estimated_value', field_value: String(lead.aiEstimatedValue || '') },
        { key: 'contract_value', field_value: String(lead.contractValue || '') },
        { key: 'lead_id', field_value: lead.id },
      ],
    };

    // Filter out empty custom fields
    contactPayload.customFields = (contactPayload.customFields as Array<{key: string; field_value: string}>).filter(
      (f) => f.field_value !== ''
    );

    const response = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: ghlHeaders(GHL_API_KEY),
      body: JSON.stringify(contactPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('GHL create contact error:', err);
      return NextResponse.json({ error: 'Failed to create GHL contact' }, { status: 500 });
    }

    const ghlContact = await response.json();

    // Log engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId: lead.id,
        channel: 'ghl',
        actionType: 'contact_created',
        contentPreview: 'Contact created in GoHighLevel',
        fullContent: `GHL Contact ID: ${ghlContact.id}`,
        isAuto: false,
        sentBy: session.id,
      },
    });

    return NextResponse.json({ success: true, ghlContact });
  } catch (error) {
    console.error('GHL contacts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
