import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function isAdminOrSalesRep(session: { role?: string }) {
  return session?.role === 'ADMIN' || session?.role === 'SALES_REP';
}

// POST /api/admin/crm/leads/import
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminOrSalesRep(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

    const requiredHeaders = ['schoolname'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required headers: ${missingHeaders.join(', ')}` }, { status: 400 });
    }

    const created: string[] = [];
    const failed: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        failed.push({ row: i + 1, error: 'Column count mismatch' });
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim().replace(/^"|"$/g, ''); });

      try {
        const estimatedStudents = parseInt(row['estimatedstudents'] || row['estimatedstudents'] || '200', 10) || 200;
        const aiEstimatedValue = estimatedStudents * 10 * 0.70;

        await prisma.lead.create({
          data: {
            schoolName: row['schoolname'] || `Import ${i}`,
            firstName: row['firstname'] || null,
            lastName: row['lastname'] || null,
            email: row['email'] || null,
            phone: row['phone'] || null,
            sport: row['sport'] || null,
            schoolCity: row['schoolcity'] || null,
            schoolState: row['schoolstate'] || null,
            schoolZip: row['schoolzip'] || null,
            facebookUrl: row['facebookurl'] || null,
            sourceChannel: row['sourcechannel'] || null,
            sourceGroupName: row['sourcegroupname'] || null,
            tags: row['tags'] ? row['tags'].split(';').map(t => t.trim()) : [],
            estimatedStudents,
            aiEstimatedValue,
            stage: 1,
          },
        });
        created.push(row['schoolname'] || `Row ${i}`);
      } catch (err) {
        failed.push({ row: i + 1, error: String(err) });
      }
    }

    return NextResponse.json({
      created: created.length,
      failed: failed.length,
      errors: failed,
    });
  } catch (error) {
    console.error('CRM leads import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}