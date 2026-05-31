'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Types
interface Sequence {
  id: string;
  name: string;
  channel: string;
  day: number;
  content?: string;
}

interface SettingsData {
  minimaxApiKey: string;
  gohighlevelApiKey: string;
  gohighlevelLocationId: string;
  resendConfigured: boolean;
  autoEnrich: boolean;
  autoScore: boolean;
  autoReply: boolean;
  escalationThreshold: number;
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

// Highlight template variables in content
function highlightVariables(content: string): string {
  return content.replace(/\{\{([^}]+)\}\}/g, '<span style="color: #3B82F6; font-weight: 500;">{{$1}}</span>');
}

function getChannelIcon(channel: string): string {
  switch (channel) {
    case 'email': return '📧';
    case 'fb_dm': return '💬';
    case 'fb_comment': return '📝';
    default: return '📤';
  }
}

function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'email': return 'Email';
    case 'fb_dm': return 'FB DM';
    case 'fb_comment': return 'FB Comment';
    default: return channel;
  }
}

export default function BotActivitySettingsPage() {
  const pathname = usePathname();

  // Sequences state
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<SettingsData>({
    minimaxApiKey: '',
    gohighlevelApiKey: '',
    gohighlevelLocationId: '',
    resendConfigured: true,
    autoEnrich: true,
    autoScore: true,
    autoReply: true,
    escalationThreshold: 25000,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch sequences
  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/sequences');
      if (res.ok) {
        const data = await res.json();
        setSequences(data);
      }
    } catch (error) {
      console.error('Failed to fetch sequences:', error);
    } finally {
      setLoadingSequences(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSequences();
    fetchSettings();
  }, [fetchSequences, fetchSettings]);

  // Start editing a sequence
  const startEdit = (seq: Sequence) => {
    setEditingId(seq.id);
    setEditContent(seq.content || '');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // Save sequence content
  const saveSequence = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/crm/sequences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setSequences(prev => prev.map(s => s.id === id ? { ...s, content: data.sequence.content } : s));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to save sequence:', error);
    } finally {
      setSavingId(null);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/crm/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        // Show success indicator
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
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
      <main className="p-6 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Bot Settings</h1>
          <p className="text-gray-500 mt-1">Configure sequences, integrations, and outreach behavior</p>
        </div>

        {/* Sequences Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Outreach Sequences</h2>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Edit message templates for each touch point</p>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                    Template Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                    Content Preview
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingSequences ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-3"><div className="h-4 w-8 rounded" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 rounded" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-48 rounded" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                    </tr>
                  ))
                ) : (
                  sequences.map((seq) => (
                    <tr key={seq.id} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium" style={{ color: '#888888' }}>Day {seq.day}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm">{getChannelIcon(seq.channel)}</span>
                        <span className="ml-2 text-sm" style={{ color: '#888888' }}>{getChannelLabel(seq.channel)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{seq.name}</span>
                      </td>
                      <td className="px-4 py-4">
                        {editingId === seq.id ? (
                          <div className="max-w-md">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ backgroundColor: '#0A0A0A', border: '1px solid #E63946', color: '#FFFFFF' }}
                              rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => saveSequence(seq.id)}
                                disabled={savingId === seq.id}
                                className="px-3 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                              >
                                {savingId === seq.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span
                            className="text-sm"
                            style={{ color: '#888888' }}
                            dangerouslySetInnerHTML={{ __html: seq.content ? highlightVariables(seq.content.slice(0, 80) + '...') : '—' }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {editingId !== seq.id && (
                          <button
                            onClick={() => startEdit(seq)}
                            className="px-3 py-1 rounded text-xs font-medium transition-colors"
                            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Template Variables Legend */}
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#666666' }}>Available Template Variables</p>
            <div className="flex flex-wrap gap-2">
              {['{{firstName}}', '{{schoolName}}', '{{sport}}', '{{season}}', '{{sourceGroupName}}'].map((v) => (
                <span
                  key={v}
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#1A1A1A', color: '#3B82F6', fontFamily: 'monospace' }}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Integrations</h2>
            <p className="text-sm mt-1" style={{ color: '#888888' }}>Configure API keys for external services</p>
          </div>

          <div className="space-y-4">
            {/* MiniMax API Key */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: '#FFFFFF' }}>MiniMax API</h3>
                  <p className="text-xs" style={{ color: '#666666' }}>Enrichment, scoring, reply classification, auto-response</p>
                </div>
              </div>
              <div className="flex gap-4">
                <input
                  type="password"
                  value={settings.minimaxApiKey}
                  onChange={(e) => setSettings(s => ({ ...s, minimaxApiKey: e.target.value }))}
                  placeholder="Enter API key..."
                  className="flex-1 px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                />
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-6 py-3 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                >
                  {savingSettings ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* GoHighLevel */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: '#FFFFFF' }}>GoHighLevel</h3>
                  <p className="text-xs" style={{ color: '#666666' }}>CRM integration for lead management</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#888888' }}>API Key</label>
                  <input
                    type="password"
                    value={settings.gohighlevelApiKey}
                    onChange={(e) => setSettings(s => ({ ...s, gohighlevelApiKey: e.target.value }))}
                    placeholder="Enter API key..."
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#888888' }}>Location ID</label>
                  <input
                    type="text"
                    value={settings.gohighlevelLocationId}
                    onChange={(e) => setSettings(s => ({ ...s, gohighlevelLocationId: e.target.value }))}
                    placeholder="Enter location ID..."
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  />
                </div>
              </div>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="mt-4 px-6 py-3 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
              >
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Resend */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
                    <span className="text-xl">📧</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Resend</h3>
                    <p className="text-xs" style={{ color: '#666666' }}>Email delivery service</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                  ✓ Already configured
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Outreach Settings Section */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Outreach Settings</h2>
            <p className="text-sm mt-1" style={{ color: '#888888' }}>Configure automatic behaviors</p>
          </div>

          <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <div className="space-y-6">
              {/* Auto-enrich new leads */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Auto-enrich new leads</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Automatically enrich leads with external data when created</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoEnrich: !s.autoEnrich }))}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: settings.autoEnrich ? '#E63946' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: settings.autoEnrich ? '28px' : '4px' }}
                  />
                </button>
              </div>

              {/* Auto-score daily */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Auto-score daily</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Recalculate lead scores every night</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoScore: !s.autoScore }))}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: settings.autoScore ? '#E63946' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: settings.autoScore ? '28px' : '4px' }}
                  />
                </button>
              </div>

              {/* Auto-reply to Interested */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Auto-reply to Interested</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Automatically send follow-up when lead shows interest</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoReply: !s.autoReply }))}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: settings.autoReply ? '#E63946' : '#2A2A2A' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: settings.autoReply ? '28px' : '4px' }}
                  />
                </button>
              </div>

              {/* Escalation threshold */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Escalation threshold</p>
                    <p className="text-xs mt-1" style={{ color: '#666666' }}>Escalate leads with contract value above this amount</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#E63946' }}>$</span>
                    <input
                      type="number"
                      value={settings.escalationThreshold}
                      onChange={(e) => setSettings(s => ({ ...s, escalationThreshold: parseInt(e.target.value) || 0 }))}
                      className="w-32 px-3 py-2 rounded-lg text-sm text-right"
                      style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t" style={{ borderColor: '#1A1A1A' }}>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-6 py-3 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}