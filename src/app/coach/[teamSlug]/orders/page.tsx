'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface OrderItem {
  id: string;
  quantity: number;
  size: string;
  color: string;
  unitPriceCents: number;
  customization: any;
  product: { id: string; name: string; imageUrl: string | null };
  player: { id: string; firstName: string; lastName: string } | null;
}

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
  createdAt: string;
  orderItems: OrderItem[];
  team: { name: string; slug: string };
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef3c7', text: '#92400e' },
  PROCESSING:{ bg: '#dbeafe', text: '#1e40af' },
  SHIPPED:   { bg: '#fed7aa', text: '#9a3412' },
  DELIVERED: { bg: '#d1fae5', text: '#065f46' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#eab308',
  PROCESSING:'#3b82f6',
  SHIPPED:   '#f97316',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const pathname = usePathname();
  const teamSlug = pathname.split('/')[2];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/coach/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = orders.filter(o => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-8" style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage team orders</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === f ? '#E63946' : '#111111',
                color: filter === f ? '#FFFFFF' : '#888888',
                border: filter === f ? 'none' : '1px solid #1A1A1A',
              }}
            >
              {f === 'ALL' ? 'All Orders' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Order #</th>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Customer</th>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Items</th>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Total</th>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Status</th>
                <th className="text-left p-4 text-xs font-medium uppercase" style={{ color: '#888888' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: '#888888' }}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: '#888888' }}>
                    {filter === 'ALL' ? 'No orders yet' : `No ${filter.toLowerCase()} orders`}
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id}>
                    <td
                      colSpan={6}
                      style={{ borderBottom: '1px solid #1A1A1A' }}
                    >
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer transition-colors rounded-lg mx-2 my-1"
                        style={{ backgroundColor: expandedId === order.id ? '#1A1A1A' : 'transparent' }}
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                        onMouseEnter={(e) => {
                          if (expandedId !== order.id) {
                            e.currentTarget.style.backgroundColor = '#141414';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedId !== order.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <td className="font-mono text-sm text-white">{order.orderNumber}</td>
                        <td className="text-gray-400">{order.shippingName || 'Unknown'}</td>
                        <td className="text-gray-400">{order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}</td>
                        <td className="text-white font-medium">{formatCents(order.totalCents)}</td>
                        <td className="p-0">
                          <span
                            className="px-3 py-1 rounded text-xs font-semibold uppercase"
                            style={{
                              backgroundColor: STATUS_STYLES[order.status]?.bg ?? '#1A1A1A',
                              color: STATUS_STYLES[order.status]?.text ?? '#FFFFFF',
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="text-gray-400">{formatDate(order.createdAt)}</td>
                      </div>

                      {/* Expanded Details */}
                      {expandedId === order.id && (
                        <div
                          className="mx-4 mb-4 p-4 rounded-lg"
                          style={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A' }}
                        >
                          <p className="text-xs font-medium uppercase mb-4" style={{ color: '#888888' }}>Order Items</p>
                          <div className="space-y-3">
                            {order.orderItems.map(item => (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 rounded-lg"
                                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
                              >
                                {item.product.imageUrl && (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-white font-medium">{item.product.name}</p>
                                  <p className="text-sm" style={{ color: '#888888' }}>
                                    {item.size} / {item.color} · Qty: {item.quantity}
                                    {item.player && ` · Player: ${item.player.firstName} ${item.player.lastName}`}
                                  </p>
                                </div>
                                <p className="text-white font-medium">
                                  {formatCents(item.unitPriceCents * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end gap-6 pt-4 mt-4 text-sm border-t" style={{ borderColor: '#1A1A1A' }}>
                            <span style={{ color: '#888888' }}>Subtotal: {formatCents(order.subtotalCents)}</span>
                            <span style={{ color: '#888888' }}>Tax: {formatCents(order.taxCents)}</span>
                            <span style={{ color: '#888888' }}>Shipping: {formatCents(order.shippingCents)}</span>
                            <span className="text-white font-bold">Total: {formatCents(order.totalCents)}</span>
                          </div>

                          {order.shippingAddress && (
                            <div className="mt-4 pt-4 text-sm border-t" style={{ borderColor: '#1A1A1A' }}>
                              <p className="text-xs font-medium uppercase mb-1" style={{ color: '#888888' }}>Shipping Address</p>
                              <p style={{ color: '#FFFFFF' }}>
                                {order.shippingName}, {order.shippingAddress}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}