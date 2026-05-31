'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCents } from '@/lib/cart-context';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  shippingName: string | null;
  shippingAddress: string | null;
  team: {
    name: string;
    slug: string;
  };
  orderItems: {
    id: string;
    quantity: number;
    size: string;
    color: string;
    unitPriceCents: number;
    product: {
      name: string;
      imageUrl: string | null;
    };
    player: {
      firstName: string;
      lastName: string;
      number: number | null;
    } | null;
  }[];
}

export default function OrderConfirmedPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          throw new Error('Order not found');
        }
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Order Not Found</h1>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const teamUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${order.team.slug}` : '';

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <main className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-400 text-lg">
            Thank you for supporting {order.team.name}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Order Number</p>
                <p className="text-xl font-bold text-white">{order.orderNumber}</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-900/30 border border-green-700 text-green-400 text-sm font-semibold">
                PAID
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">Items Ordered</h2>
            <div className="space-y-4">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  {item.product.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{item.product.name}</p>
                    {item.player && (
                      <p className="text-sm text-green-400">
                        #{item.player.number} {item.player.firstName} {item.player.lastName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {item.size} / {item.color} / Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-white">
                    {formatCents(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gray-950 border-t border-gray-800">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCents(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax (8%)</span>
                <span>{formatCents(order.taxCents)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{order.shippingCents === 0 ? 'FREE' : formatCents(order.shippingCents)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-700">
                <span>Total</span>
                <span>{formatCents(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Share the Love</h2>
          <div className="flex justify-center gap-4">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(teamUrl)}&quote=${encodeURIComponent(`I just supported ${order.team.name}! Get your gear at ${teamUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just supported ${order.team.name}! Get your gear at ${teamUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition"
            >
              X (Twitter)
            </a>
          </div>
        </div>

        {/* Continue Shopping */}
        <div className="text-center">
          <Link
            href={`/store/${order.team.slug}`}
            className="inline-block px-8 py-4 rounded-lg font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#E63946' }}
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    </div>
  );
}
