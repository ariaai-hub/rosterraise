import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getResend } from '@/lib/email';

const orderItemSchema = z.object({
  productId: z.string(),
  playerId: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  size: z.string(),
  color: z.string(),
  unitPriceCents: z.number().int().positive(),
});

const checkoutSchema = z.object({
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

async function sendOrderConfirmationEmail(order: any, userEmail: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping order confirmation email');
    return { success: false };
  }

  const playerName = order.orderItems[0]?.player
    ? `${order.orderItems[0].player.firstName} ${order.orderItems[0].player.lastName}`
    : 'your selected player';

  const html = `
    <h1>Your Order is Confirmed! #${order.orderNumber}</h1>
    <p>Thank you for supporting ${playerName}!</p>
    <h2>Order Details:</h2>
    <ul>
      ${order.orderItems.map((item: any) => `
        <li>${item.product.name} - Size: ${item.size}, Color: ${item.color}, Qty: ${item.quantity} - $${(item.unitPriceCents / 100).toFixed(2)} each</li>
      `).join('')}
    </ul>
    <p><strong>Subtotal:</strong> $${(order.subtotalCents / 100).toFixed(2)}</p>
    <p><strong>Tax:</strong> $${(order.taxCents / 100).toFixed(2)}</p>
    <p><strong>Shipping:</strong> $${(order.shippingCents / 100).toFixed(2)}</p>
    <p><strong>Total:</strong> $${(order.totalCents / 100).toFixed(2)}</p>
    <h3>Shipping Address:</h3>
    <p>${order.shippingName}<br>${order.shippingAddress}</p>
  `;

  try {
    await resend.emails.send({
      from: 'RosterRaise <noreply@rosterraise.com>',
      to: userEmail,
      subject: `Your Order is Confirmed! #${order.orderNumber}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = checkoutSchema.parse(body);

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

    // Create or find user by email
    let user = await prisma.user.findFirst({
      where: { email: validated.shippingEmail },
    });

    if (!user) {
      const nameParts = validated.shippingName.split(' ');
      user = await prisma.user.create({
        data: {
          email: validated.shippingEmail,
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          passwordHash: '$2a$10$placeholder', // Placeholder for MVP
          role: 'PARENT',
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        teamId: validated.teamId,
        userId: user.id,
        status: 'PAID', // MVP simulation - no real Stripe
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

    // Return redirect URL to order-confirmed page
    return NextResponse.json({
      redirectUrl: `/order-confirmed?orderId=${order.id}&orderNumber=${order.orderNumber}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.totalCents / 100,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}