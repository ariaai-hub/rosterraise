'use client';

import { useCart, formatCents } from '@/lib/cart-context';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;

  const { items, removeItem, updateQuantity, subtotalCents } = useCart();

  const taxCents = Math.round(subtotalCents * 0.08);
  const shippingCents = subtotalCents >= 10000 ? 0 : 599;
  const totalCents = subtotalCents + taxCents + shippingCents;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Cart is Empty</h1>
          <p className="text-gray-400 mb-6">Add some products to support your team!</p>
          <Link
            href={`/store/${teamSlug}`}
            className="inline-block px-6 py-3 rounded-lg font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#E63946' }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white">Your Cart</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-6 bg-gray-900 rounded-xl p-6 border border-gray-800">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">{item.productName}</h3>
                {item.playerName && (
                  <p className="text-green-400 text-sm">{item.playerName}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-400 mt-1">
                  <span>Size: {item.size}</span>
                  <span>Color: {item.color}</span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-9 rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                    >
                      -
                    </button>
                    <span className="text-white w-10 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-9 h-9 rounded bg-gray-800 text-white hover:bg-gray-700 font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-4 text-gray-400 hover:text-red-400 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-xl font-bold text-white">
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="space-y-3">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{formatCents(subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tax (8%)</span>
              <span>{formatCents(taxCents)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping</span>
              <span>{shippingCents === 0 ? 'FREE' : formatCents(shippingCents)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-white pt-4 border-t border-gray-700">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Link
              href={`/store/${teamSlug}`}
              className="flex-1 py-4 rounded-lg font-bold text-white text-center border border-gray-700 hover:bg-gray-800 transition"
            >
              Continue Shopping
            </Link>
            <button
              onClick={() => router.push(`/store/${teamSlug}/checkout`)}
              className="flex-1 py-4 rounded-lg font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#E63946' }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
