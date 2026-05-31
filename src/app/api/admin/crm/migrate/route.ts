import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

export async function POST() {
  try {
    await prisma.$connect();
    
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map(t => t.tablename);

    // Add columns to users table (Prisma uses lowercase table names)
    try {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "commissionRate" Decimal(5,2) DEFAULT 0.10`;
    } catch (e) {}
    try {
      await prisma.$executeRaw`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" Boolean DEFAULT true`;
    } catch (e) {}

    // Create Lead table
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Lead" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "createdAt" TIMESTAMP DEFAULT now(),
      "updatedAt" TIMESTAMP DEFAULT now(),
      "firstName" TEXT,
      "lastName" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "company" TEXT,
      "position" TEXT,
      "sport" TEXT,
      "teamName" TEXT,
      "stage" INTEGER DEFAULT 0,
      "aiScore" INTEGER DEFAULT 0,
      "isHot" Boolean DEFAULT false,
      "assignedToId" TEXT,
      "source" TEXT,
      "notes" TEXT,
      "pipelineOrder" INTEGER DEFAULT 0,
      "contractValue" Decimal(10,2) DEFAULT 0,
      "lastContactedAt" TIMESTAMP,
      "teamId" TEXT
    )`;

    // Create EngagementEvent table
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "EngagementEvent" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "createdAt" TIMESTAMP DEFAULT now(),
      "leadId" TEXT,
      "channel" TEXT,
      "actionType" TEXT,
      "contentPreview" TEXT,
      "responseText" TEXT,
      "sentById" TEXT
    )`;

    return NextResponse.json({ 
      message: 'Migration complete', 
      success: true,
      tables: ['users', 'Lead', 'EngagementEvent']
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    await prisma.$connect();
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    return NextResponse.json({ tables: tables.map(t => t.tablename) });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}