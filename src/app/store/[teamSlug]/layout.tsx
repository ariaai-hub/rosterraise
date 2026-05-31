'use client';

import { CartProvider } from '@/lib/cart-context';
import CartSidebar from '@/components/cart-sidebar';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      {children}
      <CartSidebar />
    </CartProvider>
  );
}
