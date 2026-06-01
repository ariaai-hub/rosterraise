'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  sport: string;
  status: string;
  createdAt: string;
  users: Array<{ email: string; firstName: string; lastName: string }>;
}

interface Stats {
  totalTeams: number;
  pendingTeams: number;
  totalOrders: number;
  revenueThisMonth: number;
}

// Styled icon components
const TeamsIcon = ({ color = '#E63946' }: { color?: string }) => (
  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg" style={{ backgroundColor: color + '20', color: color, fontFamily: 'Inter, sans-serif' }}>
    T
  </div>
);

const PendingIcon = ({ color = '#F59E0B' }: { color?: string }) => (
  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg" style={{ backgroundColor: color + '20', color: color, fontFamily: 'Inter, sans-serif' }}>
    P
  </div>
);

const OrdersIcon = ({ color = '#3B82F6' }: { color?: string }) => (
  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg" style={{ backgroundColor: color + '20', color: color, fontFamily: 'Inter, sans-serif' }}>
    O
  </div>
);

const RevenueIcon = ({ color = '#10B981' }: { color?: string }) => (
  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg" style={{ backgroundColor: color + '20', color: color, fontFamily: 'Inter, sans-serif' }}>
    $
  </div>
);

// Quick action icons
const ManageTeamsIcon = () => (
  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm" style={{ backgroundColor: '#E63946', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
    T
  </div>
);

const ViewOrdersIcon = () => (
  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
    O
  </div>
);

const PartnersActionIcon = () => (
  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm" style={{ backgroundColor: '#10B981', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
    P
  </div>
);

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalTeams: 0,
    pendingTeams: 0,
    totalOrders: 0,
    revenueThisMonth: 0,
  });
  const [recentPendingTeams, setRecentPendingTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams
        const teamsRes = await fetch('/api/admin/teams?limit=100');
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.teams || [];
          
          const pending = teams.filter((t: Team) => t.status === 'PENDING');
          setRecentPendingTeams(pending.slice(0, 5));
          
          setStats((prev) => ({
            ...prev,
            totalTeams: teamsData.pagination?.total || teams.length,
            pendingTeams: pending.length,
          }));
        }

        // Fetch orders
        const ordersRes = await fetch('/api/orders');
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const orders = ordersData.orders || [];
          
          // Calculate revenue this month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthOrders = orders.filter((o: { createdAt: string }) => 
            new Date(o.createdAt) >= startOfMonth
          );
          const revenue = monthOrders.reduce(
            (sum: number, o: { totalCents: number }) => sum + (o.totalCents || 0),
            0
          );
          
          setStats((prev) => ({
            ...prev,
            totalOrders: orders.length,
            revenueThisMonth: revenue,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpis = [
    {
      label: 'Total Teams',
      value: stats.totalTeams,
      icon: <TeamsIcon />,
      color: '#E63946',
    },
    {
      label: 'Pending Review',
      value: stats.pendingTeams,
      icon: <PendingIcon />,
      color: '#F59E0B',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: <OrdersIcon />,
      color: '#3B82F6',
    },
    {
      label: 'Revenue This Month',
      value: `$${(stats.revenueThisMonth / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <RevenueIcon />,
      color: '#10B981',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
          Dashboard Overview
        </h1>
        <p className="text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Welcome back! Here's what's happening.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-6 rounded-xl transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: '#111111', 
              border: `1px solid ${kpi.color}30`,
              boxShadow: `0 4px 20px ${kpi.color}10`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              {kpi.icon}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: kpi.color }}
              ></div>
            </div>
            <p className="text-3xl font-bold mb-1" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
              {kpi.value}
            </p>
            <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Teams */}
        <div
          className="p-6 rounded-xl"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
              Pending Teams
            </h2>
            <Link
              href="/admin/teams?status=PENDING"
              className="text-sm font-medium hover:underline transition-colors"
              style={{ color: '#E63946', fontFamily: 'Inter, sans-serif' }}
            >
              View all →
            </Link>
          </div>

          {recentPendingTeams.length === 0 ? (
            <div className="text-center py-12" style={{ backgroundColor: '#0A0A0A', borderRadius: '12px' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#222222' }}>
                <span className="text-2xl font-bold" style={{ color: '#666666' }}>0</span>
              </div>
              <p className="text-center py-4" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                No pending teams
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPendingTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-lg transition-colors"
                  style={{ backgroundColor: '#0A0A0A' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
                >
                  <div>
                    <p className="font-medium" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                      {team.name}
                    </p>
                    <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                      {team.sport} • {team.users[0]?.firstName} {team.users[0]?.lastName}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ backgroundColor: '#F59E0B20', color: '#F59E0B', fontFamily: 'Inter, sans-serif' }}
                  >
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}

          {stats.pendingTeams > 0 && (
            <Link
              href="/admin/teams?status=PENDING"
              className="mt-4 block w-full py-3 rounded-lg text-center font-semibold transition-all duration-200"
              style={{ 
                backgroundColor: '#E63946', 
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c92d3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E63946'}
            >
              Review Pending Teams ({stats.pendingTeams})
            </Link>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="p-6 rounded-xl"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
            Quick Actions
          </h2>
          <div className="space-y-4">
            <Link
              href="/admin/teams"
              className="flex items-center gap-4 p-4 rounded-lg transition-colors"
              style={{ backgroundColor: '#0A0A0A' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
            >
              <ManageTeamsIcon />
              <div>
                <p className="font-medium" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  Manage Teams
                </p>
                <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Review, approve, or reject team applications
                </p>
              </div>
            </Link>

            <Link
              href="/admin/orders"
              className="flex items-center gap-4 p-4 rounded-lg transition-colors"
              style={{ backgroundColor: '#0A0A0A' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
            >
              <ViewOrdersIcon />
              <div>
                <p className="font-medium" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  View Orders
                </p>
                <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Track and manage customer orders
                </p>
              </div>
            </Link>

            <Link
              href="/admin/partners"
              className="flex items-center gap-4 p-4 rounded-lg transition-colors"
              style={{ backgroundColor: '#0A0A0A' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
            >
              <PartnersActionIcon />
              <div>
                <p className="font-medium" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  Partner Management
                </p>
                <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Review and manage partner applications
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}