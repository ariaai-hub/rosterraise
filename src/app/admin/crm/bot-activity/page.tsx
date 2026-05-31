'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Types
interface ActivityEvent {
  id: string;
  channel: string;
  touchType: string;
  responseText: string | null;
  createdAt: string;
  lead: { id: string; schoolName: string; stage: number; firstName?: string };
}

interface QueueData {
  touch1: number;
  touch2: number;
  touch3: number;
  day7: number;
  day10: number;
  total: number;
}

interface HealthData {
  sentToday: number;
  sentLast7Days: number;
  repliedLast7Days: number;
  successRate: number;
  lastError: { message: string; timestamp: string; lead?: string } | null;
}

interface EscalationLead {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  sport: string;
  stage: number;
  contractValue: number;
  isHot: boolean;
  stageChangedAt: string | null;
  aiScore: number | null;
  assignedUser: { firstName: string; lastName: string; email: string } | null;
  escalationReason: string;
  daysInStage: number;
  lastContactedAt: string | null;
}

// Nav items for CRM section
const navItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
  { href: '/admin/crm/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/crm/bot-activity', label: 'Bot Activity', icon: '🤖' },
  { href: '/admin/crm/team', label: 'Team', icon: '👔' },
  { href: '/admin/crm/settings', label: 'Settings', icon: '⚙️' },
];

type TabType = 'activity' | 'queue' | 'health' | 'escalations';

function getChannelIcon(channel: string): string {
  switch (channel) {
    case 'email': return '📧';
    case 'fb_dm': return '💬';
    case 'fb_comment': return '📝';
    default: return '📤';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'sent': case 'delivered': return '#10B981';
    case 'pending': case 'queued': return '#F59E0B';
    case 'failed': case 'error': return '#E63946';
    default: return '#888888';
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

function formatAge(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// Skeleton
function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl animate-pulse" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
      <div className="h-4 w-24 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
      <div className="mt-4 h-8 w-32 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
    </div>
  );
}

export default function BotActivityPage() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  // Data states
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [escalations, setEscalations] = useState<EscalationLead[]>([]);

  // Loading states
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingEscalations, setLoadingEscalations] = useState(true);

  // Filters
  const [channelFilter, setChannelFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch functions
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/dashboard/activity?limit=100', { credentials: 'include' });
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

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/bot/queue', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/bot/health', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const fetchEscalations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/bot/escalations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEscalations(data);
      }
    } catch (error) {
      console.error('Failed to fetch escalations:', error);
    } finally {
      setLoadingEscalations(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActivity();
    fetchQueue();
    fetchHealth();
    fetchEscalations();
  }, [fetchActivity, fetchQueue, fetchHealth, fetchEscalations]);

  // Auto-refresh activity every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Filter activity by channel and time
  const filteredActivity = activity.filter(event => {
    if (channelFilter !== 'all' && event.channel !== channelFilter) return false;
    if (timeRange !== 'all') {
      const now = new Date();
      const eventDate = new Date(event.createdAt);
      const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
      if (timeRange === '1h' && diffHours > 1) return false;
      if (timeRange === '6h' && diffHours > 6) return false;
      if (timeRange === '24h' && diffHours > 24) return false;
      if (timeRange === '7d' && diffHours > 168) return false;
    }
    return true;
  });

  // Queue card data
  const queueCards = queue ? [
    { name: 'Touch 1', subtitle: 'FB Comment', count: queue.touch1, color: '#3B82F6' },
    { name: 'Touch 2', subtitle: 'FB DM', count: queue.touch2, color: '#8B5CF6' },
    { name: 'Touch 3', subtitle: 'Email', count: queue.touch3, color: '#10B981' },
    { name: 'Day 7', subtitle: 'Follow Up', count: queue.day7, color: '#F59E0B' },
    { name: 'Day 10', subtitle: 'Final Follow Up', count: queue.day10, color: '#E63946' },
  ] : [];

  // Escalation reason labels
  const getEscalationReason = (lead: EscalationLead): string => {
    if (lead.isHot) return 'hot_reply';
    if (lead.stage >= 8) return 'negotiating_10d';
    if (lead.contractValue > 2500000) return 'over_25k';
    return 'bot_failed_3x';
  };

  // Render Activity Feed Tab
  const renderActivityFeed = () => (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span style={{ color: '#888888' }} className="text-sm">Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
          >
            <option value="all">All Channels</option>
            <option value="email">📧 Email</option>
            <option value="fb_dm">💬 FB DM</option>
            <option value="fb_comment">📝 FB Comment</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: '#888888' }} className="text-sm">Time:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#1A1A1A', border: '1px solid #E63946' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#E63946' }}></div>
          <span className="text-xs font-medium" style={{ color: '#E63946' }}>LIVE</span>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {loadingActivity ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl animate-pulse" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
                <div className="w-8 h-8 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
                <div className="flex-1 h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1A1A1A' }}></div>
              </div>
            </div>
          ))
        ) : filteredActivity.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#888888' }}>
            No activity in this time range
          </div>
        ) : (
          filteredActivity.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-xl transition-colors"
              style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2A2A2A'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
            >
              <div className="flex items-center gap-4">
                {/* Timestamp */}
                <span className="text-xs font-mono" style={{ color: '#666666', minWidth: '70px' }}>
                  {formatTime(event.createdAt)}
                </span>

                {/* Channel Icon */}
                <span className="text-lg">{getChannelIcon(event.channel)}</span>

                {/* Lead Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium" style={{ color: '#FFFFFF' }}>
                    {event.lead?.firstName || 'Unknown'}
                  </span>
                  <span className="mx-2" style={{ color: '#666666' }}>•</span>
                  <span className="text-sm" style={{ color: '#888888' }}>
                    {event.touchType || event.channel}
                  </span>
                </div>

                {/* Status Indicator */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: event.responseText ? '#10B981' : '#F59E0B' }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render Queue Tab
  const renderQueue = () => (
    <div>
      {/* Total Queue Depth */}
      {queue && (
        <div className="mb-6 p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: '#888888' }}>Total Queue Depth</p>
              <p className="text-4xl font-bold mt-1" style={{ color: '#E63946' }}>{queue.total}</p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: '#888888' }}>Leads awaiting outreach</p>
              <p className="text-lg font-medium mt-1" style={{ color: '#FFFFFF' }}>Auto-processed every hour</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingQueue ? (
          [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          queueCards.map((card) => (
            <div
              key={card.name}
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>{card.name}</p>
                  <p className="text-sm" style={{ color: '#888888' }}>{card.subtitle}</p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}20` }}
                >
                  <span className="text-2xl font-bold" style={{ color: card.color }}>{card.count}</span>
                </div>
              </div>
              <button
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: card.color, color: '#FFFFFF' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Process Now
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render Health Tab
  const renderHealth = () => (
    <div>
      {/* Big Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <p className="text-sm" style={{ color: '#888888' }}>Sent Today</p>
          <p className="text-4xl font-bold mt-2" style={{ color: '#FFFFFF' }}>
            {loadingHealth ? '—' : health?.sentToday ?? 0}
          </p>
        </div>
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <p className="text-sm" style={{ color: '#888888' }}>Success Rate (7d)</p>
          <p className="text-4xl font-bold mt-2" style={{ color: '#10B981' }}>
            {loadingHealth ? '—' : `${health?.successRate ?? 0}%`}
          </p>
        </div>
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <p className="text-sm" style={{ color: '#888888' }}>Last Error</p>
          <p className="text-lg font-medium mt-2" style={{ color: health?.lastError ? '#E63946' : '#10B981' }}>
            {loadingHealth ? '—' : (health?.lastError?.message ?? 'None')}
          </p>
        </div>
      </div>

      {/* 7-Day History */}
      <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>7-Day Send History</h3>
        <div className="flex items-end gap-2 h-40">
          {[...Array(7)].map((_, i) => {
            const height = loadingHealth ? 20 : Math.random() * 80 + 20;
            return (
              <div key={i} className="flex-1 rounded-t-lg transition-all" style={{ backgroundColor: '#E63946', height: `${height}%`, minHeight: '8px' }}></div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          {[...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return (
              <span key={i} className="flex-1 text-center text-xs" style={{ color: '#666666' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            );
          })}
        </div>
      </div>

      {/* Error Log */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Recent Errors</h3>
        {loadingHealth ? (
          <div className="text-center py-8" style={{ color: '#666666' }}>Loading...</div>
        ) : health?.lastError ? (
          <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#1A0A0A', border: '1px solid #E63946' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E63946' }}></div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#E63946' }}>{health.lastError.message}</p>
              <p className="text-xs mt-1" style={{ color: '#666666' }}>
                {health.lastError.lead ? `${health.lastError.lead} • ` : ''}
                {new Date(health.lastError.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: '#10B981' }}>
            ✓ No errors in the last 24 hours
          </div>
        )}
      </div>
    </div>
  );

  // Render Escalations Tab
  const renderEscalations = () => (
    <div>
      {loadingEscalations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : escalations.length === 0 ? (
        <div className="text-center py-12" style={{ backgroundColor: '#111111', borderRadius: '12px', border: '1px solid #1A1A1A' }}>
          <span className="text-4xl">✓</span>
          <p className="mt-4 text-lg" style={{ color: '#10B981' }}>No escalations</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>All leads are under control</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {escalations.map((lead) => (
            <div
              key={lead.id}
              className="p-6 rounded-xl transition-colors"
              style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A', borderLeft: '4px solid #E63946' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                    {lead.firstName} {lead.lastName}
                  </h3>
                  <p className="text-sm" style={{ color: '#888888' }}>{lead.schoolName} • {lead.sport}</p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#E6394620', color: '#E63946' }}>
                  {getEscalationReason(lead).replace('_', ' ')}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs" style={{ color: '#666666' }}>Days in Stage</p>
                  <p className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>{lead.daysInStage}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#666666' }}>AI Score</p>
                  <p className="text-lg font-semibold" style={{ color: lead.aiScore && lead.aiScore > 70 ? '#10B981' : '#F59E0B' }}>
                    {lead.aiScore ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#666666' }}>Contract</p>
                  <p className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                    ${(lead.contractValue / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>

              {/* Assigned Rep */}
              {lead.assignedUser && (
                <p className="text-sm mb-4" style={{ color: '#888888' }}>
                  Assigned to: <span style={{ color: '#FFFFFF' }}>{lead.assignedUser.firstName} {lead.assignedUser.lastName}</span>
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                >
                  View Lead
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888', border: '1px solid #2A2A2A' }}
                >
                  Dismiss
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                >
                  Take Over
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: '#111111', borderColor: '#1A1A1A' }}
      >
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold" style={{ color: '#E63946' }}>RosterRaise</h1>
              <span className="text-gray-500 text-sm">CRM</span>
            </div>
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
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Bot Activity Monitor</h1>
            <p className="text-gray-500 mt-1">Real-time bot performance and queue management</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: '#1A1A1A' }}>
          {([
            { key: 'activity', label: 'Activity Feed', icon: '📡' },
            { key: 'queue', label: 'Queue', icon: '📋' },
            { key: 'health', label: 'Health', icon: '💚' },
            { key: 'escalations', label: 'Escalations', icon: '⚠️' },
          ] as { key: TabType; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab.key ? '#E63946' : '#888888',
                backgroundColor: 'transparent',
              }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: '#E63946' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'activity' && renderActivityFeed()}
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'health' && renderHealth()}
        {activeTab === 'escalations' && renderEscalations()}
      </main>
    </div>
  );
}