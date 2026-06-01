import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  // APPAREL
  { name: 'T Shirts', description: 'Comfortable cotton t-shirt perfect for everyday wear', category: 'apparel', basePriceCents: 2000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
  { name: 'Polos', description: 'Classic moisture-wicking polo shirt for a polished look', category: 'apparel', basePriceCents: 3000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1625910513413-5fc4e5e40687?w=400' },
  { name: 'Dryfit Shirts', description: 'Performance dryfit shirt for active lifestyles', category: 'apparel', basePriceCents: 2500, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
  { name: 'Hoodies', description: 'Cozy fleece hooded sweatshirt with kangaroo pocket', category: 'apparel', basePriceCents: 3000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'Gray', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400' },
  { name: 'Quart Zip', description: 'Quarter-zip pullover for versatile layering', category: 'apparel', basePriceCents: 4000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd628b0?w=400' },
  { name: 'Shorts', description: 'Lightweight breathable shorts for sports and training', category: 'apparel', basePriceCents: 2500, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Gray', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1562580783-dc9e4d0ea71e?w=400' },
  { name: 'Jogging Pants', description: 'Comfortable jogging pants for relaxed fit', category: 'apparel', basePriceCents: 3000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Gray'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },

  // ACCESSORIES
  { name: 'Hats', description: 'Classic adjustable snapback cap', category: 'accessories', basePriceCents: 2500, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400' },
  { name: 'Keychain', description: 'Metal keychain with custom design', category: 'accessories', basePriceCents: 600, sizes: ['One Size'], colors: ['Gold', 'Silver', 'Bronze', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400' },
  { name: 'Can Koozies', description: 'Insulated can koozie for keeping drinks cold', category: 'accessories', basePriceCents: 1500, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400' },
  { name: 'Magnets', description: 'Removable car magnet with team logo', category: 'accessories', basePriceCents: 600, sizes: ['One Size'], colors: ['White', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Hype Chain', description: 'Premium hype chain for showing team spirit', category: 'accessories', basePriceCents: 2500, sizes: ['One Size'], colors: ['Gold', 'Silver'], imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400' },

  // BAGS
  { name: 'Bookbags', description: 'Lightweight drawstring backpack for gear transport', category: 'bags', basePriceCents: 4000, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Dufflebags', description: 'Spacious athletic duffel bag with multiple pockets', category: 'bags', basePriceCents: 5000, sizes: ['One Size'], colors: ['Black', 'Navy', 'Gray'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },

  // EQUIPMENT
  { name: 'Jerseys', description: 'Mesh basketball jersey with moisture management', category: 'equipment', basePriceCents: 2500, sizes: ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue', 'Gold'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Lightbox', description: 'LED lightbox for vibrant player announcements', category: 'equipment', basePriceCents: 3000, sizes: ['One Size'], colors: ['White'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
];

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rosterraise.com' },
    update: {},
    create: {
      email: 'admin@rosterraise.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create products
  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        inStock: true,
      },
    });
  }
  console.log(`Created ${products.length} products`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
