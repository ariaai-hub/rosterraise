'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  team: { name: string };
  user: { email: string; firstName: string; lastName: string };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const statusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#F59E0B20', text: '#F59E0B' },
    PAID: { bg: '#3B82F620', text: '#3B82F6' },
    PROCESSING: { bg: '#8B5CF620', text: '#8B5CF6' },
    SHIPPED: { bg: '#10B98120', text: '#10B981' },
    DELIVERED: { bg: '#05966920', text: '#059669' },
    CANCELLED: { bg: '#EF444420', text: '#EF4444' },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
          Orders
        </h1>
        <p className="text-gray-500 mt-1">
          View and manage all customer orders
        </p>
      </div>

      {/* Orders Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#0A0A0A' }}>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Order
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Team
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Total
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888' }}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#222222' }}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#888888' }}>
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent' }}>
                    <td className="px-6 py-4 font-mono" style={{ color: '#E63946' }}>
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4" style={{ color: '#FFFFFF' }}>
                      {order.team?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p style={{ color: '#FFFFFF' }}>
                          {order.user?.firstName} {order.user?.lastName}
                        </p>
                        <p className="text-sm" style={{ color: '#888888' }}>
                          {order.user?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: statusColors[order.status]?.bg || '#88888820',
                          color: statusColors[order.status]?.text || '#888888',
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: '#FFFFFF' }}>
                      {formatPrice(order.totalCents)}
                    </td>
                    <td className="px-6 py-4" style={{ color: '#888888' }}>
                      {formatDate(order.createdAt)}
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
