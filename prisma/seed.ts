import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  { name: 'Classic T-Shirt', description: 'Comfortable cotton t-shirt perfect for everyday wear', category: 'Apparel', basePriceCents: 2499, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
  { name: 'Performance Polo', description: 'Moisture-wicking polo shirt for active lifestyles', category: 'Apparel', basePriceCents: 3499, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1625910513413-5fc4e5e40687?w=400' },
  { name: 'Hooded Sweatshirt', description: 'Cozy fleece hooded sweatshirt with kangaroo pocket', category: 'Apparel', basePriceCents: 4999, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'Gray', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400' },
  { name: 'Athletic Shorts', description: 'Lightweight breathable shorts for sports and training', category: 'Apparel', basePriceCents: 2999, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Gray', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1562580783-dc9e4d0ea71e?w=400' },
  { name: 'Compression Leggings', description: 'High-performance compression leggings for maximum support', category: 'Apparel', basePriceCents: 4499, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Purple'], imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400' },
  { name: 'Snapback Cap', description: 'Classic adjustable snapback cap with curved brim', category: 'Accessories', basePriceCents: 2499, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red', 'Hunter Green'], imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400' },
  { name: 'Trucker Cap', description: 'Mesh back trucker cap for breathable comfort', category: 'Accessories', basePriceCents: 2299, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Beanie', description: 'Warm knit beanie perfect for cold weather', category: 'Accessories', basePriceCents: 1999, sizes: ['One Size'], colors: ['Black', 'Gray', 'Navy', 'Red', 'Burgundy'], imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400' },
  { name: 'Wristband Set', description: 'Moisture-wicking wristbands in pack of 2', category: 'Accessories', basePriceCents: 1299, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Drawstring Bag', description: 'Lightweight drawstring backpack for gear transport', category: 'Bags', basePriceCents: 1799, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Duffel Bag', description: 'Spacious athletic duffel bag with multiple pockets', category: 'Bags', basePriceCents: 5999, sizes: ['One Size'], colors: ['Black', 'Navy', 'Gray'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Water Bottle', description: '32oz insulated stainless steel water bottle', category: 'Drinkware', basePriceCents: 2999, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red', 'Teal'], imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
  { name: 'Tumbler Cup', description: '20oz travel tumbler with spill-resistant lid', category: 'Drinkware', basePriceCents: 2499, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1544216717-3bbf52512659?w=400' },
  { name: 'Coffee Mug', description: '11oz ceramic mug perfect for hot beverages', category: 'Drinkware', basePriceCents: 1599, sizes: ['One Size'], colors: ['Black', 'White', 'Navy'], imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400' },
  { name: 'Windbreaker Jacket', description: 'Lightweight packable windbreaker jacket', category: 'Apparel', basePriceCents: 6999, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd628b0?w=400' },
  { name: 'Rain Jacket', description: 'Water-resistant rain jacket with sealed seams', category: 'Apparel', basePriceCents: 8999, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd628b0?w=400' },
  { name: 'Fleece Vest', description: 'Lightweight fleece vest for layering', category: 'Apparel', basePriceCents: 4499, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Gray', 'Hunter Green'], imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400' },
  { name: 'Basketball Jersey', description: 'Mesh basketball jersey with moisture management', category: 'Apparel', basePriceCents: 3999, sizes: ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue', 'Gold'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Football Jersey', description: 'Padded football jersey for on-field performance', category: 'Apparel', basePriceCents: 4499, sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'], colors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400' },
  { name: 'Baseball Jersey', description: 'Classic baseball jersey with button front', category: 'Apparel', basePriceCents: 3999, sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=400' },
  { name: 'Soccer Jersey', description: 'Breathable soccer jersey with performance fabric', category: 'Apparel', basePriceCents: 3799, sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue', 'Lime Green'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Track Jacket', description: 'Classic track jacket with striped details', category: 'Apparel', basePriceCents: 5499, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Red', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd628b0?w=400' },
  { name: 'Compression Shirt', description: 'Compression fit athletic shirt for muscle support', category: 'Apparel', basePriceCents: 3499, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Rash Guard', description: 'UPF 50+ rash guard for water sports', category: 'Apparel', basePriceCents: 3999, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Sport Socks Pack', description: 'Athletic socks in pack of 6 pairs', category: 'Accessories', basePriceCents: 1999, sizes: ['Youth', 'Adult S', 'Adult M', 'Adult L'], colors: ['White', 'Black', 'Navy', 'Mixed'], imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400' },
  { name: 'Headband', description: 'Moisture-wicking sport headband', category: 'Accessories', basePriceCents: 999, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red', 'Pink'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Gym Towel', description: 'Compact gym towel with quick-dry technology', category: 'Accessories', basePriceCents: 1499, sizes: ['One Size'], colors: ['Black', 'Navy', 'Gray', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Equipment Bag', description: 'Large equipment bag with wheels', category: 'Bags', basePriceCents: 7999, sizes: ['One Size'], colors: ['Black', 'Navy', 'Gray'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Lunch Cooler', description: 'Insulated lunch bag with shoulder strap', category: 'Bags', basePriceCents: 2499, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Hunter Green'], imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' },
  { name: 'Phone Arm Band', description: 'Adjustable phone arm band for workouts', category: 'Accessories', basePriceCents: 1799, sizes: ['One Size'], colors: ['Black', 'Gray', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Gym Gloves', description: 'Padded workout gloves with grip support', category: 'Accessories', basePriceCents: 2299, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Gray', 'Pink'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Jump Rope', description: 'Speed jump rope with adjustable length', category: 'Equipment', basePriceCents: 1599, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Pink'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Resistance Bands Set', description: 'Set of 5 resistance bands with carrying bag', category: 'Equipment', basePriceCents: 2999, sizes: ['One Size'], colors: ['Black', 'Multicolor'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Foam Roller', description: 'High-density foam roller for recovery', category: 'Equipment', basePriceCents: 2499, sizes: ['One Size'], colors: ['Black', 'Blue', 'Purple'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Medal Ribbon', description: 'Custom medal ribbon with team colors', category: 'Accessories', basePriceCents: 299, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red', 'Gold', 'Silver'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Lanyard', description: 'Breakaway lanyard with custom badge holder', category: 'Accessories', basePriceCents: 499, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Forest Green'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Car Magnet', description: 'Removable car magnet with team logo', category: 'Accessories', basePriceCents: 999, sizes: ['One Size'], colors: ['White', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Window Decal', description: 'Weatherproof window decal for team spirit', category: 'Accessories', basePriceCents: 799, sizes: ['One Size'], colors: ['White', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Stadium Seat Cushion', description: 'Portable stadium seat with back support', category: 'Accessories', basePriceCents: 3499, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red', 'Royal Blue'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Pins and Patches Set', description: 'Assorted enamel pins and embroidered patches', category: 'Accessories', basePriceCents: 1299, sizes: ['One Size'], colors: ['Multicolor'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Banner', description: 'Large vinyl banner for team events', category: 'Accessories', basePriceCents: 4999, sizes: ['One Size'], colors: ['Black', 'White', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Table Cover', description: 'Adjustable table cover for team events', category: 'Accessories', basePriceCents: 3999, sizes: ['One Size'], colors: ['Black', 'Navy', 'Red'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Trophy', description: 'Custom engraved participation trophy', category: 'Accessories', basePriceCents: 1999, sizes: ['One Size'], colors: ['Gold', 'Silver', 'Bronze'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Keychain', description: 'Metal keychain with custom team design', category: 'Accessories', basePriceCents: 599, sizes: ['One Size'], colors: ['Gold', 'Silver', 'Bronze', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Phone Case', description: 'Slim protective phone case with team colors', category: 'Accessories', basePriceCents: 1999, sizes: ['iPhone 12', 'iPhone 13', 'iPhone 14', 'Samsung S21', 'Samsung S22'], colors: ['Black', 'Navy', 'Red', 'Clear'], imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
  { name: 'Tumor Ball', description: 'Official size and weight tumor ball for training', category: 'Equipment', basePriceCents: 799, sizes: ['One Size'], colors: ['White', 'Yellow'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Football', description: 'Official size composite football', category: 'Equipment', basePriceCents: 4999, sizes: ['Youth', 'Official'], colors: ['Brown', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Basketball', description: 'Official size indoor/outdoor basketball', category: 'Equipment', basePriceCents: 3999, sizes: ['Youth', 'Official'], colors: ['Orange', 'Black'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Soccer Ball', description: 'Size 5 match soccer ball', category: 'Equipment', basePriceCents: 2999, sizes: ['Size 3', 'Size 4', 'Size 5'], colors: ['White', 'Multicolor'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
  { name: 'Baseball', description: 'Official leather baseball', category: 'Equipment', basePriceCents: 1999, sizes: ['One Size'], colors: ['White'], imageUrl: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400' },
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
