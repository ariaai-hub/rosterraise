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
  teamId: z.string().optional(),
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

    // Hash password and generate verify token
    const passwordHash = await hashPassword(validated.password);
    const emailVerifyToken = generateEmailVerifyToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
        teamId: validated.teamId,
        emailVerified: true, // AUTO-VERIFY for MVP — remove email verification flow once domain is confirmed
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Send verification email
    await sendVerificationEmail(user.email, emailVerifyToken);

    // Create tokens and set cookies
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
