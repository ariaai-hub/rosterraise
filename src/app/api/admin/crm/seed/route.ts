import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

function generateId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let id = 'cm';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST() {
  try {
    await prisma.$connect();
    
    const adminEmail = 'admin@rosterraise.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    if (!existingAdmin) {
      const passwordHash = await hash('Admin123!@#', 12);
      await prisma.$queryRaw`
        INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "emailVerified", "isActive", "createdAt", "updatedAt")
        VALUES (${generateId()}, ${adminEmail}, ${passwordHash}, 'Admin', 'User', 'ADMIN'::"UserRole", true, true, now(), now())
      `;
    }

    const repData = [
      { email: 'sales1@rosterraise.com', firstName: 'Marcus', lastName: 'Chen', commissionRate: 0.30 },
      { email: 'sales2@rosterraise.com', firstName: 'Jordan', lastName: 'Taylor', commissionRate: 0.25 },
      { email: 'cs1@rosterraise.com', firstName: 'Riley', lastName: 'Davis', commissionRate: 0.0 },
    ];
    const repIds: string[] = [];
    for (const r of repData) {
      const existing = await prisma.user.findUnique({ where: { email: r.email } });
      if (!existing) {
        const ph = await hash('Password123!@#', 12);
        await prisma.$queryRaw`
          INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role", "commissionRate", "emailVerified", "isActive", "createdAt", "updatedAt")
          VALUES (${generateId()}, ${r.email}, ${ph}, ${r.firstName}, ${r.lastName}, 'SALES_REP'::"UserRole", ${r.commissionRate}, true, true, now(), now())
        `;
      }
      const user = await prisma.user.findUnique({ where: { email: r.email } });
      if (user) repIds.push(user.id);
    }

    const leadsData = [
      { firstName: 'Marcus', lastName: 'Thompson', title: 'Athletic Director', schoolName: 'Riverside High School', schoolCity: 'Austin', schoolState: 'TX', sport: 'Football', stage: 1, sourceChannel: 'facebook_group', email: 'marcus.thompson@rhsa.edu' },
      { firstName: 'Jaylen', lastName: 'Williams', title: 'Head Coach', schoolName: 'Northlake Academy', schoolCity: 'Dallas', schoolState: 'TX', sport: 'Basketball', stage: 2, sourceChannel: 'facebook_comment', email: 'jaylen.w@nla.edu', isHot: true },
      { firstName: 'DeShawn', lastName: 'Johnson', title: 'Sports Coordinator', schoolName: 'Westside Middle', schoolCity: 'Houston', schoolState: 'TX', sport: 'Football', stage: 3, sourceChannel: 'facebook_dm', email: 'djohnson@wsm.edu', aiScore: 78 },
      { firstName: 'Malik', lastName: 'Brown', title: 'AD', schoolName: 'Central Eagles', schoolCity: 'Miami', schoolState: 'FL', sport: 'Basketball', stage: 4, sourceChannel: 'referral', email: 'malik@centraleagles.edu', aiScore: 82, isHot: true },
      { firstName: 'Tyler', lastName: 'Davis', title: 'Head Football Coach', schoolName: 'Eastbay High', schoolCity: 'Columbus', schoolState: 'OH', sport: 'Football', stage: 5, sourceChannel: 'facebook_group', email: 'tdavis@eastbay.edu', aiScore: 65 },
      { firstName: 'Chris', lastName: 'Miller', title: 'Athletic Director', schoolName: 'Southwest Raiders', schoolCity: 'Atlanta', schoolState: 'GA', sport: 'Baseball', stage: 6, sourceChannel: 'facebook_dm', email: 'cmiller@southwest.edu', aiScore: 71, isHot: true },
      { firstName: 'Andre', lastName: 'Garcia', title: 'Coach', schoolName: 'Mountain View Academy', schoolCity: 'Phoenix', schoolState: 'AZ', sport: 'Soccer', stage: 7, sourceChannel: 'website', email: 'agarcia@mva.edu', aiScore: 88, contractValue: 95000 },
      { firstName: 'Brandon', lastName: 'Scott', title: 'Athletic Director', schoolName: 'Lakewood High', schoolCity: 'Denver', schoolState: 'CO', sport: 'Basketball', stage: 8, sourceChannel: 'facebook_group', email: 'bscott@lakewood.edu', aiScore: 75, contractValue: 120000 },
      { firstName: 'Derrick', lastName: 'Robinson', title: 'Head Coach', schoolName: 'Riverside Academy', schoolCity: 'Chicago', schoolState: 'IL', sport: 'Football', stage: 9, sourceChannel: 'referral', email: 'drobinson@riverside.edu', aiScore: 92, contractValue: 168000, wonAt: new Date(Date.now() - 5 * 86400000) },
      { firstName: 'Emmanuel', lastName: 'Rodriguez', title: 'Sports Director', schoolName: 'Sunset High', schoolCity: 'San Antonio', schoolState: 'TX', sport: 'Volleyball', stage: 10, sourceChannel: 'facebook_comment', email: 'erodriguez@sunset.edu', aiScore: 60, isHot: true },
      { firstName: 'Justin', lastName: 'Kim', title: 'Athletic Coordinator', schoolName: 'Pacific Coast Academy', schoolCity: 'Seattle', schoolState: 'WA', sport: 'Basketball', stage: 4, sourceChannel: 'facebook_group', email: 'jkim@pacificcoast.edu', aiScore: 55 },
      { firstName: 'Darius', lastName: 'Jackson', title: 'Head Coach', schoolName: 'Oakland Tech', schoolCity: 'Oakland', schoolState: 'CA', sport: 'Football', stage: 3, sourceChannel: 'facebook_dm', email: 'djackson@oaklandtech.edu', aiScore: 70 },
      { firstName: 'Kyle', lastName: 'Patterson', title: 'AD', schoolName: 'Gateway High', schoolCity: 'Portland', schoolState: 'OR', sport: 'Baseball', stage: 6, sourceChannel: 'website', email: 'kpatterson@gateway.edu', aiScore: 83, isHot: true },
      { firstName: 'Troy', lastName: 'Anderson', title: 'Coach', schoolName: 'Northwest Preparatory', schoolCity: 'Minneapolis', schoolState: 'MN', sport: 'Hockey', stage: 5, sourceChannel: 'referral', email: 'tanderson@nwprep.edu', aiScore: 67 },
      { firstName: 'Adrian', lastName: 'Campbell', title: 'Athletic Director', schoolName: 'Victory Academy', schoolCity: 'Charlotte', schoolState: 'NC', sport: 'Basketball', stage: 2, sourceChannel: 'facebook_group', email: 'acampbell@victoryacademy.edu', aiScore: 48 },
    ];

    const createdLeads = [];
    for (const ld of leadsData) {
      const assignedTo = repIds[ld.stage % repIds.length] || null;
      
      await prisma.$queryRaw`
        INSERT INTO "leads" ("id", "firstName", "lastName", "title", "schoolName", "schoolCity", "schoolState", "sport", "email", "sourceChannel", "stage", "aiScore", "isHot", "estimatedStudents", "aiEstimatedValue", "contractValue", "wonAt", "stageChangedAt", "lastContactedAt", "emailSent", "emailOpened", "emailReplied", "fbCommentSent", "fbDmSent", "fbDmReplied", "assignedTo", "createdAt", "updatedAt")
        VALUES (
          ${generateId()}, ${ld.firstName}, ${ld.lastName}, ${ld.title}, ${ld.schoolName}, ${ld.schoolCity}, ${ld.schoolState}, ${ld.sport}, ${ld.email}, ${ld.sourceChannel},
          ${ld.stage}, ${ld.aiScore || null}, ${ld.isHot || false}, 200, 1400, ${ld.contractValue || null}, ${ld.wonAt || null}, now(), now(),
          ${ld.stage >= 2 ? 1 : 0}, ${ld.stage >= 3 ? 1 : 0}, ${ld.stage >= 5 ? 1 : 0}, ${ld.stage >= 2}, ${ld.stage >= 4}, ${ld.stage >= 6},
          ${assignedTo}, now(), now()
        )
      `;
      
      createdLeads.push({ name: `${ld.firstName} ${ld.lastName}`, school: ld.schoolName, stage: ld.stage });

      if (ld.stage >= 2) {
        const events: { channel: string; actionType: string; contentPreview: string; responseText?: string }[] = [
          { channel: 'email', actionType: 'sent', contentPreview: `Sent intro email to ${ld.firstName}` },
          { channel: 'email', actionType: 'opened', contentPreview: `${ld.firstName} opened our email` },
        ];
        if (ld.stage >= 3) {
          events.push({ channel: 'facebook_comment', actionType: 'sent', contentPreview: `Left comment on their FB post` });
          events.push({ channel: 'facebook_comment', actionType: 'replied', contentPreview: `${ld.firstName} replied to comment`, responseText: 'Thanks for the info!' });
        }
        if (ld.stage >= 4) {
          events.push({ channel: 'facebook_dm', actionType: 'sent', contentPreview: `Sent FB DM with proposal` });
        }
        if (ld.stage >= 5) {
          events.push({ channel: 'email', actionType: 'replied', contentPreview: `${ld.firstName} replied to email`, responseText: 'Yes, I am interested. Can we schedule a call?' });
        }
        if (ld.stage >= 6) {
          events.push({ channel: 'facebook_dm', actionType: 'replied', contentPreview: `${ld.firstName} confirmed meeting`, responseText: 'Wednesday at 2pm works for me.' });
        }
        for (const ev of events) {
          await prisma.$executeRaw`
            INSERT INTO "engagement_events" ("id", "leadId", "channel", "actionType", "contentPreview", "fullContent", "isAuto", "sentBy", "responseText", "isReviewed", "createdAt")
            VALUES (${generateId()}, (SELECT id FROM "leads" WHERE "email" = ${ld.email} ORDER BY "createdAt" DESC LIMIT 1), ${ev.channel}, ${ev.actionType}, ${ev.contentPreview}, ${ev.contentPreview}, true, 'ai_bot', ${ev.responseText || null}, ${ld.stage >= 7}, now())
          `;
        }
      }
    }

    return NextResponse.json({
      message: 'CRM seeded',
      admin: { email: adminEmail, password: 'Admin123!@#', role: 'ADMIN' },
      salesReps: repData.map((r, i) => ({ email: r.email, password: 'Password123!@#', role: 'SALES_REP' })),
      leadsCreated: createdLeads.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}