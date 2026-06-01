import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateEmailVerifyToken, createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['COACH', 'PARENT']).optional().default('PARENT'),
  teamName: z.string().optional(),
  sport: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);
    const emailVerifyToken = generateEmailVerifyToken();

    // If COACH, create team first then user
    if (validated.role === 'COACH' && validated.teamName) {
      const slugBase = validated.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const slug = `${slugBase}-${Date.now().toString(36).slice(-6)}`;

      const team = await prisma.team.create({
        data: {
          name: validated.teamName,
          slug,
          sport: validated.sport || 'Other',
          status: 'PENDING',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: validated.email,
          passwordHash,
          firstName: validated.firstName,
          lastName: validated.lastName,
          role: 'COACH',
          emailVerified: true,
          teamId: team.id,
        },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true, teamId: true,
        },
      });

      const teamSlug = team.slug;

      // Create tokens and set cookies
      const accessToken = await createAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = await createRefreshToken({ userId: user.id, email: user.email, role: user.role });
      setAuthCookies(accessToken, refreshToken);

      return NextResponse.json({
        message: 'Registration successful. Your team is under review.',
        user: { ...user, teamSlug },
      }, { status: 201 });
    }

    // Standard (non-coach) registration
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role || 'PARENT',
        emailVerified: false,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, teamId: true,
      },
    });

    await sendVerificationEmail(user.email, emailVerifyToken);

    const accessToken = await createAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = await createRefreshToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      message: 'Registration successful. Please verify your email.',
      user,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
