import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST() {
  try {
    // 1. Create admin user
    const adminEmail = 'admin@rosterraise.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    let admin;
    if (!existingAdmin) {
      const passwordHash = await hash('Admin123!@#', 12);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          emailVerified: true,
        },
      });
    } else {
      admin = existingAdmin;
    }

    // 2. Get demo team
    const team = await prisma.team.findUnique({ where: { slug: 'demo-team' } });
    if (!team) {
      return NextResponse.json({ error: 'Demo team not found. Run /api/seed first.' }, { status: 400 });
    }

    // 3. Get products for order items
    const products = await prisma.product.findMany({ take: 10 });
    const players = await prisma.player.findMany({ where: { teamId: team.id }, take: 5 });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found. Run /api/seed first.' }, { status: 400 });
    }

    // 4. Create parent user for orders
    const parentPasswordHash = await hash('Parent123!@#', 12);
    let parent = await prisma.user.findUnique({ where: { email: 'parent@test.com' } });
    if (!parent) {
      parent = await prisma.user.create({
        data: {
          email: 'parent@test.com',
          passwordHash: parentPasswordHash,
          firstName: 'Test',
          lastName: 'Parent',
          role: 'PARENT',
          teamId: team.id,
          emailVerified: true,
        },
      });
    }

    // 5. Create dummy orders
    const orderData = [
      {
        orderNumber: 'RR-10001',
        status: 'PAID' as const,
        subtotalCents: 5998,
        taxCents: 540,
        shippingCents: 0,
        totalCents: 6538,
        stripePaymentId: 'pi_test_demo_001',
        shippingName: 'Sarah Johnson',
        shippingAddress: '123 Main St, Austin TX 78701',
        playerIndex: 0,
        productIndices: [0, 1],
        daysAgo: 0,
      },
      {
        orderNumber: 'RR-10002',
        status: 'PAID' as const,
        subtotalCents: 3999,
        taxCents: 360,
        shippingCents: 0,
        totalCents: 4359,
        stripePaymentId: 'pi_test_demo_002',
        shippingName: 'Mike Williams',
        shippingAddress: '456 Oak Ave, Dallas TX 75201',
        playerIndex: 1,
        productIndices: [2],
        daysAgo: 1,
      },
      {
        orderNumber: 'RR-10003',
        status: 'PROCESSING' as const,
        subtotalCents: 7997,
        taxCents: 720,
        shippingCents: 0,
        totalCents: 8717,
        stripePaymentId: 'pi_test_demo_003',
        shippingName: 'Lisa Brown',
        shippingAddress: '789 Pine Rd, Houston TX 77001',
        playerIndex: 2,
        productIndices: [3, 4],
        daysAgo: 2,
      },
      {
        orderNumber: 'RR-10004',
        status: 'SHIPPED' as const,
        subtotalCents: 2999,
        taxCents: 270,
        shippingCents: 0,
        totalCents: 3269,
        stripePaymentId: 'pi_test_demo_004',
        shippingName: 'James Davis',
        shippingAddress: '321 Elm St, San Antonio TX 78201',
        playerIndex: 3,
        productIndices: [5],
        daysAgo: 5,
      },
      {
        orderNumber: 'RR-10005',
        status: 'DELIVERED' as const,
        subtotalCents: 4998,
        taxCents: 450,
        shippingCents: 0,
        totalCents: 5448,
        stripePaymentId: 'pi_test_demo_005',
        shippingName: 'Emily Miller',
        shippingAddress: '654 Maple Dr, Fort Worth TX 76102',
        playerIndex: 4,
        productIndices: [6, 7],
        daysAgo: 10,
      },
      {
        orderNumber: 'RR-10006',
        status: 'PAID' as const,
        subtotalCents: 1999,
        taxCents: 180,
        shippingCents: 0,
        totalCents: 2179,
        stripePaymentId: 'pi_test_demo_006',
        shippingName: 'Chris Thompson',
        shippingAddress: '987 Cedar Ln, Denver CO 80201',
        playerIndex: 0,
        productIndices: [8],
        daysAgo: 3,
      },
      {
        orderNumber: 'RR-10007',
        status: 'PENDING' as const,
        subtotalCents: 8996,
        taxCents: 810,
        shippingCents: 0,
        totalCents: 9806,
        stripePaymentId: null,
        shippingName: 'Amanda Garcia',
        shippingAddress: '147 Birch Way, Phoenix AZ 85001',
        playerIndex: 1,
        productIndices: [9, 0],
        daysAgo: 0,
      },
    ];

    const createdOrders = [];
    for (const o of orderData) {
      const existingOrder = await prisma.order.findUnique({ where: { orderNumber: o.orderNumber } });
      if (existingOrder) {
        createdOrders.push(existingOrder);
        continue;
      }

      const order = await prisma.order.create({
        data: {
          orderNumber: o.orderNumber,
          teamId: team.id,
          userId: parent.id,
          status: o.status,
          subtotalCents: o.subtotalCents,
          taxCents: o.taxCents,
          shippingCents: o.shippingCents,
          totalCents: o.totalCents,
          stripePaymentId: o.stripePaymentId,
          shippingName: o.shippingName,
          shippingAddress: o.shippingAddress,
          createdAt: new Date(Date.now() - o.daysAgo * 24 * 60 * 60 * 1000),
          orderItems: {
            create: o.productIndices.map((pi) => ({
              productId: products[pi % products.length].id,
              playerId: players[o.playerIndex % players.length].id,
              quantity: 1,
              size: ['S', 'M', 'L', 'XL', 'One Size'][o.productIndices.indexOf(pi) % 5],
              color: ['Black', 'Navy', 'White', 'Red', 'Royal Blue'][o.productIndices.indexOf(pi) % 5],
              unitPriceCents: products[pi % products.length].basePriceCents,
            })),
          },
        },
        include: { orderItems: true },
      });
      createdOrders.push(order);
    }

    return NextResponse.json({
      message: 'Admin and dummy orders seeded',
      adminEmail: admin.email,
      adminPassword: 'Admin123!@#',
      ordersCreated: createdOrders.length,
      orders: createdOrders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        total: `$${(o.totalCents / 100).toFixed(2)}`,
        itemCount: (o as any).orderItems?.length ?? 0,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error('Admin seed error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}