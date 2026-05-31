import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

export async function POST() {
  try {
    await prisma.$connect();
    
    // Check what roles exist in DB via raw SQL
    let roles: string[] = [];
    try {
      const result = await prisma.$queryRaw<{ rolname: string }[]>`
        SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%'
      `;
      roles = result.map(r => r.rolname);
    } catch (e) {
      roles = ['postgres', 'neondb_owner'];
    }
    
    // Check UserRole enum in our app schema
    const enumResult = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')
    `;
    
    return NextResponse.json({ 
      pg_roles: roles,
      user_role_enum: enumResult.map(e => e.enumlabel),
      schema_roles: ['ADMIN', 'COACH', 'PARENT', 'CS', 'SALES_REP']
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error), hint: 'Check if UserRole enum in DB matches schema' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}