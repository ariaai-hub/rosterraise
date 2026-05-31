import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// Pre-defined sequence templates (in real app, stored in DB)
const SEQUENCES = [
  { id: 'touch1', name: 'FB Comment Touch 1', channel: 'fb_comment', day: 0, content: 'Hi {{firstName}}, great to connect at {{sourceGroupName}}! Would love to learn more about {{schoolName}}\'s {{sport}} program.' },
  { id: 'touch2', name: 'FB DM Touch 2', channel: 'fb_dm', day: 1, content: 'Hey {{firstName}}! Just following up on my message about RosterRaise. Do you have 10 minutes to chat?' },
  { id: 'touch3', name: 'Email Touch 3', channel: 'email', day: 3, content: 'Hi {{firstName}}, I sent you an email last week about helping {{schoolName}} raise funds through our roster platform. Would love to schedule a quick call.' },
  { id: 'day7', name: 'Day 7 Follow Up', channel: 'email', day: 7, content: 'Hi {{firstName}}, just circling back on my previous messages. We\'ve helped 500+ schools raise an average of $47k. Open to a brief call this week?' },
  { id: 'day10', name: 'Day 10 Final Follow Up', channel: 'email', day: 10, content: 'Hey {{firstName}}, last follow up from me! We have availability for new schools this month. Here\'s a quick demo video: [link]. Let me know!' },
];

// GET /api/admin/crm/sequences
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(SEQUENCES.map(s => ({ id: s.id, name: s.name, channel: s.channel, day: s.day })));
  } catch (error) {
    console.error('CRM sequences get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/crm/sequences - update template content
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, content } = await request.json();
    if (!id || content === undefined) {
      return NextResponse.json({ error: 'id and content are required' }, { status: 400 });
    }

    const seq = SEQUENCES.find(s => s.id === id);
    if (!seq) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Update in memory (in real app, update DB)
    seq.content = content;

    return NextResponse.json({ success: true, sequence: seq });
  } catch (error) {
    console.error('CRM sequences put error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}