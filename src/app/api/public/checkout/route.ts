import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import stripe from '@/lib/stripe';

const orderItemSchema = z.object({
  productId: z.string(),
  playerId: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  size: z.string(),
  color: z.string(),
  unitPriceCents: z.number().int().positive(),
});

const publicCheckoutSchema = z.object({
  teamId: z.string(),
  items: z.array(orderItemSchema),
  shippingName: z.string().min(1, 'Name is required'),
  shippingEmail: z.string().email('Valid email is required'),
  shippingAddress: z.string().min(1, 'Address is required'),
  shippingCity: z.string().min(1, 'City is required'),
  shippingState: z.string().min(1, 'State is required'),
  shippingZip: z.string().min(5, 'ZIP code is required'),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RR-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = publicCheckoutSchema.parse(body);

    // Calculate totals
    const subtotalCents = validated.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const taxCents = Math.round(subtotalCents * 0.08);
    const shippingCents = subtotalCents >= 10000 ? 0 : 599;
    const totalCents = subtotalCents + taxCents + shippingCents;

    // Create or find user by email
    let user = await prisma.user.findFirst({
      where: { email: validated.shippingEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: validated.shippingEmail,
          firstName: validated.shippingName.split(' ')[0] || 'Guest',
          lastName: validated.shippingName.split(' ').slice(1).join(' ') || '',
          passwordHash: '$2a$10$placeholder',
          role: 'PARENT',
        },
      });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        teamId: validated.teamId,
        userId: user.id,
        orderNumber: generateOrderNumber(),
      },
    });

    // Create order with PENDING status (will be updated to PAID by webhook)
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        teamId: validated.teamId,
        userId: user.id,
        status: 'PENDING',
        subtotalCents,
        taxCents,
        shippingCents,
        totalCents,
        stripePaymentId: paymentIntent.id,
        shippingName: validated.shippingName,
        shippingAddress: `${validated.shippingAddress}, ${validated.shippingCity}, ${validated.shippingState} ${validated.shippingZip}`,
        orderItems: {
          create: validated.items,
        },
      },
      include: {
        orderItems: { include: { product: true, player: true } },
        team: true,
      },
    });

    return NextResponse.json({
      order,
      clientSecret: paymentIntent.client_secret,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Public checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}