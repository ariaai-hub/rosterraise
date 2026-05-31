'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types
interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  sport: string;
  stage: number;
  daysInStage: number;
  isHot: boolean;
  aiScore: number;
  assignedRep: string | null;
  state: string;
  team: string;
  tags: string[];
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  engagementHistory: EngagementEvent[];
  stageHistory: StageHistoryItem[];
}

interface EngagementEvent {
  id: string;
  type: string;
  channel: string;
  touchType: string;
  responseText: string | null;
  createdAt: string;
}

interface StageHistoryItem {
  stage: number;
  timestamp: string;
  note: string | null;
}

interface FiltersState {
  sport: string;
  state: string;
  team: string;
  hotOnly: boolean;
  assignedRep: string;
  aiScoreMin: number;
  aiScoreMax: number;
}

// Stage configuration
const STAGES = [
  { id: 1, name: 'Lead Captured', color: '#888888' },
  { id: 2, name: 'Enriched', color: '#3B82F6' },
  { id: 3, name: 'Touch 1 Sent', color: '#8B5CF6' },
  { id: 4, name: 'Touch 2 Sent', color: '#EC4899' },
  { id: 5, name: 'Touch 3 Sent', color: '#F59E0B' },
  { id: 6, name: 'Responded', color: '#10B981' },
  { id: 7, name: 'Qualified', color: '#06B6D4' },
  { id: 8, name: 'Proposal Sent', color: '#84CC16' },
  { id: 9, name: 'Negotiating', color: '#FBBF24' },
  { id: 10, name: 'Won', color: '#22C55E' },
  { id: 11, name: 'Lost', color: '#EF4444' },
];

// CRM Nav items
const crmNavItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
  { href: '/admin/crm/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/crm/bot', label: 'Bot Activity', icon: '🤖' },
  { href: '/admin/crm/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/crm/team', label: 'Team', icon: '👔' },
  { href: '/admin/crm/settings', label: 'Settings', icon: '⚙️' },
];

// Sport options
const SPORTS = ['Football', 'Basketball', 'Baseball', 'Soccer', 'Track', 'Volleyball', 'Wrestling', 'Softball'];

// States
const STATES = ['CA', 'TX', 'FL', 'NY', 'GA', 'NC', 'OH', 'PA', 'IL', 'MI', 'AZ', 'WA', 'CO', 'TN', 'AL'];

// Teams
const TEAMS = ['All Sports', 'Football', 'Basketball'];

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format time ago
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return formatDate(dateStr);
}

// Get days badge color
function getDaysColor(days: number): string {
  if (days < 3) return '#10B981'; // green
  if (days < 7) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

// Get AI score color
function getAiScoreColor(score: number): string {
  if (score >= 70) return '#10B981'; // green
  if (score >= 40) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

// Get sport color
function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    Football: '#E63946',
    Basketball: '#F59E0B',
    Baseball: '#3B82F6',
    Soccer: '#10B981',
    Track: '#8B5CF6',
    Volleyball: '#EC4899',
    Wrestling: '#6B7280',
    Softball: '#EC4899',
  };
  return colors[sport] || '#888888';
}

// Sortable lead card component
function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} onClick={onClick} />
    </div>
  );
}

// Lead card component
function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: '#1A1A1A',
        border: '1px solid #222222',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#E63946';
        e.currentTarget.style.backgroundColor = '#222222';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#222222';
        e.currentTarget.style.backgroundColor = '#1A1A1A';
      }}
    >
      {/* Header: Name + School */}
      <div className="mb-2">
        <p className="font-semibold text-white text-sm">
          {lead.firstName} {lead.lastName}
        </p>
        <p className="text-xs" style={{ color: '#888888' }}>
          {lead.schoolName}
        </p>
      </div>

      {/* Sport badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: getSportColor(lead.sport) }}
        >
          {lead.sport}
        </span>
        {lead.isHot && (
          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}>
            🔥 HOT
          </span>
        )}
      </div>

      {/* Metrics row */}
      <div className="flex items-center justify-between">
        {/* Days in stage */}
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: '#666666' }}>Days:</span>
          <span
            className="text-xs font-bold"
            style={{ color: getDaysColor(lead.daysInStage) }}
          >
            {lead.daysInStage}
          </span>
        </div>

        {/* AI Score */}
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: '#666666' }}>AI:</span>
          <span
            className="text-xs font-bold"
            style={{ color: getAiScoreColor(lead.aiScore) }}
          >
            {lead.aiScore}
          </span>
        </div>

        {/* Assigned rep */}
        {lead.assignedRep && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#333333', color: '#FFFFFF' }}
            title={lead.assignedRep}
          >
            {lead.assignedRep.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
    </div>
  );
}

// Column header component
function ColumnHeader({ stage, count, totalValue }: { stage: typeof STAGES[0]; count: number; totalValue: number }) {
  return (
    <div
      className="p-3 rounded-t-lg border-b"
      style={{
        backgroundColor: '#0D0D0D',
        borderColor: '#1A1A1A',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-medium text-white text-sm">{stage.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
          >
            {count}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs" style={{ color: '#666666' }}>
        ${(totalValue / 1000).toFixed(0)}K total
      </div>
    </div>
  );
}

// Detail panel component
function DetailPanel({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-md z-50 shadow-2xl overflow-y-auto"
      style={{ backgroundColor: '#111111', borderLeft: '1px solid #1A1A1A' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 p-4 border-b flex items-center justify-between"
        style={{ backgroundColor: '#111111', borderColor: '#1A1A1A' }}
      >
        <div>
          <h2 className="text-lg font-bold text-white">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="text-sm" style={{ color: '#888888' }}>
            {lead.schoolName} • {lead.sport}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E63946';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1A1A1A';
            e.currentTarget.style.color = '#888888';
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#0A0A0A' }}>
            <p className="text-2xl font-bold" style={{ color: getDaysColor(lead.daysInStage) }}>
              {lead.daysInStage}
            </p>
            <p className="text-xs" style={{ color: '#666666' }}>Days</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#0A0A0A' }}>
            <p className="text-2xl font-bold" style={{ color: getAiScoreColor(lead.aiScore) }}>
              {lead.aiScore}
            </p>
            <p className="text-xs" style={{ color: '#666666' }}>AI Score</p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#0A0A0A' }}>
            <p className="text-2xl font-bold" style={{ color: STAGES[lead.stage - 1]?.color || '#FFFFFF' }}>
              {lead.stage}
            </p>
            <p className="text-xs" style={{ color: '#666666' }}>Stage</p>
          </div>
        </div>

        {/* Contact info */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Contact Info</h3>
          <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: '#666666' }}>📧</span>
              <span className="text-sm" style={{ color: '#AAAAAA' }}>{lead.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#666666' }}>📱</span>
              <span className="text-sm" style={{ color: '#AAAAAA' }}>{lead.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#666666' }}>📍</span>
              <span className="text-sm" style={{ color: '#AAAAAA' }}>{lead.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#666666' }}>🏈</span>
              <span className="text-sm" style={{ color: '#AAAAAA' }}>{lead.team}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stage history */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Stage History</h3>
          <div className="space-y-2">
            {lead.stageHistory.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#0A0A0A' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: STAGES[item.stage - 1]?.color || '#888888', color: '#FFFFFF' }}
                  >
                    {STAGES[item.stage - 1]?.name || `Stage ${item.stage}`}
                  </span>
                  <span className="text-xs" style={{ color: '#666666' }}>
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
                {item.note && (
                  <p className="text-xs mt-1" style={{ color: '#888888' }}>{item.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Engagement history */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Engagement History</h3>
          <div className="space-y-2">
            {lead.engagementHistory.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#666666' }}>No engagement events yet</p>
            ) : (
              lead.engagementHistory.map((event, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: '#0A0A0A' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{event.type === 'sent' ? '📤' : '📥'}</span>
                    <span className="text-sm font-medium" style={{ color: '#AAAAAA' }}>
                      {event.channel.toUpperCase()} - {event.touchType}
                    </span>
                  </div>
                  {event.responseText && (
                    <p className="text-xs mt-1" style={{ color: '#10B981' }}>"{event.responseText}"</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>
                    {formatTimeAgo(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t" style={{ borderColor: '#1A1A1A' }}>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
          >
            ✏️ Edit
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
          >
            🏷️ Tag
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
          >
            👤 Assign
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
          >
            📤 Send Touch
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C1292E'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; }}
          >
            ➡️ Advance
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#333333'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
          >
            📦 Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter bar component
function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onClear: () => void;
}) {
  return (
    <div
      className="p-4 rounded-lg mb-6"
      style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Sport dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>Sport</label>
          <select
            value={filters.sport}
            onChange={(e) => onChange({ ...filters, sport: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
          >
            <option value="">All Sports</option>
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </div>

        {/* State dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>State</label>
          <select
            value={filters.state}
            onChange={(e) => onChange({ ...filters, state: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
          >
            <option value="">All States</option>
            {STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Team dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>Team</label>
          <select
            value={filters.team}
            onChange={(e) => onChange({ ...filters, team: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
          >
            {TEAMS.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Rep dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>Assigned Rep</label>
          <select
            value={filters.assignedRep}
            onChange={(e) => onChange({ ...filters, assignedRep: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
          >
            <option value="">All Reps</option>
            <option value="John Smith">John Smith</option>
            <option value="Sarah Johnson">Sarah Johnson</option>
            <option value="Mike Williams">Mike Williams</option>
          </select>
        </div>

        {/* Hot only toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>Hot Only</label>
          <button
            onClick={() => onChange({ ...filters, hotOnly: !filters.hotOnly })}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filters.hotOnly ? '#E63946' : '#1A1A1A',
              color: '#FFFFFF',
              border: '1px solid #2A2A2A',
            }}
          >
            {filters.hotOnly ? '🔥 Yes' : 'All Leads'}
          </button>
        </div>

        {/* AI Score range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#888888' }}>
            AI Score: {filters.aiScoreMin}-{filters.aiScoreMax}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={filters.aiScoreMin}
              onChange={(e) => onChange({ ...filters, aiScoreMin: parseInt(e.target.value) })}
              className="w-20"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={filters.aiScoreMax}
              onChange={(e) => onChange({ ...filters, aiScoreMax: parseInt(e.target.value) })}
              className="w-20"
            />
          </div>
        </div>

        {/* Clear filters */}
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors self-end"
          style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E63946'; e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; e.currentTarget.style.color = '#888888'; }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

// Skeleton card
function SkeletonCard() {
  return (
    <div
      className="p-4 rounded-lg animate-pulse"
      style={{ backgroundColor: '#1A1A1A', border: '1px solid #1A1A1A' }}
    >
      <div className="h-4 w-24 rounded mb-2" style={{ backgroundColor: '#2A2A2A' }} />
      <div className="h-3 w-32 rounded mb-3" style={{ backgroundColor: '#2A2A2A' }} />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded" style={{ backgroundColor: '#2A2A2A' }} />
        <div className="h-5 w-16 rounded" style={{ backgroundColor: '#2A2A2A' }} />
      </div>
    </div>
  );
}

// Main page component
export default function PipelinePage() {
  const pathname = usePathname();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    sport: '',
    state: '',
    team: 'All Sports',
    hotOnly: false,
    assignedRep: '',
    aiScoreMin: 0,
    aiScoreMax: 100,
  });

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.sport) params.append('sport', filters.sport);
      if (filters.state) params.append('state', filters.state);
      if (filters.team !== 'All Sports') params.append('team', filters.team);
      if (filters.hotOnly) params.append('hotOnly', 'true');
      if (filters.assignedRep) params.append('assignedRep', filters.assignedRep);
      params.append('aiScoreMin', filters.aiScoreMin.toString());
      params.append('aiScoreMax', filters.aiScoreMax.toString());

      const res = await fetch(`/api/admin/crm/leads?${params.toString()}`, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Clear filters
  const clearFilters = () => {
    setFilters({
      sport: '',
      state: '',
      team: 'All Sports',
      hotOnly: false,
      assignedRep: '',
      aiScoreMin: 0,
      aiScoreMax: 100,
    });
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const targetStageId = over.id as string;

    // Find the lead and target stage
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const targetStage = parseInt(targetStageId.replace('stage-', ''));
    if (isNaN(targetStage) || targetStage < 1 || targetStage > 11) return;

    // Skip if same stage
    if (lead.stage === targetStage) return;

    // Optimistic update
    const previousLeads = [...leads];
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, stage: targetStage } : l
    ));

    try {
      // PATCH lead stage
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stage: targetStage,
          isHot: targetStage >= 6 ? true : lead.isHot,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update lead');
      }

      // Log engagement event
      await fetch('/api/admin/crm/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          type: 'stage_change',
          channel: 'system',
          touchType: `Moved to ${STAGES[targetStage - 1]?.name || `Stage ${targetStage}`}`,
          responseText: null,
        }),
      });

      // Refresh leads
      fetchLeads();
    } catch (err) {
      // Revert on error
      setLeads(previousLeads);
      setError(err instanceof Error ? err.message : 'Failed to move lead');
    }
  };

  // Group leads by stage
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter(lead => lead.stage === stage.id);
    return acc;
  }, {} as Record<number, Lead[]>);

  // Get active lead for overlay
  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: '#111111', borderColor: '#1A1A1A' }}
      >
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold" style={{ color: '#E63946' }}>
                RosterRaise
              </h1>
              <span className="text-gray-500 text-sm">CRM</span>
            </div>
            
            {/* Nav Items */}
            <nav className="hidden lg:flex items-center gap-1">
              {crmNavItems.map((item) => {
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
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
            Sales Pipeline
          </h1>
          <p className="text-gray-500 mt-1">Drag and drop leads between stages to update their status</p>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />

        {/* Error toast */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: '#2A0A0A', border: '1px solid #E63946' }}
          >
            <span style={{ color: '#E63946' }}>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-lg"
              style={{ color: '#E63946' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-4 overflow-x-auto pb-6"
            style={{ minHeight: '600px' }}
          >
            {STAGES.map((stage) => {
              const stageLeads = leadsByStage[stage.id] || [];
              const totalValue = stageLeads.reduce((sum, l) => sum + (l.aiScore * 100), 0);

              return (
                <div
                  key={stage.id}
                  className="flex flex-col rounded-lg flex-shrink-0"
                  style={{
                    width: '280px',
                    backgroundColor: '#111111',
                    border: '1px solid #1A1A1A',
                  }}
                >
                  {/* Column header */}
                  <ColumnHeader
                    stage={stage}
                    count={stageLeads.length}
                    totalValue={totalValue}
                  />

                  {/* Droppable area */}
                  <SortableContext
                    items={stageLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      id={`stage-${stage.id}`}
                      className="flex-1 p-3 space-y-2 overflow-y-auto"
                      style={{ minHeight: '400px', maxHeight: '600px' }}
                    >
                      {loading ? (
                        <>
                          <SkeletonCard />
                          <SkeletonCard />
                        </>
                      ) : stageLeads.length === 0 ? (
                        <div
                          className="flex items-center justify-center h-32 rounded-lg"
                          style={{ backgroundColor: '#0A0A0A' }}
                        >
                          <p className="text-sm" style={{ color: '#666666' }}>No leads</p>
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <SortableLeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => setSelectedLead(lead)}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeLead ? (
              <div className="opacity-80">
                <LeadCard lead={activeLead} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Detail panel */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelectedLead(null)}
          />
          <DetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        </>
      )}
    </div>
  );
}