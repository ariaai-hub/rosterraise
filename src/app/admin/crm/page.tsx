'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Types
interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  wonThisMonth: number;
  wonRevenueThisMonth: number;
  pipelineValue: number;
  totalReplies: number;
  totalSent: number;
  replyRate: number;
}

interface ReplyRatesData {
  overall: { sent: number; replied: number; rate: number };
  byChannel: { channel: string; sent: number; replied: number; rate: number }[];
  bySport: { sport: string; sent: number; replied: number; rate: number }[];
  byStage: { stage: number; sent: number; replied: number; rate: number }[];
}

interface TrendsData {
  leadsPerDay: { date: string; count: number }[];
  touchesPerDay: { date: string; count: number }[];
  wonPerWeek: { week: string; count: number }[];
}

interface ActivityEvent {
  id: string;
  channel: string;
  touchType: string;
  responseText: string | null;
  createdAt: string;
  lead: { id: string; schoolName: string; stage: number };
}

interface ScalingSignal {
  title: string;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
}

interface ScalingSignalsData {
  bestChannel: string | null;
  bestSport: string | null;
  topStates: { state: string; rate: number; leads: number }[];
  suggestions: ScalingSignal[];
}

// Nav items
const navItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
  { href: '/admin/crm/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/crm/bot', label: 'Bot Activity', icon: '🤖' },
  { href: '/admin/crm/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/crm/team', label: 'Team', icon: '👔' },
  { href: '/admin/crm/settings', label: 'Settings', icon: '⚙️' },
];

// Skeleton loader
function SkeletonCard() {
  return (
    <div
      className="p-6 rounded-xl animate-pulse"
      style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
    >
      <div className="h-4 w-24 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
      <div className="mt-4 h-8 w-32 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
      <div className="mt-2 h-3 w-20 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
      <div className="p-4 border-b" style={{ borderColor: '#1A1A1A' }}>
        <div className="h-5 w-48 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b" style={{ borderColor: '#1A1A1A' }}>
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
        </div>
      ))}
    </div>
  );
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Channel icon
function getChannelIcon(channel: string): string {
  switch (channel) {
    case 'email': return '📧';
    case 'fb_dm': return '💬';
    case 'fb_comment': return '📝';
    default: return '📤';
  }
}

// Channel label
function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'email': return 'Email';
    case 'fb_dm': return 'FB DM';
    case 'fb_comment': return 'FB Comment';
    default: return channel;
  }
}

// Format date for activity feed
function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}

export default function CRMDashboardPage() {
  const pathname = usePathname();
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [replyRates, setReplyRates] = useState<ReplyRatesData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [scalingSignals, setScalingSignals] = useState<ScalingSignalsData | null>(null);
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReplyRates, setLoadingReplyRates] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingScaling, setLoadingScaling] = useState(true);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/dashboard/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchReplyRates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/dashboard/reply-rates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReplyRates(data);
      }
    } catch (error) {
      console.error('Failed to fetch reply rates:', error);
    } finally {
      setLoadingReplyRates(false);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/dashboard/trends?days=30', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/dashboard/activity?limit=50', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const fetchScalingSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/ai/scaling-signals', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setScalingSignals(data);
      }
    } catch (error) {
      console.error('Failed to fetch scaling signals:', error);
    } finally {
      setLoadingScaling(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStats();
    fetchReplyRates();
    fetchTrends();
    fetchActivity();
    fetchScalingSignals();
  }, [fetchStats, fetchReplyRates, fetchTrends, fetchActivity, fetchScalingSignals]);

  // Auto-refresh activity every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Prepare chart data for reply rate trends
  const getReplyTrendsChartData = () => {
    if (!trends) return [];
    
    // Combine leads per day and touches per day into a unified timeline
    const dateMap = new Map<string, { date: string; email: number; fbDm: number; fbComment: number }>();
    
    // Add placeholder data for last 30 days to show trend lines
    // In a real implementation, the API would return per-channel breakdown
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, email: 0, fbDm: 0, fbComment: 0 });
      }
    }
    
    // Merge actual data
    if (trends.leadsPerDay) {
      trends.leadsPerDay.forEach(({ date, count }) => {
        const entry = dateMap.get(date) || { date, email: 0, fbDm: 0, fbComment: 0 };
        entry.email = count;
        dateMap.set(date, entry);
      });
    }
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: '#111111', borderColor: '#1A1A1A' }}
      >
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-[0.15em]" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                ROSTERRAISE
              </h1>
              <span className="text-gray-500 text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>CRM</span>
            </div>
            
            {/* Nav Items */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors relative"
                    style={{
                      color: isActive ? '#FFFFFF' : '#888888',
                      backgroundColor: isActive ? '#E63946' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#1A1A1A';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#888888';
                      }
                    }}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                    {isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: '#E63946' }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
            CRM COMMAND CENTER
          </h1>
          <p className="text-sm mt-1" style={{ color: '#666666', fontFamily: 'Inter, sans-serif' }}>
            Real-time overview of your sales pipeline and bot activity
          </p>
        </div>

        {/* Top Row - 4 Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loadingStats ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : stats ? (
            <>
              {/* Total Leads */}
              <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">👥</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E63946' }}></div>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                  {stats.totalLeads.toLocaleString()}
                </p>
                <p className="text-sm mt-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Total Leads
                </p>
              </div>

              {/* Active Leads */}
              <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">🔥</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                  {stats.activeLeads.toLocaleString()}
                </p>
                <p className="text-sm mt-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Active Leads (Stage 1-9)
                </p>
              </div>

              {/* Won This Month */}
              <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">🏆</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#10B981', fontFamily: 'Oswald, sans-serif' }}>
                  {stats.wonThisMonth}
                </p>
                <p className="text-sm mt-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Won This Month
                </p>
                <p className="text-xs mt-1" style={{ color: '#10B981', fontFamily: 'Inter, sans-serif' }}>
                  {formatCurrency(stats.wonRevenueThisMonth)}
                </p>
              </div>

              {/* Pipeline Value */}
              <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">💰</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#3B82F6', fontFamily: 'Oswald, sans-serif' }}>
                  {formatCurrency(stats.pipelineValue)}
                </p>
                <p className="text-sm mt-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Pipeline Value
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Reply Intelligence Center + Reply Rate Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Reply Intelligence Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
          >
            <div className="p-4 border-b" style={{ borderColor: '#1A1A1A' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.03em' }}>
                REPLY INTELLIGENCE CENTER
              </h2>
            </div>
            
            {loadingReplyRates ? (
              <div className="p-4">
                <SkeletonTable />
              </div>
            ) : replyRates ? (
<div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                        Channel
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                        Sent
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                        Replies
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Overall row */}
                    <tr className="border-b" style={{ borderColor: '#1A1A1A', backgroundColor: '#0A0A0A' }}>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#FFFFFF' }}>
                        Overall
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>
                        {replyRates.overall.sent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>
                        {replyRates.overall.replied.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold" style={{ color: '#E63946' }}>
                        {formatPercent(replyRates.overall.rate)}
</td>
                    </tr>
                    {/* Channel rows */}
                    {replyRates.byChannel.map((ch, idx) => (
                      <tr
                        key={ch.channel}
                        className="border-b"
                        style={{
                          borderColor: '#1A1A1A',
                          backgroundColor: idx % 2 === 1 ? '#0A0A0A' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3 text-sm" style={{ color: '#FFFFFF' }}>
                          <span className="mr-2">{getChannelIcon(ch.channel)}</span>
                          {getChannelLabel(ch.channel)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>
                          {ch.sent.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>
                          {ch.replied.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: '#FFFFFF' }}>
                          {formatPercent(ch.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* Reply Rate Trend Chart */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.03em' }}>
              30-DAY REPLY RATE TRENDS
            </h2>
            {loadingTrends ? (
              <div className="h-64 flex items-center justify-center">
                <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trends ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={getReplyTrendsChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={10}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid #1A1A1A',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                    }}
                    labelStyle={{ color: '#888888' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', color: '#888888' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="email"
                    name="Email"
                    stroke="#E63946"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#E63946' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fbDm"
                    name="FB DM"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fbComment"
                    name="FB Comment"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Auto-Scaling Signals */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.03em' }}>
            AUTO-SCALING SIGNALS
          </h2>
          {loadingScaling ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: '#111111' }}></div>
              ))}
            </div>
          ) : scalingSignals && scalingSignals.suggestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scalingSignals.suggestions.map((signal, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl relative overflow-hidden"
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1A1A1A',
                    borderLeft: `4px solid ${
                      signal.impact === 'high' ? '#E63946' : signal.impact === 'medium' ? '#F59E0B' : '#10B981'
                    }`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">
                      {signal.impact === 'high' ? '🔴' : signal.impact === 'medium' ? '🟡' : '🟢'}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm" style={{ color: '#FFFFFF' }}>
                        {signal.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: '#888888' }}>
                        {signal.reasoning}
                      </p>
                      <div className="mt-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor:
                              signal.impact === 'high'
                                ? '#E6394620'
                                : signal.impact === 'medium'
                                ? '#F59E0B20'
                                : '#10B98120',
                            color:
                              signal.impact === 'high'
                                ? '#E63946'
                                : signal.impact === 'medium'
                                ? '#F59E0B'
                                : '#10B981',
                          }}
                        >
                          {signal.impact.toUpperCase()} IMPACT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-8 rounded-xl text-center"
              style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
            >
              <p style={{ color: '#888888' }}>No scaling signals available. Ensure AI is configured.</p>
            </div>
          )}
        </div>

        {/* Live Activity Feed + 30-Day Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Live Activity Feed */}
          <div
            className="lg:col-span-2 rounded-xl overflow-hidden"
            style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#1A1A1A' }}>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.03em' }}>
                  LIVE ACTIVITY FEED
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E6394620', color: '#E63946' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#E63946' }}></span>
                  LIVE
                </span>
              </div>
            </div>
            
            {loadingActivity ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: '#1A1A1A' }}></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#1A1A1A' }}></div>
                      <div className="h-3 w-48 mt-1 rounded animate-pulse" style={{ backgroundColor: '#1A1A1A' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length > 0 ? (
              <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                {activity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#0A0A0A' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
                    >
                      {getChannelIcon(event.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                          {event.lead?.schoolName || 'Unknown Lead'}
                        </p>
                        <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#888888' }}>
                          {formatActivityTime(event.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                        {event.touchType} • Stage {event.lead?.stage || 0}
                      </p>
                      {event.responseText && (
                        <p className="text-xs mt-1 truncate" style={{ color: '#10B981' }}>
                          ↩ Replied: {event.responseText.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p style={{ color: '#888888' }}>No recent activity</p>
              </div>
            )}
          </div>

          {/* 30-Day Trends */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', letterSpacing: '0.03em' }}>
              30-DAY TRENDS
            </h2>
            
            {loadingTrends ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: '#111111' }}></div>
                ))}
              </div>
            ) : trends ? (
              <>
                {/* Leads Captured Per Day */}
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
                >
                  <h3 className="text-sm font-medium mb-4" style={{ color: '#FFFFFF' }}>
                    Leads Captured / Day
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={trends.leadsPerDay || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={10}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis stroke="#888888" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111111',
                          border: '1px solid #1A1A1A',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                        }}
                        labelStyle={{ color: '#888888' }}
                      />
                      <Bar dataKey="count" name="Leads" fill="#E63946" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Touches Sent Per Day */}
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
                >
                  <h3 className="text-sm font-medium mb-4" style={{ color: '#FFFFFF' }}>
                    Touches Sent / Day
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={trends.touchesPerDay || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={10}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis stroke="#888888" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111111',
                          border: '1px solid #1A1A1A',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                        }}
                        labelStyle={{ color: '#888888' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Touches"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Won Per Week */}
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
                >
                  <h3 className="text-sm font-medium mb-4" style={{ color: '#FFFFFF' }}>
                    Won Per Week
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={trends.wonPerWeek || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis
                        dataKey="week"
                        stroke="#888888"
                        fontSize={10}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis stroke="#888888" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111111',
                          border: '1px solid #1A1A1A',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                        }}
                        labelStyle={{ color: '#888888' }}
                      />
                      <Bar dataKey="count" name="Won" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
