'use client';

import { useCart } from '@/lib/cart-context';

export default function CartButton() {
  const { totalItems, toggleCart } = useCart();

  return (
    <button
      onClick={() => {
        toggleCart();
      }}
      className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition"
    >
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ backgroundColor: '#E63946', color: 'white' }}>
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </button>
  );
}
