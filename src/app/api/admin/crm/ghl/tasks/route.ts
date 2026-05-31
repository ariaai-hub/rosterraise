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

// POST /api/admin/crm/ghl/tasks — create follow-up task when lead is assigned
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
    const { leadId, assignedToId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch assigned user info
    let assignedToName = 'Sales Team';
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (assignedUser) {
        assignedToName = `${assignedUser.firstName} ${assignedUser.lastName}`.trim();
      }
    }

    // Create task due 3 business days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const taskPayload = {
      locationId: GHL_LOCATION_ID,
      title: `Follow up: ${lead.schoolName}`,
      description: [
        `Lead: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}`,
        `School: ${lead.schoolName}`,
        `Email: ${lead.email || 'N/A'}`,
        `Phone: ${lead.phone || 'N/A'}`,
        `Sport: ${lead.sport || 'N/A'}`,
        `Est. Students: ${lead.estimatedStudents}`,
        `Est. Value: $${lead.aiEstimatedValue || 0}`,
        `Stage: ${lead.stage}`,
        `Source: ${lead.sourceChannel || 'rosterraise'}`,
        `Assigned to: ${assignedToName}`,
        `\nLead Notes: ${lead.leadNotes || 'None'}`,
      ].filter(Boolean).join('\n'),
      dueDate: dueDate.toISOString(),
      assignedTo: assignedToId || '',
      status: 'pending',
      priority: lead.isHot ? 'high' : 'normal',
      isComplete: false,
      customFields: [
        { key: 'lead_id', field_value: lead.id },
        { key: 'school_name', field_value: lead.schoolName },
        { key: 'rosterraise_task', field_value: 'true' },
      ],
    };

    const response = await fetch(`${GHL_API_BASE}/tasks/`, {
      method: 'POST',
      headers: ghlHeaders(GHL_API_KEY),
      body: JSON.stringify(taskPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('GHL create task error:', err);
      return NextResponse.json({ error: 'Failed to create GHL task' }, { status: 500 });
    }

    const ghlTask = await response.json();

    // Log engagement event
    await prisma.engagementEvent.create({
      data: {
        leadId: lead.id,
        channel: 'ghl',
        actionType: 'task_created',
        contentPreview: `Follow-up task created for ${assignedToName}`,
        fullContent: `GHL Task ID: ${ghlTask.id}, Due: ${dueDate.toLocaleDateString()}`,
        isAuto: false,
        sentBy: session.id,
      },
    });

    return NextResponse.json({ success: true, ghlTask });
  } catch (error) {
    console.error('GHL tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
