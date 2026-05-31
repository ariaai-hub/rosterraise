import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

interface LeadInput {
  name?: string;
  schoolName?: string;
  sport?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  stage?: number;
}

// POST /api/admin/crm/facebook/import
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leads } = body as { leads: LeadInput[] };

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'leads array is required and must not be empty' }, { status: 400 });
    }

    const imported: string[] = [];
    const skipped: { lead: string; reason: string }[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];

      // Validate required fields
      if (!item.schoolName || item.schoolName.trim() === '') {
        errors.push({ row: i + 1, error: 'schoolName is required' });
        continue;
      }

      const name = item.name?.trim() || '';
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      try {
        // Check for duplicates by email or phone
        const existingCondition: Record<string, string> = {};
        if (item.email) {
          const existingByEmail = await prisma.lead.findFirst({
            where: { email: item.email.trim() },
          });
          if (existingByEmail) {
            skipped.push({ lead: item.name || item.schoolName, reason: `Duplicate email: ${item.email}` });
            continue;
          }
          existingCondition.email = item.email.trim();
        }
        if (item.phone) {
          const normalizedPhone = item.phone.replace(/\D/g, '');
          const existingByPhone = await prisma.lead.findFirst({
            where: {
              OR: [
                { phone: item.phone.trim() },
                { phone: normalizedPhone },
              ],
            },
          });
          if (existingByPhone) {
            skipped.push({ lead: item.name || item.schoolName, reason: `Duplicate phone: ${item.phone}` });
            continue;
          }
        }

        const stage = item.stage && item.stage >= 1 && item.stage <= 11 ? item.stage : 1;
        const estimatedStudents = 200;
        const aiEstimatedValue = Math.round(estimatedStudents * 10 * 0.70);

        const lead = await prisma.lead.create({
          data: {
            firstName,
            lastName,
            schoolName: item.schoolName.trim(),
            sport: item.sport?.trim() || null,
            phone: item.phone?.trim() || null,
            email: item.email?.trim() || null,
            sourceChannel: 'Facebook',
            sourceGroupName: item.source?.trim() || null,
            leadNotes: item.notes?.trim() || null,
            stage,
            estimatedStudents,
            aiEstimatedValue,
          },
        });

        // Create engagement event for the import
        await prisma.engagementEvent.create({
          data: {
            leadId: lead.id,
            channel: 'import',
            actionType: 'LEAD_IMPORTED',
            contentPreview: `Lead imported from Facebook${item.source ? ` (${item.source})` : ''}`,
            fullContent: JSON.stringify({ source: item.source, notes: item.notes, importedBy: session.email }),
            isAuto: true,
            sentBy: session.email || undefined,
          },
        });

        imported.push(lead.schoolName);
      } catch (err) {
        errors.push({ row: i + 1, error: String(err) });
      }
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Facebook lead import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}