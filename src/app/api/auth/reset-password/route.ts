import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth';

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().length(64),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid reset token or email' }, { status: 400 });
    }

    // Verify token matches
    if (user.emailVerifyToken !== validated.token) {
      return NextResponse.json({ error: 'Invalid reset token or email' }, { status: 400 });
    }

    // Hash new password and clear reset token
    const passwordHash = await hashPassword(validated.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerifyToken: null,
      },
    });

    // Auto-login after password reset
    const accessToken = await createAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = await createRefreshToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({ message: 'Password reset successful' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
