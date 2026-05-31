import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/admin/crm/ghl/webhook
// GHL sends webhooks for: proposal_signed, deal_created, contact_created, etc.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('GHL Webhook received:', JSON.stringify(body));

    const eventType = body.event || body.type;

    switch (eventType) {
      case 'envelope.signed':
      case 'proposal_signed':
      case 'signature_completed': {
        // Proposal was signed — lead won
        const leadId = body.leadId || body.prospectId || body.data?.leadId;
        const contractValue = body.contractValue || body.value || body.data?.value || 0;

        if (leadId) {
          const lead = await prisma.lead.findFirst({
            where: {
              OR: [{ id: leadId }, { email: leadId }],
            },
          });

          if (lead) {
            const parsedValue = typeof contractValue === 'number' ? contractValue : parseInt(String(contractValue), 10);
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                stage: 10,
                wonAt: new Date(),
                contractValue: parsedValue,
                stageChangedAt: new Date(),
              },
            });

            await prisma.engagementEvent.create({
              data: {
                leadId: lead.id,
                channel: 'ghl',
                actionType: 'contract_signed',
                contentPreview: 'Contract signed via GoHighLevel',
                fullContent: `GHL Envelope signed. Contract value: ${parsedValue}`,
                isAuto: true,
              },
            });
          }
        }
        break;
      }

      case 'deal_created':
      case 'opportunity_created': {
        const ghlDealId = body.dealId || body.data?.id;
        const leadId = body.leadId || body.data?.customFields?.lead_id;

        if (ghlDealId && leadId) {
          const lead = await prisma.lead.findFirst({
            where: { id: leadId },
          });

          if (lead) {
            await prisma.engagementEvent.create({
              data: {
                leadId: lead.id,
                channel: 'ghl',
                actionType: 'deal_created',
                contentPreview: `Deal created in GoHighLevel: ${ghlDealId}`,
                fullContent: `GHL Deal ID: ${ghlDealId}`,
                isAuto: true,
              },
            });
          }
        }
        break;
      }

      case 'contact_created':
      case 'contact_updated': {
        const ghlContactId = body.contactId || body.data?.id;
        const leadId = body.leadId || body.data?.customFields?.lead_id;

        if (ghlContactId && leadId) {
          const lead = await prisma.lead.findFirst({
            where: { id: leadId },
          });

          if (lead) {
            await prisma.engagementEvent.create({
              data: {
                leadId: lead.id,
                channel: 'ghl',
                actionType: 'contact_created',
                contentPreview: `Contact synced in GoHighLevel: ${ghlContactId}`,
                fullContent: `GHL Contact ID: ${ghlContactId}`,
                isAuto: true,
              },
            });
          }
        }
        break;
      }

      case 'note_added':
      case 'task_completed':
      case 'stage_changed': {
        // Log GHL activities for audit trail
        console.log('GHL activity event:', eventType, body);
        break;
      }

      default:
        console.log('Unhandled GHL webhook event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
