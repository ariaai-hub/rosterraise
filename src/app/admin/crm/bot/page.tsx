'use client';

import { useEffect, useState, useCallback } from 'react';

// Types
interface BotConfig {
  id: string;
  isActive: boolean;
  autoRespondEnabled: boolean;
  aiScoringEnabled: boolean;
  responseDelayMinutes: number;
}

interface BotTemplate {
  id: string;
  name: string;
  triggerEvent: string;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

interface LeadScore {
  id: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string;
  sport: string | null;
  aiScore: number | null;
  stage: number;
  isHot: boolean;
}

interface ScoringResult {
  scored: number;
  errors: number;
}

// Nav items for CRM section
const navItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
  { href: '/admin/crm/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/crm/bot', label: 'Bot', icon: '🤖' },
  { href: '/admin/crm/bot-activity', label: 'Bot Activity', icon: '📊' },
  { href: '/admin/crm/team', label: 'Team', icon: '👔' },
  { href: '/admin/crm/settings', label: 'Settings', icon: '⚙️' },
];

const triggerEventLabels: Record<string, string> = {
  LEAD_CREATED: 'Lead Created',
  STAGE_CHANGED: 'Stage Changed',
  REPLY_RECEIVED: 'Reply Received',
  PROPOSAL_SENT: 'Proposal Sent',
};

const channelLabels: Record<string, string> = {
  EMAIL: '📧 Email',
  SMS: '📱 SMS',
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BotPage() {
  // Config state
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Hot leads for AI scoring panel
  const [hotLeads, setHotLeads] = useState<LeadScore[]>([]);
  const [loadingHotLeads, setLoadingHotLeads] = useState(true);

  // Scoring state
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [scoringInProgress, setScoringInProgress] = useState(false);

  // Modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BotTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    triggerEvent: 'LEAD_CREATED',
    channel: 'EMAIL',
    subject: '',
    body: '',
    isActive: true,
    priority: 0,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/bot/config', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch bot config:', error);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/bot/templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch hot leads
  const fetchHotLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/leads?isHot=true&limit=20', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHotLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to fetch hot leads:', error);
    } finally {
      setLoadingHotLeads(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
    fetchTemplates();
    fetchHotLeads();
  }, [fetchConfig, fetchTemplates, fetchHotLeads]);

  // Save config
  const saveConfig = async (updates: Partial<BotConfig>) => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/crm/bot/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Run AI scoring
  const runAIScoring = async () => {
    setScoringInProgress(true);
    try {
      const res = await fetch('/api/admin/crm/bot/ai-score', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setScoringResult(data);
        fetchHotLeads();
      }
    } catch (error) {
      console.error('Failed to run AI scoring:', error);
    } finally {
      setScoringInProgress(false);
    }
  };

  // Open template modal
  const openTemplateModal = (template?: BotTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        triggerEvent: template.triggerEvent,
        channel: template.channel,
        subject: template.subject || '',
        body: template.body,
        isActive: template.isActive,
        priority: template.priority,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        triggerEvent: 'LEAD_CREATED',
        channel: 'EMAIL',
        subject: '',
        body: '',
        isActive: true,
        priority: 0,
      });
    }
    setShowTemplateModal(true);
  };

  // Save template
  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const url = editingTemplate
        ? '/api/admin/crm/bot/templates'
        : '/api/admin/crm/bot/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';
      const body = editingTemplate
        ? { id: editingTemplate.id, ...templateForm }
        : templateForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (res.ok) {
        setShowTemplateModal(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/admin/crm/bot/templates?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  // Score color
  const getScoreColor = (score: number | null): string => {
    if (score === null) return '#888888';
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    return '#E63946';
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
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold" style={{ color: '#E63946' }}>RosterRaise</h1>
              <span className="text-gray-500 text-sm">CRM</span>
            </div>
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: '#888888' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#888888';
                  }}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Bot Configuration</h1>
            <p className="text-gray-500 mt-1">Configure auto-responders, AI scoring, and message templates</p>
          </div>
          {config && (
            <div className="flex items-center gap-3">
              <span
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: config.isActive ? '#10B98120' : '#E6394620',
                  color: config.isActive ? '#10B981' : '#E63946',
                }}
              >
                {config.isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
          )}
        </div>

        {/* Bot Status Toggle */}
        <div className="mb-8 p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Bot Status</h2>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Enable or disable the entire bot system</p>
            </div>
            <button
              onClick={() => config && saveConfig({ isActive: !config.isActive })}
              disabled={savingConfig}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{ backgroundColor: config?.isActive ? '#10B981' : '#2A2A2A' }}
            >
              <div
                className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: config?.isActive ? '32px' : '4px' }}
              />
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Auto-Respond Settings */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Auto-Respond</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Auto-respond enabled</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Automatically respond to leads</p>
                </div>
                <button
                  onClick={() => config && saveConfig({ autoRespondEnabled: !config.autoRespondEnabled })}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: config?.autoRespondEnabled ? '#E63946' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: config?.autoRespondEnabled ? '28px' : '4px' }}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>
                  Response Delay (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={config?.responseDelayMinutes || 0}
                    onChange={(e) => config && saveConfig({ responseDelayMinutes: parseInt(e.target.value) })}
                    className="flex-1"
                    style={{ accentColor: '#E63946' }}
                  />
                  <span className="text-sm font-mono w-12" style={{ color: '#FFFFFF' }}>
                    {config?.responseDelayMinutes || 0}m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Scoring Settings */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>AI Scoring</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>AI scoring enabled</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Score leads using MiniMax AI</p>
                </div>
                <button
                  onClick={() => config && saveConfig({ aiScoringEnabled: !config.aiScoringEnabled })}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: config?.aiScoringEnabled ? '#E63946' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: config?.aiScoringEnabled ? '28px' : '4px' }}
                  />
                </button>
              </div>

              <div>
                <button
                  onClick={runAIScoring}
                  disabled={scoringInProgress}
                  className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                >
                  {scoringInProgress ? '⏳ Scoring...' : '🎯 Run AI Scoring'}
                </button>
                {scoringResult && (
                  <p className="text-xs mt-2" style={{ color: '#888888' }}>
                    Scored {scoringResult.scored} leads, {scoringResult.errors} errors
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Auto-Response Templates</h2>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Message templates triggered by events</p>
            </div>
            <button
              onClick={() => openTemplateModal()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
            >
              + Add Template
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            {loadingTemplates ? (
              <div className="p-8 text-center" style={{ color: '#888888' }}>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#888888' }}>
                No templates yet. Create your first template to get started.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Trigger</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Channel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: '#888888' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b"
                      style={{ borderColor: '#1A1A1A' }}
                    >
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{template.name}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm" style={{ color: '#888888' }}>
                          {triggerEventLabels[template.triggerEvent] || template.triggerEvent}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm" style={{ color: '#888888' }}>
                          {channelLabels[template.channel] || template.channel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-mono" style={{ color: '#888888' }}>{template.priority}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: template.isActive ? '#10B98120' : '#2A2A2A',
                            color: template.isActive ? '#10B981' : '#888888',
                          }}
                        >
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openTemplateModal(template)}
                          className="px-3 py-1 rounded text-xs font-medium mr-2"
                          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="px-3 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: '#1A1A1A', color: '#E63946' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Trigger Preview & AI Scoring Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trigger Preview */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Trigger Preview</h3>
            <p className="text-sm mb-4" style={{ color: '#888888' }}>What happens when a lead replies</p>
            <div className="space-y-3">
              {[
                { event: 'LEAD_CREATED', desc: 'Welcome email sent via EMAIL' },
                { event: 'STAGE_CHANGED', desc: 'Stage-specific message sent' },
                { event: 'REPLY_RECEIVED', desc: 'AI-generated acknowledgment via EMAIL' },
                { event: 'PROPOSAL_SENT', desc: 'Check-in sequence triggered after 3 days' },
              ].map((item) => {
                const matchingTemplate = templates.find(t => t.triggerEvent === item.event);
                return (
                  <div
                    key={item.event}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: '#E63946' }}>
                        {triggerEventLabels[item.event]}
                      </span>
                      {matchingTemplate ? (
                        <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                          ✓ Template active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                          No template
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: '#666666' }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Scoring Panel - Hot Leads */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>AI Scoring — Hot Leads</h3>
            <p className="text-sm mb-4" style={{ color: '#888888' }}>Highest scoring leads (score ≥ 70)</p>
            {loadingHotLeads ? (
              <div className="text-center py-8" style={{ color: '#888888' }}>Loading...</div>
            ) : hotLeads.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#888888' }}>
                No hot leads found. Run AI scoring to analyze leads.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {hotLeads
                  .filter(l => (l.aiScore || 0) >= 70)
                  .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                  .slice(0, 10)
                  .map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                          {lead.firstName || ''} {lead.lastName || ''}
                        </p>
                        <p className="text-xs truncate" style={{ color: '#888888' }}>
                          {lead.schoolName} • {lead.sport || 'N/A'}
                        </p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center font-bold"
                        style={{ backgroundColor: `${getScoreColor(lead.aiScore)}20`, color: getScoreColor(lead.aiScore) }}
                      >
                        {lead.aiScore || '—'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Template Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <div
            className="w-full max-w-lg rounded-xl p-6"
            style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}
          >
            <h2 className="text-xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  placeholder="e.g., Welcome Email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Trigger Event</label>
                <select
                  value={templateForm.triggerEvent}
                  onChange={(e) => setTemplateForm({ ...templateForm, triggerEvent: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                >
                  <option value="LEAD_CREATED">Lead Created</option>
                  <option value="STAGE_CHANGED">Stage Changed</option>
                  <option value="REPLY_RECEIVED">Reply Received</option>
                  <option value="PROPOSAL_SENT">Proposal Sent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Channel</label>
                <select
                  value={templateForm.channel}
                  onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                >
                  <option value="EMAIL">📧 Email</option>
                  <option value="SMS">📱 SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Subject (for email)</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  placeholder="e.g., Welcome to RosterRaise!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Body</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  rows={5}
                  placeholder="Use {{firstName}}, {{schoolName}}, {{sport}} for personalization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#888888' }}>Priority (higher = used first)</label>
                <input
                  type="number"
                  value={templateForm.priority}
                  onChange={(e) => setTemplateForm({ ...templateForm, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateForm({ ...templateForm, isActive: !templateForm.isActive })}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ backgroundColor: templateForm.isActive ? '#10B981' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: templateForm.isActive ? '22px' : '2px' }}
                  />
                </button>
                <span className="text-sm" style={{ color: '#888888' }}>Active</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={savingTemplate || !templateForm.name || !templateForm.body}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}