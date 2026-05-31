'use client';

import { useEffect, useState, useCallback } from 'react';

const LEAD_STAGES = [
  { value: 1, label: 'Lead Captured' },
  { value: 2, label: 'Enriched' },
  { value: 3, label: 'Touch 1 (FB Comment)' },
  { value: 4, label: 'Touch 2 (FB DM)' },
  { value: 5, label: 'Touch 3 (Email)' },
  { value: 6, label: 'Responded' },
  { value: 7, label: 'Qualified' },
  { value: 8, label: 'Proposal Sent' },
  { value: 9, label: 'Negotiating' },
  { value: 10, label: 'Won' },
  { value: 11, label: 'Lost' },
];

interface EmailStep {
  delayDays: number;
  subject: string;
  body: string;
}

interface EmailSequence {
  id: string;
  name: string;
  trigger: string;
  stages: number[];
  steps: EmailStep[];
  isActive: boolean;
  createdAt: string;
  enrollmentCount: number;
  activeEnrollments: number;
  recentEnrollments?: Array<{
    id: string;
    enrolledAt: string;
    currentStep: number;
    nextStepAt: string | null;
    lead: { id: string; firstName: string | null; lastName: string | null; schoolName: string; email: string | null; stage: number };
  }>;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  channel: string;
  actionType: string;
  contentPreview: string | null;
  emailMessageId: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  createdAt: string;
  isAuto: boolean;
  lead: { id: string; firstName: string | null; lastName: string | null; schoolName: string };
}

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string;
  email: string | null;
  stage: number;
  isHot: boolean;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<'sequences' | 'templates' | 'send' | 'activity'>('sequences');
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sequences state
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [sequenceName, setSequenceName] = useState('');
  const [sequenceTrigger, setSequenceTrigger] = useState('AUTO_STAGE_CHANGE');
  const [selectedStages, setSelectedStages] = useState<number[]>([]);
  const [sequenceSteps, setSequenceSteps] = useState<EmailStep[]>([{ delayDays: 0, subject: '', body: '' }]);

  // Templates state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateCategory, setTemplateCategory] = useState('FOLLOW_UP');

  // Send state
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  // Activity state
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/email/sequences', { credentials: 'include' });
      if (res.ok) setSequences(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/email/templates', { credentials: 'include' });
      if (res.ok) setTemplates(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/leads?limit=500', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeads((data.leads || []).filter((l: Lead) => l.email));
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchActivity = useCallback(async (page = 1) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/events?channel=EMAIL&page=${page}&limit=50`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setActivity(prev => page === 1 ? data.events || [] : [...prev, ...(data.events || [])]);
      }
    } catch (e) { console.error(e); }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'sequences') fetchSequences();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'send') { fetchLeads(); fetchTemplates(); }
    if (activeTab === 'activity') fetchActivity();
  }, [activeTab, fetchSequences, fetchTemplates, fetchLeads, fetchActivity]);

  function openNewSequence() {
    setEditingSequence(null);
    setSequenceName('');
    setSequenceTrigger('AUTO_STAGE_CHANGE');
    setSelectedStages([3, 4, 5]);
    setSequenceSteps([{ delayDays: 0, subject: '', body: '' }]);
    setShowSequenceModal(true);
  }

  function openEditSequence(seq: EmailSequence) {
    setEditingSequence(seq);
    setSequenceName(seq.name);
    setSequenceTrigger(seq.trigger);
    setSelectedStages(seq.stages || []);
    setSequenceSteps(seq.steps?.length ? seq.steps : [{ delayDays: 0, subject: '', body: '' }]);
    setShowSequenceModal(true);
  }

  async function saveSequence(e: React.FormEvent) {
    e.preventDefault();
    if (!sequenceName.trim() || sequenceSteps.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const url = editingSequence
        ? `/api/admin/crm/email/sequences/${editingSequence.id}`
        : '/api/admin/crm/email/sequences';
      const method = editingSequence ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sequenceName,
          trigger: sequenceTrigger,
          stages: selectedStages,
          steps: sequenceSteps,
        }),
      });
      if (res.ok) {
        setShowSequenceModal(false);
        fetchSequences();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function deleteSequence(id: string) {
    if (!confirm('Delete this sequence?')) return;
    try {
      await fetch(`/api/admin/crm/email/sequences/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchSequences();
    } catch { setError('Failed to delete'); }
  }

  async function toggleSequenceActive(seq: EmailSequence) {
    try {
      await fetch(`/api/admin/crm/email/sequences/${seq.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !seq.isActive }),
      });
      fetchSequences();
    } catch { setError('Failed to update'); }
  }

  async function enrollLeadInSequence(leadId: string, sequenceId: string) {
    try {
      await fetch('/api/admin/crm/email/sequences/enroll', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, sequenceId }),
      });
      alert('Enrolled successfully!');
    } catch { alert('Failed to enroll'); }
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || !templateSubject.trim() || !templateBody.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = editingTemplate
        ? `/api/admin/crm/email/templates/${editingTemplate.id}`
        : '/api/admin/crm/email/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, subject: templateSubject, body: templateBody, category: templateCategory }),
      });
      if (res.ok) {
        setShowTemplateModal(false);
        fetchTemplates();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch { setError('Network error'); }
    setLoading(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/admin/crm/email/templates?id=${id}`, { method: 'DELETE', credentials: 'include' });
      fetchTemplates();
    } catch { setError('Failed to delete'); }
  }

  function selectTemplateForSend(tmpl: EmailTemplate) {
    setSelectedTemplateId(tmpl.id);
    setSendSubject(tmpl.subject);
    setSendBody(tmpl.body);
  }

  async function handleSendEmail() {
    if (!selectedLeadId || !sendSubject.trim() || !sendBody.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/crm/email/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, subject: sendSubject, body: sendBody }),
      });
      const data: SendResult = await res.json();
      setSendResult(data);
      if (data.success) {
        setSendSubject('');
        setSendBody('');
        setSelectedLeadId('');
        setSelectedTemplateId('');
      }
    } catch {
      setSendResult({ success: false, error: 'Network error' });
    }
    setSending(false);
  }

  function addStep() {
    setSequenceSteps(prev => [...prev, { delayDays: 0, subject: '', body: '' }]);
  }

  function removeStep(index: number) {
    setSequenceSteps(prev => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof EmailStep, value: string | number) {
    setSequenceSteps(prev => prev.map((step, i) => i === index ? { ...step, [field]: value } : step));
  }

  function toggleStage(stage: number) {
    setSelectedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const CATEGORIES = ['FOLLOW_UP', 'INTRODUCTION', 'PROPOSAL', 'CLOSING'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Email Sequences</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['sequences', 'templates', 'send', 'activity'] as const).map(tab => (
          <button
            key={tab}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize"
            style={{
              backgroundColor: activeTab === tab ? '#E63946' : '#111111',
              color: activeTab === tab ? '#FFFFFF' : '#888888',
              border: activeTab === tab ? 'none' : '1px solid #2A2A2A',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#7f1d1d', color: '#FCA5A5' }}>
          {error}
          <button className="ml-4 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* SEQUENCES TAB */}
      {activeTab === 'sequences' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
              onClick={openNewSequence}
            >
              + New Sequence
            </button>
          </div>

          {sequences.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>No Email Sequences</h2>
              <p className="text-sm mb-4" style={{ color: '#888888' }}>Create your first automated email sequence</p>
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                onClick={openNewSequence}
              >
                Create Sequence
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sequences.map(seq => (
                <div key={seq.id} className="rounded-xl p-5" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold" style={{ color: '#FFFFFF' }}>{seq.name}</h3>
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ backgroundColor: seq.isActive ? '#14532d' : '#374151', color: seq.isActive ? '#86efac' : '#9CA3AF' }}
                        >
                          {seq.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: '#888888' }}>
                        <span>{seq.steps?.length || 0} steps</span>
                        <span>{seq.activeEnrollments || 0} enrolled</span>
                        <span>Trigger: {seq.trigger}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg"
                        style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                        onClick={() => enrollLeadInSequence(leads[0]?.id, seq.id)}
                        disabled={!leads.length || !seq.isActive}
                      >
                        Enroll Lead
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg"
                        style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                        onClick={() => toggleSequenceActive(seq)}
                      >
                        {seq.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg"
                        style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                        onClick={() => openEditSequence(seq)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs rounded-lg"
                        style={{ backgroundColor: '#7f1d1d', color: '#FCA5A5' }}
                        onClick={() => deleteSequence(seq.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Steps Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(seq.steps || []).map((step, i) => (
                      <div key={i} className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium" style={{ color: '#E63946' }}>Step {i + 1}</span>
                          <span style={{ color: '#666666' }}>Day +{step.delayDays}</span>
                        </div>
                        <div className="font-medium truncate" style={{ color: '#FFFFFF' }}>{step.subject}</div>
                        <div className="truncate mt-1" style={{ color: '#666666' }}>{step.body}</div>
                      </div>
                    ))}
                  </div>

                  {/* Trigger Stages */}
                  {seq.stages && seq.stages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="text-xs" style={{ color: '#666666' }}>Triggers on:</span>
                      {seq.stages.map(stage => (
                        <span key={stage} className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#1A1A1A', color: '#888888' }}>
                          Stage {stage}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
              onClick={() => { setEditingTemplate(null); setTemplateName(''); setTemplateSubject(''); setTemplateBody(''); setTemplateCategory('FOLLOW_UP'); setShowTemplateModal(true); }}
            >
              + New Template
            </button>
          </div>

          <div className="grid gap-3">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{tmpl.name}</span>
                      <span className="px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#1A1A1A', color: '#888888' }}>{tmpl.category}</span>
                    </div>
                    <div className="text-xs mb-1 truncate" style={{ color: '#E63946' }}>Subject: {tmpl.subject}</div>
                    <div className="text-xs truncate" style={{ color: '#666666' }}>{tmpl.body.substring(0, 100)}...</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      className="px-3 py-1.5 text-xs rounded-lg"
                      style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                      onClick={() => { setSelectedTemplateId(tmpl.id); setSendSubject(tmpl.subject); setSendBody(tmpl.body); setActiveTab('send'); }}
                    >
                      Use
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs rounded-lg"
                      style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                      onClick={() => { setEditingTemplate(tmpl); setTemplateName(tmpl.name); setTemplateSubject(tmpl.subject); setTemplateBody(tmpl.body); setTemplateCategory(tmpl.category); setShowTemplateModal(true); }}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs rounded-lg"
                      style={{ backgroundColor: '#7f1d1d', color: '#FCA5A5' }}
                      onClick={() => deleteTemplate(tmpl.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>No Templates</h2>
                <p className="text-sm" style={{ color: '#888888' }}>Create reusable email templates</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEND TAB */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Selection */}
          <div className="rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-4 border-b" style={{ borderColor: '#2A2A2A' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Select Lead</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {leads.map(lead => (
                <div
                  key={lead.id}
                  className="p-3 border-b cursor-pointer transition-colors"
                  style={{ borderColor: '#2A2A2A' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1A1A1A')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ borderColor: selectedLeadId === lead.id ? '#E63946' : '#2A2A2A', backgroundColor: selectedLeadId === lead.id ? '#E63946' : 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                          {lead.firstName} {lead.lastName}
                        </p>
                        {lead.isHot && <span>🔥</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: '#888888' }}>{lead.schoolName}</p>
                      <p className="text-xs" style={{ color: '#666666' }}>{lead.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Template Quick Select */}
            {templates.length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#FFFFFF' }}>Quick Fill from Template</h2>
                <div className="flex flex-wrap gap-2">
                  {templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                      style={{
                        backgroundColor: selectedTemplateId === tmpl.id ? '#E63946' : '#1A1A1A',
                        color: selectedTemplateId === tmpl.id ? '#FFFFFF' : '#888888',
                      }}
                      onClick={() => selectTemplateForSend(tmpl)}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#FFFFFF' }}>Subject</h2>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                placeholder="Email subject..."
                value={sendSubject}
                onChange={e => setSendSubject(e.target.value)}
              />
              <p className="text-xs mt-2" style={{ color: '#666666' }}>Variables: {'{{firstName}}'}, {'{{schoolName}}'}, {'{{sport}}'}, {'{{sourceGroupName}}'}</p>
            </div>

            {/* Body */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#FFFFFF' }}>Body</h2>
              <textarea
                className="w-full h-48 px-3 py-2 text-sm rounded-lg resize-none outline-none"
                style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                placeholder="Email body..."
                value={sendBody}
                onChange={e => setSendBody(e.target.value)}
              />
            </div>

            {/* Preview with selected lead */}
            {selectedLead && sendBody && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Preview</h2>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#14532d', color: '#86efac' }}>Live Preview</span>
                </div>
                <div className="text-xs mb-2" style={{ color: '#888888' }}>
                  To: {selectedLead.firstName} {selectedLead.lastName} &lt;{selectedLead.email}&gt;
                </div>
                <div className="text-xs mb-3 font-medium" style={{ color: '#E63946' }}>
                  Subject: {sendSubject.replace(/\{\{firstName\}\}/g, selectedLead.firstName || '').replace(/\{\{schoolName\}\}/g, selectedLead.schoolName)}
                </div>
                <div
                  className="text-sm p-3 rounded-lg whitespace-pre-wrap"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                >
                  {sendBody
                    .replace(/\{\{firstName\}\}/g, selectedLead.firstName || '')
                    .replace(/\{\{lastName\}\}/g, selectedLead.lastName || '')
                    .replace(/\{\{schoolName\}\}/g, selectedLead.schoolName)
                    .replace(/\{\{email\}\}/g, selectedLead.email || '')}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              className="w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
              disabled={!selectedLeadId || !sendSubject.trim() || !sendBody.trim() || sending}
              onClick={handleSendEmail}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>

            {sendResult && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: sendResult.success ? '#14532d' : '#7f1d1d',
                  color: sendResult.success ? '#86efac' : '#FCA5A5',
                }}
              >
                {sendResult.success
                  ? `Email sent successfully! Message ID: ${sendResult.messageId}`
                  : `Failed: ${sendResult.error}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-4 border-b" style={{ borderColor: '#2A2A2A' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Email Activity</h2>
            </div>
            {activity.length === 0 && !activityLoading ? (
              <div className="p-12 text-center">
                <p className="text-sm" style={{ color: '#888888' }}>No email activity yet</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#2A2A2A' }}>
                {activity.map(event => (
                  <div key={event.id} className="p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {event.actionType === 'EMAIL_SENT' && <span className="text-lg">✉️</span>}
                      {event.actionType === 'EMAIL_OPENED' && <span className="text-lg">👁️</span>}
                      {event.actionType === 'EMAIL_REPLIED' && <span className="text-lg">💬</span>}
                      {event.actionType === 'EMAIL_CLICKED' && <span className="text-lg">🖱️</span>}
                      {event.actionType === 'EMAIL_BOUNCED' && <span className="text-lg">❌</span>}
                      {event.actionType === 'SEQUENCE_ENROLLED' && <span className="text-lg">🎯</span>}
                      {!['EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_REPLIED', 'EMAIL_CLICKED', 'EMAIL_BOUNCED', 'SEQUENCE_ENROLLED'].includes(event.actionType) && <span className="text-lg">📧</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 text-xs rounded-full font-medium"
                          style={{
                            backgroundColor: event.actionType === 'EMAIL_SENT' ? '#1e3a5f' : event.actionType === 'EMAIL_OPENED' ? '#14532d' : event.actionType === 'EMAIL_REPLIED' ? '#166534' : event.actionType === 'EMAIL_BOUNCED' ? '#7f1d1d' : '#374151',
                            color: event.actionType === 'EMAIL_SENT' ? '#93C5FD' : event.actionType === 'EMAIL_OPENED' ? '#86efac' : event.actionType === 'EMAIL_REPLIED' ? '#86efac' : event.actionType === 'EMAIL_BOUNCED' ? '#FCA5A5' : '#D1D5DB',
                          }}
                        >
                          {event.actionType.replace(/_/g, ' ')}
                        </span>
                        {event.isAuto && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1A1A1A', color: '#666666' }}>Auto</span>}
                      </div>
                      <p className="text-sm truncate" style={{ color: '#FFFFFF' }}>
                        {event.lead?.firstName} {event.lead?.lastName} — {event.lead?.schoolName}
                      </p>
                      {event.contentPreview && (
                        <p className="text-xs truncate mt-1" style={{ color: '#888888' }}>{event.contentPreview}</p>
                      )}
                      {event.openedAt && (
                        <p className="text-xs mt-1" style={{ color: '#666666' }}>Opened: {new Date(event.openedAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-xs flex-shrink-0" style={{ color: '#666666' }}>
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activityLoading && (
              <div className="p-4 text-center text-sm" style={{ color: '#888888' }}>Loading...</div>
            )}
            {!activityLoading && activity.length >= 50 && (
              <div className="p-4 text-center">
                <button
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => fetchActivity(activityPage + 1)}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEQUENCE MODAL */}
      {showSequenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-6 border-b" style={{ borderColor: '#2A2A2A' }}>
              <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>{editingSequence ? 'Edit Sequence' : 'New Email Sequence'}</h2>
            </div>
            <form onSubmit={saveSequence}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Sequence Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    placeholder="e.g. Lead Nurture Sequence"
                    value={sequenceName}
                    onChange={e => setSequenceName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Trigger Type</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    value={sequenceTrigger}
                    onChange={e => setSequenceTrigger(e.target.value)}
                  >
                    <option value="AUTO_STAGE_CHANGE">Auto - Stage Change</option>
                    <option value="MANUAL">Manual Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Trigger on Stages</label>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_STAGES.map(stage => (
                      <button
                        key={stage.value}
                        type="button"
                        className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                        style={{
                          backgroundColor: selectedStages.includes(stage.value) ? '#E63946' : '#1A1A1A',
                          color: selectedStages.includes(stage.value) ? '#FFFFFF' : '#888888',
                        }}
                        onClick={() => toggleStage(stage.value)}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium" style={{ color: '#888888' }}>Email Steps</label>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded-lg"
                      style={{ backgroundColor: '#1A1A1A', color: '#E63946' }}
                      onClick={addStep}
                    >
                      + Add Step
                    </button>
                  </div>
                  <div className="space-y-4">
                    {sequenceSteps.map((step, i) => (
                      <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium" style={{ color: '#E63946' }}>Step {i + 1}</span>
                          {sequenceSteps.length > 1 && (
                            <button type="button" className="text-xs" style={{ color: '#E63946' }} onClick={() => removeStep(i)}>Remove</button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs mb-1" style={{ color: '#666666' }}>Delay (days)</label>
                              <input
                                type="number"
                                min="0"
                                className="w-full px-2 py-1.5 text-sm rounded-lg outline-none"
                                style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                                value={step.delayDays}
                                onChange={e => updateStep(i, 'delayDays', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-3">
                              <label className="block text-xs mb-1" style={{ color: '#666666' }}>Subject</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1.5 text-sm rounded-lg outline-none"
                                style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                                placeholder="Email subject..."
                                value={step.subject}
                                onChange={e => updateStep(i, 'subject', e.target.value)}
                                required={i === 0}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: '#666666' }}>Body</label>
                            <textarea
                              className="w-full h-24 px-2 py-1.5 text-sm rounded-lg resize-none outline-none"
                              style={{ backgroundColor: '#111111', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                              placeholder="Email body..."
                              value={step.body}
                              onChange={e => updateStep(i, 'body', e.target.value)}
                              required={i === 0}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: '#2A2A2A' }}>
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => setShowSequenceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingSequence ? 'Update Sequence' : 'Create Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-xl w-full max-w-lg" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
            <div className="p-6 border-b" style={{ borderColor: '#2A2A2A' }}>
              <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>{editingTemplate ? 'Edit Template' : 'New Email Template'}</h2>
            </div>
            <form onSubmit={saveTemplate}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Template Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    placeholder="e.g. Follow Up #1"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Category</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    value={templateCategory}
                    onChange={e => setTemplateCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Subject</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    placeholder="Email subject..."
                    value={templateSubject}
                    onChange={e => setTemplateSubject(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>Body</label>
                  <textarea
                    className="w-full h-40 px-3 py-2 text-sm rounded-lg resize-none outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' }}
                    placeholder="Email body..."
                    value={templateBody}
                    onChange={e => setTemplateBody(e.target.value)}
                    required
                  />
                  <p className="text-xs mt-2" style={{ color: '#666666' }}>Variables: {'{{firstName}}'}, {'{{schoolName}}'}, {'{{sport}}'}, {'{{sourceGroupName}}'}</p>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: '#2A2A2A' }}>
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                  onClick={() => setShowTemplateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
