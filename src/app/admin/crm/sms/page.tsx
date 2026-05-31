'use client';

import { useEffect, useState, useCallback } from 'react';

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string;
  phone: string | null;
  stage: number;
  isHot: boolean;
}

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface SmsHistoryEntry {
  id: string;
  actionType: string;
  contentPreview: string | null;
  fullContent: string | null;
  messageId: string | null;
  sentBy: string | null;
  responseText: string | null;
  createdAt: string;
  isSuccess: boolean;
}

interface SendResult {
  success: boolean;
  sid?: string;
  timestamp?: string;
  error?: string | null;
}

interface BulkSendResult {
  sent: number;
  failed: number;
  errors: { leadId: string; error: string }[];
  timestamp: string;
}

interface TwilioStatus {
  configured: boolean;
  missingKeys: string[];
}

const MAX_SMS_LENGTH = 1600;
const SINGLE_SMS_LENGTH = 160;

export default function SmsPage() {
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus>({ configured: false, missingKeys: [] });
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | BulkSendResult | null>(null);
  const [history, setHistory] = useState<SmsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const fetchTwilioStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/sms/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTwilioStatus(data);
      }
    } catch {
      setTwilioStatus({ configured: false, missingKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'] });
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/sms/templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/leads?limit=500&hot=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchTwilioStatus();
    fetchTemplates();
    fetchLeads();
  }, [fetchTwilioStatus, fetchTemplates, fetchLeads]);

  useEffect(() => {
    if (!leadSearch.trim()) {
      setFilteredLeads(leads.slice(0, 20));
      return;
    }
    const q = leadSearch.toLowerCase();
    const filtered = leads.filter(l => {
      const name = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
      const school = (l.schoolName || '').toLowerCase();
      const phone = (l.phone || '').toLowerCase();
      return name.includes(q) || school.includes(q) || phone.includes(q);
    }).slice(0, 20);
    setFilteredLeads(filtered);
  }, [leadSearch, leads]);

  function selectTemplate(template: SmsTemplate) {
    setSelectedTemplateId(template.id);
    setMessage(template.content);
  }

  function toggleLead(id: string) {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  }

  async function handleSendSingle(leadId: string) {
    if (!message.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/crm/sms/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, message }),
      });
      const data: SendResult = await res.json();
      setSendResult(data);
      if (data.success) {
        setMessage('');
        setSelectedLeadIds(new Set());
      }
    } catch (e) {
      setSendResult({ success: false, error: 'Network error', timestamp: new Date().toISOString() });
    } finally {
      setSending(false);
    }
  }

  async function handleSendBulk() {
    if (!message.trim() || selectedLeadIds.size === 0) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/crm/sms/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeadIds), message }),
      });
      const data: BulkSendResult = await res.json();
      setSendResult(data);
      if (data.sent > 0) {
        setMessage('');
        setSelectedLeadIds(new Set());
      }
    } catch (e) {
      setSendResult({ sent: 0, failed: 0, errors: [], timestamp: new Date().toISOString(), error: 'Network error' } as BulkSendResult);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      const res = await fetch(`/api/admin/crm/sms/templates?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        if (selectedTemplateId === id) {
          setSelectedTemplateId('');
          setMessage('');
        }
      }
    } catch (e) { console.error(e); }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    setCreatingTemplate(true);
    try {
      const res = await fetch('/api/admin/crm/sms/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTemplateName, content: newTemplateContent }),
      });
      if (res.ok) {
        const template: SmsTemplate = await res.json();
        setTemplates(prev => [template, ...prev]);
        setShowTemplateModal(false);
        setNewTemplateName('');
        setNewTemplateContent('');
      }
    } catch (e) { console.error(e); }
    finally { setCreatingTemplate(false); }
  }

  async function loadHistoryForLead(leadId: string) {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await fetch(`/api/admin/crm/sms/history?leadId=${leadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }

  const charCount = message.length;
  const isOverLimit = charCount > MAX_SMS_LENGTH;
  const segments = charCount === 0 ? 0 : Math.ceil(charCount / SINGLE_SMS_LENGTH);

  const selectedLeads = leads.filter(l => selectedLeadIds.has(l.id));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>SMS</h1>
          {!twilioStatus.configured && (
            <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: '#7f1d1d', color: '#FCA5A5' }}>
              Not Configured
            </span>
          )}
          {twilioStatus.configured && (
            <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: '#14532d', color: '#86efac' }}>
              Ready
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: activeTab === 'compose' ? '#E63946' : '#111111', color: activeTab === 'compose' ? '#FFFFFF' : '#888888' }}
            onClick={() => setActiveTab('compose')}
          >
            Compose
          </button>
          <button
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: activeTab === 'history' ? '#E63946' : '#111111', color: activeTab === 'history' ? '#FFFFFF' : '#888888' }}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
      </div>

      {!twilioStatus.configured && (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
          <div className="text-4xl mb-4">📱</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>SMS Not Configured</h2>
          <p className="text-sm mb-4" style={{ color: '#888888' }}>
            Add your Twilio credentials to enable SMS functionality.
          </p>
          <div className="inline-block text-left p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#888888' }}>Required Environment Variables:</p>
            {twilioStatus.missingKeys.map(key => (
              <p key={key} className="text-xs" style={{ color: '#E63946' }}>• {key}</p>
            ))}
          </div>
        </div>
      )}

      {twilioStatus.configured && activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recipients */}
          <div className="lg:col-span-1 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-4 border-b" style={{ borderColor: '#2A2A2A' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Recipients</h2>
                {selectedLeadIds.size > 0 && (
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}>
                    {selectedLeadIds.size} selected
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-sm" style={{ color: '#888888' }}>No leads found</div>
              ) : (
                <>
                  <div className="p-2 border-b sticky top-0 z-10" style={{ borderColor: '#2A2A2A', backgroundColor: '#111111' }}>
                    <label className="flex items-center gap-2 text-xs" style={{ color: '#888888' }}>
                      <input type="checkbox" checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} />
                      Select all visible
                    </label>
                  </div>
                  {filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="flex items-start gap-3 p-3 border-b cursor-pointer transition-colors"
                      style={{ borderColor: '#2A2A2A' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1A1A1A')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => {
                        if (lead.phone) toggleLead(lead.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => lead.phone && toggleLead(lead.id)}
                        disabled={!lead.phone}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                            {lead.firstName} {lead.lastName}
                          </p>
                          {!lead.phone && <span className="text-xs" style={{ color: '#E63946' }}>No phone</span>}
                          {lead.isHot && <span>🔥</span>}
                        </div>
                        <p className="text-xs truncate" style={{ color: '#888888' }}>{lead.schoolName}</p>
                        <p className="text-xs" style={{ color: '#666666' }}>{lead.phone || 'No phone'}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {selectedLeadIds.size > 0 && (
              <div className="p-3 border-t" style={{ borderColor: '#2A2A2A' }}>
                <button
                  className="w-full py-2 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => setSelectedLeadIds(new Set())}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Right: Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Templates */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Templates</h2>
                <button
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                  onClick={() => setShowTemplateModal(true)}
                >
                  + New Template
                </button>
              </div>
              {templates.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#888888' }}>No templates yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <div key={t.id} className="relative group">
                      <button
                        className="px-3 py-2 text-sm rounded-lg transition-colors"
                        style={{
                          backgroundColor: selectedTemplateId === t.id ? '#E63946' : '#1A1A1A',
                          color: selectedTemplateId === t.id ? '#FFFFFF' : '#888888',
                        }}
                        onClick={() => selectTemplate(t)}
                      >
                        {t.name}
                      </button>
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Composer */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Message</h2>
                <button
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ backgroundColor: showPreview ? '#E63946' : '#1A1A1A', color: showPreview ? '#FFFFFF' : '#888888' }}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>

              {!showPreview ? (
                <textarea
                  className="w-full h-40 px-3 py-2 text-sm rounded-lg resize-none outline-none"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: `1px solid ${isOverLimit ? '#E63946' : '#2A2A2A'}` }}
                  placeholder="Type your message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={MAX_SMS_LENGTH + 100}
                />
              ) : (
                <div
                  className="w-full h-40 px-3 py-2 text-sm rounded-lg overflow-auto"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                >
                  {message || <span style={{ color: '#666666' }}>No message</span>}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-4">
                  <span
                    className="text-xs"
                    style={{ color: isOverLimit ? '#E63946' : charCount > SINGLE_SMS_LENGTH ? '#F59E0B' : '#888888' }}
                  >
                    {charCount} / {MAX_SMS_LENGTH}
                  </span>
                  {charCount > SINGLE_SMS_LENGTH && (
                    <span className="text-xs" style={{ color: '#888888' }}>
                      {segments} segments
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: '#888888' }}>
                  Max 160 chars per segment
                </span>
              </div>
            </div>

            {/* Send Button & Result */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              {selectedLeadIds.size === 1 && (
                <div className="mb-3 text-sm" style={{ color: '#888888' }}>
                  Sending to: {selectedLeads[0]?.firstName} {selectedLeads[0]?.lastName} ({selectedLeads[0]?.phone})
                </div>
              )}
              {selectedLeadIds.size > 1 && (
                <div className="mb-3 text-sm" style={{ color: '#888888' }}>
                  Sending to {selectedLeadIds.size} recipients
                </div>
              )}
              {selectedLeadIds.size === 0 && (
                <div className="mb-3 text-sm" style={{ color: '#888888' }}>
                  Select recipients to send
                </div>
              )}

              <button
                className="w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                disabled={sending || !message.trim() || selectedLeadIds.size === 0 || isOverLimit}
                onClick={selectedLeadIds.size === 1 ? () => handleSendSingle(Array.from(selectedLeadIds)[0]) : handleSendBulk}
              >
                {sending ? 'Sending...' : selectedLeadIds.size === 1 ? 'Send SMS' : `Send to ${selectedLeadIds.size} Recipients`}
              </button>

              {sendResult && (
                <div className="mt-4 p-3 rounded-lg" style={{
                  backgroundColor: ('sent' in sendResult) ? '#14532d' : ('success' in sendResult && sendResult.success ? '#14532d' : '#7f1d1d'),
                  border: `1px solid ${('sent' in sendResult) ? '#22c55e' : ('success' in sendResult && sendResult.success ? '#22c55e' : '#ef4444')}`,
                }}>
                  {'sent' in sendResult ? (
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#86efac' }}>
                        Sent: {(sendResult as BulkSendResult).sent}, Failed: {(sendResult as BulkSendResult).failed}
                      </p>
                      {(sendResult as BulkSendResult).errors.length > 0 && (
                        <div className="mt-2">
                          {(sendResult as BulkSendResult).errors.map((err: { leadId: string; error: string }, i: number) => (
                            <p key={i} className="text-xs" style={{ color: '#fca5a5' }}>• {err.error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#fca5a5' }}>
                      {'error' in sendResult && sendResult.error ? sendResult.error : 'Send failed'}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    {sendResult.timestamp ? new Date(sendResult.timestamp).toLocaleString() : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {twilioStatus.configured && activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-4 border-b" style={{ borderColor: '#2A2A2A' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Recent SMS History</h2>
              <p className="text-xs mt-1" style={{ color: '#888888' }}>Select a lead to view their SMS history</p>
            </div>
            <div className="flex flex-wrap gap-2 p-4" style={{ borderBottom: '1px solid #2A2A2A' }}>
              {leads.filter(l => l.phone).slice(0, 20).map(lead => (
                <button
                  key={lead.id}
                  className="px-3 py-1 text-xs rounded-full transition-colors"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => loadHistoryForLead(lead.id)}
                >
                  {lead.firstName} {lead.lastName}
                </button>
              ))}
            </div>
            {historyLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: '#888888' }}>
                No SMS history yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#2A2A2A' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Message</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Sent By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#888888' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(entry => (
                      <tr key={entry.id} className="border-b" style={{ borderColor: '#2A2A2A' }}>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: entry.isSuccess ? '#14532d' : '#7f1d1d',
                              color: entry.isSuccess ? '#86efac' : '#fca5a5',
                            }}
                          >
                            {entry.isSuccess ? 'Sent' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#FFFFFF' }}>
                          {entry.contentPreview || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#888888' }}>
                          {entry.sentBy || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#888888' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setShowTemplateModal(false)}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#FFFFFF' }}>Create SMS Template</h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#888888' }}>Template Name</label>
                <input
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Follow-up #1"
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#888888' }}>Message Content</label>
                <textarea
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none outline-none h-32"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                  value={newTemplateContent}
                  onChange={e => setNewTemplateContent(e.target.value)}
                  placeholder="Hi {{firstName}}, this is a follow-up..."
                  maxLength={MAX_SMS_LENGTH}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs" style={{ color: '#888888' }}>{newTemplateContent.length}/{MAX_SMS_LENGTH}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 py-2 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => setShowTemplateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                  disabled={creatingTemplate || !newTemplateName.trim() || !newTemplateContent.trim()}
                >
                  {creatingTemplate ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
