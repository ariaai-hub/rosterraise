'use client';

import { useCart, formatCents } from '@/lib/cart-context';
import { useParams, useRouter } from 'next/navigation';

export default function CartSidebar() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const { items, isOpen, setCartOpen, removeItem, updateQuantity, totalItems, subtotalCents } = useCart();

  if (!isOpen) return null;

  const taxCents = Math.round(subtotalCents * 0.08);
  const shippingCents = subtotalCents >= 10000 ? 0 : 599;
  const totalCents = subtotalCents + taxCents + shippingCents;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setCartOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0A0A0A] shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Your Cart</h2>
            <p className="text-sm text-gray-400">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 bg-gray-900 rounded-lg p-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{item.productName}</p>
                    {item.playerName && (
                      <p className="text-sm text-green-400">{item.playerName}</p>
                    )}
                    <p className="text-sm text-gray-400">
                      {item.size} / {item.color}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded bg-gray-800 text-white hover:bg-gray-700"
                        >
                          -
                        </button>
                        <span className="text-white w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded bg-gray-800 text-white hover:bg-gray-700"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold text-white">
                        {formatCents(item.unitPriceCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-800 space-y-4">
            <div className="space-y-2">
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
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-800">
                <span>Total</span>
                <span>{formatCents(totalCents)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setCartOpen(false);
                router.push(`/store/${teamSlug}/cart`);
              }}
              className="w-full py-4 rounded-lg font-bold text-white transition hover:opacity-90 border border-gray-700 hover:bg-gray-800"
            >
              View Cart
            </button>
            <button
              onClick={() => {
                setCartOpen(false);
                router.push(`/store/${teamSlug}/checkout`);
              }}
              className="w-full py-4 rounded-lg font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#E63946' }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
