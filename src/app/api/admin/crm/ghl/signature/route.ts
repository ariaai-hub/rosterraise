import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

function ghlHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// GET /api/admin/crm/ghl/signature?proposalId=... — check proposal signature status
export async function GET(request: NextRequest) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return NextResponse.json({ configured: false, message: 'GHL not configured — add GHL_API_KEY to enable' });
  }

  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get('proposalId');

  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId query param required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${GHL_API_BASE}/proposals/standard/${proposalId}`,
      { headers: ghlHeaders(GHL_API_KEY), cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ found: false, proposalId });
      }
      const err = await response.text();
      console.error('GHL proposal fetch error:', err);
      return NextResponse.json({ error: 'Failed to fetch proposal status' }, { status: 500 });
    }

    const proposal = await response.json();

    return NextResponse.json({
      found: true,
      proposalId,
      status: proposal.status,
      signatureStatus: proposal.signatureStatus,
      signedAt: proposal.signedAt,
      signedBy: proposal.signedBy,
      proposalUrl: proposal.proposalUrl,
      proposalName: proposal.proposalName,
      prospectEmail: proposal.prospectEmail,
      monetaryValue: proposal.monetaryValue,
    });
  } catch (error) {
    console.error('GHL signature GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
