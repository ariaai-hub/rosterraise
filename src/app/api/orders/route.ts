import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';

const orderItemSchema = z.object({
  productId: z.string(),
  playerId: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  size: z.string(),
  color: z.string(),
  unitPriceCents: z.number().int().positive(),
  customization: z.object({
    number: z.number().optional(),
    name: z.string().optional(),
  }).optional(),
});

const createOrderSchema = z.object({
  teamId: z.string(),
  playerId: z.string().min(1, 'Player ID is required'),
  items: z.array(orderItemSchema).min(1, 'At least 1 item is required'),
  shippingName: z.string(),
  shippingEmail: z.string().email(),
  shippingAddress: z.string(),
});

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RR-${year}${month}${day}-${random}`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orders;
    if (session.role === 'ADMIN') {
      orders = await prisma.order.findMany({
        include: {
          team: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          orderItems: { include: { product: true, player: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { userId: session.id },
        include: {
          team: true,
          orderItems: { include: { product: true, player: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Validate all products exist
    const productIds = validated.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePriceCents: true, inStock: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    // Validate player exists
    const player = await prisma.player.findUnique({
      where: { id: validated.playerId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 400 });
    }

    // Calculate totals
    const subtotalCents = validated.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
    const shippingCents = subtotalCents >= 10000 ? 0 : 599; // Free shipping over $100
    const totalCents = subtotalCents + taxCents + shippingCents;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        teamId: validated.teamId,
        userId: session.id,
        status: 'PAID', // MVP simulation
        subtotalCents,
        taxCents,
        shippingCents,
        totalCents,
        shippingName: validated.shippingName,
        shippingAddress: validated.shippingAddress,
        orderItems: {
          create: validated.items.map(item => ({
            ...item,
            playerId: validated.playerId,
          })),
        },
      },
      include: {
        orderItems: { include: { product: true, player: true } },
        team: true,
      },
    });

    // Send order confirmation email
    await sendOrderConfirmationEmail(order, validated.shippingEmail);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.totalCents / 100,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
