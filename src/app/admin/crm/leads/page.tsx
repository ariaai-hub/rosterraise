'use client';

import { useEffect, useState, useCallback } from 'react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  sport: string | null;
  stage: number;
  isHot: boolean;
  email: string | null;
  phone: string | null;
  facebookUrl: string | null;
  schoolUrl: string | null;
  schoolCity: string | null;
  schoolState: string | null;
  aiScore: number | null;
  daysInStage: number | null;
  aiEstimatedValue: number | null;
  contractValue: number | null;
  leadNotes: string | null;
  tags: string[];
  lastTouchAt: string | null;
  createdAt: string;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface LeadsResponse {
  leads: Lead[];
  pagination: PaginationInfo;
}

const SPORT_COLORS: Record<string, string> = {
  Football: '#E63946',
  Basketball: '#3B82F6',
  Soccer: '#10B981',
  Baseball: '#F97316',
  Other: '#888888',
};

const STAGE_GROUPS: Record<string, string> = {
  '1-4': '#6B7280',
  '5-6': '#F59E0B',
  '7-8': '#3B82F6',
  '9': '#F97316',
  '10': '#10B981',
  '11': '#E63946',
};

function getStageColor(stage: number): string {
  if (stage <= 4) return '#6B7280';
  if (stage <= 6) return '#F59E0B';
  if (stage <= 8) return '#3B82F6';
  if (stage === 9) return '#F97316';
  if (stage === 10) return '#10B981';
  return '#E63946';
}

function getStageGroup(stage: number): string {
  if (stage <= 4) return '1-4';
  if (stage <= 6) return '5-6';
  if (stage <= 8) return '7-8';
  if (stage === 9) return '9';
  if (stage === 10) return '10';
  return '11';
}

function getStageName(stage: number): string {
  const names: Record<number, string> = {
    1: 'New Lead', 2: 'Initial Contact', 3: 'Qualified', 4: 'Proposal Sent',
    5: 'Negotiation', 6: 'Verbal Commit', 7: 'Contract Sent', 8: 'Final Review',
    9: 'One Day', 10: 'Won', 11: 'Lost',
  };
  return names[stage] || `Stage ${stage}`;
}

function getDaysColor(days: number): string {
  if (days < 3) return '#10B981';
  if (days < 7) return '#F59E0B';
  return '#E63946';
}

function getAIScoreColor(score: number | null): string {
  if (score === null) return '#888888';
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#E63946';
}

function formatCurrency(value: number | null): string {
  if (value === null || value === 0) return '-';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatLastTouch(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

interface AddLeadForm {
  firstName: string;
  lastName: string;
  title: string;
  schoolName: string;
  schoolUrl: string;
  schoolCity: string;
  schoolState: string;
  zip: string;
  sport: string;
  email: string;
  phone: string;
  facebookUrl: string;
  sourceChannel: string;
  estimatedStudents: string;
  notes: string;
}

interface EventData {
  id: string;
  channel: string;
  touchType: string;
  responseText: string | null;
  createdAt: string;
  sentBy: string | null;
}

interface StageHistoryEntry {
  stage: number;
  changedAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 50, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [hotOnly, setHotOnly] = useState(false);
  const [aiMin, setAiMin] = useState(0);
  const [aiMax, setAiMax] = useState(100);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadEvents, setLeadEvents] = useState<EventData[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'engagement' | 'stage'>('engagement');
  const [addForm, setAddForm] = useState<AddLeadForm>({
    firstName: '', lastName: '', title: '', schoolName: '', schoolUrl: '',
    schoolCity: '', schoolState: '', zip: '', sport: '', email: '',
    phone: '', facebookUrl: '', sourceChannel: '', estimatedStudents: '200', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (sportFilter) params.set('sport', sportFilter);
      if (stateFilter) params.set('state', stateFilter);
      if (assignedFilter) params.set('assignedTo', assignedFilter);
      if (hotOnly) params.set('hot', 'true');
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      const res = await fetch(`/api/admin/crm/leads?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data: LeadsResponse = await res.json();
        setLeads(data.leads);
        setPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, stageFilter, sportFilter, stateFilter, assignedFilter, hotOnly, pagination.page, pagination.limit]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (selectedLead) {
      fetch(`/api/admin/crm/leads/${selectedLead.id}/events`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(setLeadEvents)
        .catch(() => setLeadEvents([]));
    }
  }, [selectedLead]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  }

  function clearFilters() {
    setSearch(''); setStageFilter(''); setSportFilter(''); setStateFilter(''); setAssignedFilter('');
    setHotOnly(false); setAiMin(0); setAiMax(100);
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, estimatedStudents: parseInt(addForm.estimatedStudents) || 200 }),
      });
      if (res.ok) { setShowAddModal(false); setAddForm({
        firstName: '', lastName: '', title: '', schoolName: '', schoolUrl: '',
        schoolCity: '', schoolState: '', zip: '', sport: '', email: '',
        phone: '', facebookUrl: '', sourceChannel: '', estimatedStudents: '200', notes: '',
      }); fetchLeads(); }
    } finally { setSubmitting(false); }
  }

  async function handleBulkAction(action: string) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'export') {
      const params = new URLSearchParams();
      ids.forEach(id => params.append('ids', id));
      window.open(`/api/admin/crm/leads/export?${params}`, '_blank');
      return;
    }
    await fetch('/api/admin/crm/leads/bulk', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids }),
    });
    setSelectedIds(new Set());
    fetchLeads();
  }

  const sportOptions = ['Football', 'Basketball', 'Soccer', 'Baseball', 'Other'];
  const stateOptions = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const sourceOptions = ['Website', 'Facebook', 'Instagram', 'Referral', 'Cold Call', 'Email Campaign', 'Other'];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Leads</h1>
          <span className="px-3 py-1 text-sm rounded-full" style={{ backgroundColor: '#1A1A1A', color: '#888888' }}>
            {pagination.total}
          </span>
        </div>
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
          onClick={() => setShowAddModal(true)}
        >
          + Add Lead
        </button>
      </div>

      {/* Search */}
<div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        <input
          type="text"
          placeholder="Search by name, school, email..."
          className="w-full pl-12 pr-4 py-3 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">All Stages</option>
          {[1,2,3,4,5,6,7,8,9,10,11].map(s => <option key={s} value={s}>{s} - {getStageName(s)}</option>)}
        </select>
        <select className="px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={sportFilter} onChange={e => setSportFilter(e.target.value)}>
          <option value="">All Sports</option>
          {sportOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Assigned To"
          className="px-3 py-2 text-sm rounded-lg outline-none"
          style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }}
          value={assignedFilter}
          onChange={e => setAssignedFilter(e.target.value)}
        />
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: hotOnly ? '#E63946' : '#111111', color: hotOnly ? '#FFFFFF' : '#888888', border: '1px solid #1A1A1A' }}
          onClick={() => setHotOnly(!hotOnly)}
        >
          🔥 Hot Only
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <span className="text-xs" style={{ color: '#888888' }}>AI Score</span>
          <input type="number" min={0} max={100} className="w-12 text-sm bg-transparent outline-none" style={{ color: '#FFFFFF' }} value={aiMin} onChange={e => setAiMin(Number(e.target.value))} />
          <span style={{ color: '#888888' }}>-</span>
          <input type="number" min={0} max={100} className="w-12 text-sm bg-transparent outline-none" style={{ color: '#FFFFFF' }} value={aiMax} onChange={e => setAiMax(Number(e.target.value))} />
        </div>
<button className="px-4 py-2 text-sm rounded-lg" style={{ color: '#E63946' }} onClick={clearFilters}>Clear Filters</button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-4" style={{ backgroundColor: '#7f1d1d' }}>
          <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{selectedIds.size} selected</span>
          <div className="flex gap-2">
            {['Assign', 'Tag', 'Advance', 'Export CSV', 'Archive'].map(action => (
              <button key={action} className="px-3 py-1 text-xs rounded-lg transition-colors" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#E63946'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = '#1A1A1A'; }}
                onClick={() => handleBulkAction(action.toLowerCase().replace(' ', ''))}
              >{action}</button>
            ))}
 <button className="px-3 py-1 text-xs rounded-lg" style={{ color: '#888888' }} onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll} /></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>School</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Sport</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>AI</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Hot</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Last Touch</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                    {[...Array(11)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#1A1A1A' }} /></td>)}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center" style={{ color: '#888888' }}>No leads found</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="border-b transition-colors" style={{ borderColor: '#1A1A1A' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                  <td className="px-4 py-3">
                    <button className="text-sm font-bold hover:underline" style={{ color: '#FFFFFF' }} onClick={() => setSelectedLead(lead)}>
                      {lead.firstName} {lead.lastName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#FFFFFF' }}>{lead.schoolName || '-'}</td>
                  <td className="px-4 py-3">
                    {lead.sport ? (
                      <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: SPORT_COLORS[lead.sport] || '#888888', color: '#FFFFFF' }}>{lead.sport}</span>
                    ) : <span style={{ color: '#888888' }}>-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStageColor(lead.stage) }} />
                      <span className="text-sm" style={{ color: '#FFFFFF' }}>{lead.stage}</span>
                      <span className="text-xs hidden sm:inline" style={{ color: '#888888' }}>{getStageName(lead.stage)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.assignedUser ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}>
                          {lead.assignedUser.firstName?.[0]}{lead.assignedUser.lastName?.[0]}
                        </div>
                        <span className="text-sm" style={{ color: '#FFFFFF' }}>{lead.assignedUser.firstName}</span>
                      </div>
                    ) : <span className="text-sm" style={{ color: '#888888' }}>Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: getDaysColor(lead.daysInStage || 0) }}>
                    {lead.daysInStage ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAIScoreColor(lead.aiScore) }} />
                      <span className="text-sm" style={{ color: '#FFFFFF' }}>{lead.aiScore ?? '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{lead.isHot ? '🔥' : ''}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>{formatLastTouch(lead.lastTouchAt)}</td>
                  <td className="px-4 py-3 relative">
                    <button className="text-lg" style={{ color: '#888888' }} onClick={() => setShowActionDropdown(showActionDropdown === lead.id ? null : lead.id)}>⋯</button>
                    {showActionDropdown === lead.id && (
                      <div className="absolute right-0 top-8 w-40 rounded-lg shadow-xl z-50 py-1" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
                        {['View', 'Edit', 'Assign', 'Tag', 'Advance Stage', 'Archive'].map(action => (
                          <button key={action} className="w-full px-4 py-2 text-sm text-left transition-colors" style={{ color: '#FFFFFF' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#E63946'; }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
                            onClick={() => { if (action === 'View') setSelectedLead(lead); setShowActionDropdown(null); }}
                          >{action}</button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm" style={{ color: '#888888' }}>
          Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </span>
        <div className="flex items-center gap-2">
          <select className="px-3 py-1 text-sm rounded-lg" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={pagination.limit} onChange={e => setPagination(p => ({ ...p, limit: Number(e.target.value), page: 1 }))}>
<option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button className="px-3 py-1 text-sm rounded-lg" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Prev</button>
          <span className="text-sm" style={{ color: '#FFFFFF' }}>{pagination.page} / {pagination.pages}</span>
          <button className="px-3 py-1 text-sm rounded-lg" style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #1A1A1A' }} disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#FFFFFF' }}>Add New Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>First Name</label><input required className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Last Name</label><input required className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Title</label><input className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>School Name *</label><input required className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.schoolName} onChange={e => setAddForm(f => ({ ...f, schoolName: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>School URL</label><input className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.schoolUrl} onChange={e => setAddForm(f => ({ ...f, schoolUrl: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>City</label><input className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.schoolCity} onChange={e => setAddForm(f => ({ ...f, schoolCity: e.target.value }))} /></div>
                <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>State</label><input maxLength={2} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.schoolState} onChange={e => setAddForm(f => ({ ...f, schoolState: e.target.value.toUpperCase() }))} /></div>
                <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Zip</label><input className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.zip} onChange={e => setAddForm(f => ({ ...f, zip: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Sport</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.sport} onChange={e => setAddForm(f => ({ ...f, sport: e.target.value }))}>
                  <option value="">Select Sport</option>
                  {sportOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Email</label><input type="email" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Phone</label><input type="tel" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Facebook URL</label><input className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.facebookUrl} onChange={e => setAddForm(f => ({ ...f, facebookUrl: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Source Channel</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.sourceChannel} onChange={e => setAddForm(f => ({ ...f, sourceChannel: e.target.value }))}>
                  <option value="">Select Source</option>
                  {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Est. Students</label><input type="number" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.estimatedStudents} onChange={e => setAddForm(f => ({ ...f, estimatedStudents: e.target.value }))} /></div>
              <div><label className="block text-xs mb-1" style={{ color: '#888888' }}>Notes</label><textarea rows={3} className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none" style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #1A1A1A' }} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" className="flex-1 py-2 text-sm rounded-lg" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 text-sm font-medium rounded-lg" style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}>{submitting ? 'Saving...' : 'Add Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedLead(null)}>
          <div className="w-full max-w-md h-full overflow-y-auto p-6" style={{ backgroundColor: '#111111', borderLeft: '1px solid #1A1A1A' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>{selectedLead.firstName} {selectedLead.lastName}</h2>
                <p className="text-sm mt-1" style={{ color: '#888888' }}>{selectedLead.schoolName}</p>
                <div className="flex gap-2 mt-2">
                  {selectedLead.sport && <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: SPORT_COLORS[selectedLead.sport] || '#888888', color: '#FFFFFF' }}>{selectedLead.sport}</span>}
                  <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: getStageColor(selectedLead.stage), color: '#FFFFFF' }}>{getStageName(selectedLead.stage)}</span>
                  {selectedLead.isHot && <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}>🔥 HOT</span>}
                </div>
              </div>
              <button className="text-2xl" style={{ color: '#888888' }} onClick={() => setSelectedLead(null)}>×</button>
            </div>

            {/* Contact */}
            <div className="mb-6 space-y-2">
              {selectedLead.email && <div><a href={`mailto:${selectedLead.email}`} className="text-sm hover:underline" style={{ color: '#3B82F6' }}>{selectedLead.email}</a></div>}
              {selectedLead.phone && <div><a href={`tel:${selectedLead.phone}`} className="text-sm hover:underline" style={{ color: '#3B82F6' }}>{selectedLead.phone}</a></div>}
              {selectedLead.facebookUrl && <div><a href={selectedLead.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: '#3B82F6' }}>Facebook</a></div>}
              {selectedLead.schoolUrl && <div><a href={selectedLead.schoolUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: '#3B82F6' }}>School Website</a></div>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <p className="text-xs mb-1" style={{ color: '#888888' }}>AI Score</p>
                <p className="text-xl font-bold" style={{ color: getAIScoreColor(selectedLead.aiScore) }}>{selectedLead.aiScore ?? '-'}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <p className="text-xs mb-1" style={{ color: '#888888' }}>Days in Stage</p>
                <p className="text-xl font-bold" style={{ color: getDaysColor(selectedLead.daysInStage || 0) }}>{selectedLead.daysInStage ?? '-'}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <p className="text-xs mb-1" style={{ color: '#888888' }}>Est. Value</p>
                <p className="text-xl font-bold" style={{ color: '#FFFFFF' }}>{formatCurrency(selectedLead.aiEstimatedValue)}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <p className="text-xs mb-1" style={{ color: '#888888' }}>Contract Value</p>
                <p className="text-xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(selectedLead.contractValue)}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Tags</h3>
                <button className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#1A1A1A', color: '#888888' }}>+ Tag</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags?.length ? selectedLead.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs rounded" style={{ backgroundColor: '#1A1A1A', color: '#E63946' }}>{tag}</span>
                )) : <span className="text-xs" style={{ color: '#888888' }}>No tags</span>}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>Notes</h3>
              <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#0A0A0A', color: '#888888' }}>{selectedLead.leadNotes || 'No notes yet. Click to add...'}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['Send FB Comment', 'Send FB DM', 'Send Email', 'Create Proposal'].map(action => (
                <button key={action} className="py-2 text-xs rounded-lg transition-colors" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = '#E63946'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = '#1A1A1A'; }}
                >{action}</button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4" style={{ borderColor: '#1A1A1A' }}>
             <button className="px-4 py-2 text-sm font-medium" style={{ color: activeTab === 'engagement' ? '#E63946' : '#888888', borderBottom: activeTab === 'engagement' ? '2px solid #E63946' : '2px solid transparent' }} onClick={() => setActiveTab('engagement')}>Engagement</button>
              <button className="px-4 py-2 text-sm font-medium" style={{ color: activeTab === 'stage' ? '#E63946' : '#888888', borderBottom: activeTab === 'stage' ? '2px solid #E63946' : '2px solid transparent' }} onClick={() => setActiveTab('stage')}>Stage History</button>
            </div>

            {activeTab === 'engagement' ? (
              <div className="space-y-3">
                {leadEvents.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: '#888888' }}>No engagement events</p>
                ) : leadEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{event.channel === 'email' ? '📧' : event.channel === 'fb_dm' ? '💬' : '📝'}</span>
                      <span className="text-xs font-medium" style={{ color: '#FFFFFF' }}>{event.touchType}</span>
                      <span className="text-xs ml-auto" style={{ color: '#888888' }}>{new Date(event.createdAt).toLocaleDateString()}</span>
                    </div>
                    {event.responseText && <p className="text-xs mt-1" style={{ color: '#888888' }}>{event.responseText}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stageHistory.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: '#888888' }}>No stage history</p>
                ) : stageHistory.map((entry, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStageColor(entry.stage) }} />
                      <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{getStageName(entry.stage)}</span>
                      <span className="text-xs ml-auto" style={{ color: '#888888' }}>{new Date(entry.changedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
