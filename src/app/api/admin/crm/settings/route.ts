import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// In-memory store (in real app, store in DB or env)
let SETTINGS = {
  minimaxApiKey: '',
  gohighlevelApiKey: '',
  gohighlevelLocationId: '',
  resendConfigured: true,
  autoEnrich: true,
  autoScore: true,
  autoReply: true,
  escalationThreshold: 25000,
};

// GET /api/admin/crm/settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(SETTINGS);
  } catch (error) {
    console.error('CRM settings get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/crm/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update allowed fields
    if (body.minimaxApiKey !== undefined) SETTINGS.minimaxApiKey = body.minimaxApiKey;
    if (body.gohighlevelApiKey !== undefined) SETTINGS.gohighlevelApiKey = body.gohighlevelApiKey;
    if (body.gohighlevelLocationId !== undefined) SETTINGS.gohighlevelLocationId = body.gohighlevelLocationId;
    if (body.resendConfigured !== undefined) SETTINGS.resendConfigured = body.resendConfigured;
    if (body.autoEnrich !== undefined) SETTINGS.autoEnrich = body.autoEnrich;
    if (body.autoScore !== undefined) SETTINGS.autoScore = body.autoScore;
    if (body.autoReply !== undefined) SETTINGS.autoReply = body.autoReply;
    if (body.escalationThreshold !== undefined) SETTINGS.escalationThreshold = body.escalationThreshold;

    return NextResponse.json(SETTINGS);
  } catch (error) {
    console.error('CRM settings put error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}