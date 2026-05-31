'use client';

import { useEffect, useState, useCallback } from 'react';

interface SpiderRun {
  id: string;
  groupName: string;
  url: string;
  leadsFound: number;
  imported: number;
  status: string;
  errors: string[];
  createdAt: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors?: { row: number; error: string }[];
}

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string;
  sport: string | null;
  stage: number;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FacebookPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'spider' | 'leads'>('import');
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [spiderUrl, setSpiderUrl] = useState('');
  const [spiderGroupName, setSpiderGroupName] = useState('');
  const [spiderLoading, setSpiderLoading] = useState(false);
  const [spiderResult, setSpiderResult] = useState<any>(null);
  const [spiderRuns, setSpiderRuns] = useState<SpiderRun[]>([]);
  const [spiderRunsLoading, setSpiderRunsLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);

  const fetchSpiderRuns = useCallback(async () => {
    setSpiderRunsLoading(true);
    try {
      const res = await fetch('/api/admin/crm/facebook/runs?limit=10', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSpiderRuns(data.runs || []);
      }
    } catch (e) { console.error(e); }
    finally { setSpiderRunsLoading(false); }
  }, []);

  const fetchLeads = useCallback(async (page = 1) => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', source: 'Facebook' });
      const res = await fetch(`/api/admin/crm/leads?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setLeadsTotal(data.pagination?.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLeadsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'spider') fetchSpiderRuns();
    if (activeTab === 'leads') fetchLeads(leadsPage);
  }, [activeTab, leadsPage, fetchSpiderRuns, fetchLeads]);

  async function handleImport() {
    if (!importText.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      let leadsData: any[] = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        leadsData = JSON.parse(trimmed);
      } else {
        const lines = trimmed.split('\n').filter(l => l.trim());
        leadsData = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          return { firstName: parts[0] || '', lastName: parts[1] || '', schoolName: parts[2] || '', sport: parts[3] || '', phone: parts[4] || '', email: parts[5] || '' };
        });
      }
      const res = await fetch('/api/admin/crm/facebook/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsData }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
      } else {
        const err = await res.json();
        setImportResult({ imported: 0, skipped: 0, errors: [{ row: 0, error: err.error || 'Import failed' }] });
      }
    } catch (e) {
      setImportResult({ imported: 0, skipped: 0, errors: [{ row: 0, error: String(e) }] });
    } finally {
      setImportLoading(false);
    }
  }

  async function handleSpider() {
    if (!spiderUrl.trim() || !spiderGroupName.trim()) return;
    setSpiderLoading(true);
    setSpiderResult(null);
    try {
      const res = await fetch('/api/admin/crm/facebook/spider', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: spiderUrl, groupName: spiderGroupName }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpiderResult(data);
        fetchSpiderRuns();
      } else {
        const err = await res.json();
        setSpiderResult({ error: err.error || 'Spider failed' });
      }
    } catch (e) {
      setSpiderResult({ error: String(e) });
    } finally {
      setSpiderLoading(false);
    }
  }

  const stageLabels = ['New','Enriched','Touch 1','Touch 2','Touch 3','Responded','Qualified','Proposal','Negotiating','Won','Lost'];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>Facebook Leads</h1>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#1A1A1A', color: '#888888' }}>Import / Spider / Manage</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '0.5rem', backgroundColor: '#111111', marginBottom: '1.5rem', width: 'fit-content' }}>
        {(['import', 'spider', 'leads'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, backgroundColor: activeTab === tab ? '#E63946' : 'transparent', color: activeTab === tab ? '#FFFFFF' : '#888888', textTransform: 'capitalize' }}>
            {tab === 'import' ? 'Manual Import' : tab === 'spider' ? 'Spider' : 'Imported Leads'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div style={{ backgroundColor: '#111111', borderRadius: '0.5rem', border: '1px solid #2A2A2A', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.75rem' }}>Import Leads from CSV or JSON</h2>
          <p style={{ fontSize: '0.875rem', color: '#888888', marginBottom: '1rem' }}>Paste your data in CSV format (one row per lead: First Name, Last Name, School Name, Sport, Phone, Email) or as a JSON array.</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={'First Name, Last Name, School Name, Sport, Phone, Email\nJohn, Doe, Lincoln High School, Basketball, 555-1234, john@example.com'} style={{ width: '100%', minHeight: '200px', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #2A2A2A', backgroundColor: '#0A0A0A', color: '#E63946', fontSize: '0.875rem', fontFamily: 'monospace', resize: 'vertical', marginBottom: '1rem' }} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleImport} disabled={importLoading || !importText.trim()} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.375rem', border: 'none', cursor: importLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, backgroundColor: importLoading ? '#555' : '#E63946', color: '#FFFFFF' }}>
              {importLoading ? 'Importing...' : 'Import Leads'}
            </button>
          </div>
          {importResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.375rem', backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A' }}>
              <p style={{ fontSize: '0.875rem', color: '#10B981', marginBottom: '0.25rem' }}>Imported: {importResult.imported}</p>
              {importResult.skipped > 0 && <p style={{ fontSize: '0.875rem', color: '#F59E0B', marginBottom: '0.25rem' }}>Skipped (duplicates): {importResult.skipped}</p>}
              {importResult.errors && importResult.errors.map((err, i) => (
                <p key={i} style={{ fontSize: '0.875rem', color: '#E63946' }}>Row {err.row}: {err.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'spider' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#111111', borderRadius: '0.5rem', border: '1px solid #2A2A2A', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.75rem' }}>Run Facebook Spider</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Facebook Group URL</label>
                <input type="text" value={spiderUrl} onChange={e => setSpiderUrl(e.target.value)} placeholder="https://www.facebook.com/groups/..." style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #2A2A2A', backgroundColor: '#0A0A0A', color: '#E63946', fontSize: '0.875rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Group Name</label>
                <input type="text" value={spiderGroupName} onChange={e => setSpiderGroupName(e.target.value)} placeholder="Travel Ball Coaches Association" style={{ width: '100%', padding: '0.625rem', borderRadius: '0.375rem', border: '1px solid #2A2A2A', backgroundColor: '#0A0A0A', color: '#E63946', fontSize: '0.875rem' }} />
              </div>
              <button onClick={handleSpider} disabled={spiderLoading || !spiderUrl.trim() || !spiderGroupName.trim()} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.375rem', border: 'none', cursor: spiderLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, backgroundColor: spiderLoading ? '#555' : '#E63946', color: '#FFFFFF', alignSelf: 'flex-start' }}>
                {spiderLoading ? 'Running...' : 'Run Spider'}
              </button>
            </div>
            {spiderResult && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.375rem', backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A' }}>
                {spiderResult.error ? (
                  <p style={{ fontSize: '0.875rem', color: '#E63946' }}>{spiderResult.error}</p>
                ) : (
                  <>
                    <p style={{ fontSize: '0.875rem', color: '#10B981' }}>Leads found: {spiderResult.leadsFound || 0}</p>
                    <p style={{ fontSize: '0.875rem', color: '#888888' }}>Imported: {spiderResult.imported || 0}</p>
                    {spiderResult.errors && spiderResult.errors.length > 0 && spiderResult.errors.map((err: string, i: number) => (
                      <p key={i} style={{ fontSize: '0.875rem', color: '#F59E0B' }}>{err}</p>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#111111', borderRadius: '0.5rem', border: '1px solid #2A2A2A', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.75rem' }}>Recent Spider Runs</h3>
            {spiderRunsLoading ? (
              <p style={{ fontSize: '0.875rem', color: '#888888' }}>Loading...</p>
            ) : spiderRuns.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#888888' }}>No spider runs yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Group</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Found</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Imported</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spiderRuns.map(run => (
                      <tr key={run.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.875rem', color: '#FFFFFF' }}>{run.groupName}</td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.875rem' }}>
                          <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: run.status === 'COMPLETED' ? '#10B98120' : run.status === 'RUNNING' ? '#F59E0B20' : '#E6394620', color: run.status === 'COMPLETED' ? '#10B981' : run.status === 'RUNNING' ? '#F59E0B' : '#E63946' }}>{run.status}</span>
                        </td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.875rem', color: '#888888', textAlign: 'right' }}>{run.leadsFound}</td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.875rem', color: '#888888', textAlign: 'right' }}>{run.imported}</td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.875rem', color: '#888888' }}>{formatDate(run.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div style={{ backgroundColor: '#111111', borderRadius: '0.5rem', border: '1px solid #2A2A2A', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>Facebook-Sourced Leads</h2>
            <span style={{ fontSize: '0.875rem', color: '#888888' }}>{leadsTotal} total</span>
          </div>
          {leadsLoading ? (
            <p style={{ fontSize: '0.875rem', color: '#888888' }}>Loading...</p>
          ) : leads.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#888888' }}>No Facebook leads yet. Run the spider or import leads manually.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>School</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Sport</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Stage</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase' }}>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#FFFFFF' }}>{lead.firstName} {lead.lastName}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#888888' }}>{lead.schoolName}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#888888' }}>{lead.sport || '-'}</td>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem' }}>
                          <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: '#1A1A1A', color: '#E63946' }}>{stageLabels[lead.stage] || 'Unknown'}</span>
                        </td>
                        <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#888888' }}>{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <button onClick={() => setLeadsPage(Math.max(1, leadsPage - 1))} disabled={leadsPage <= 1} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #2A2A2A', cursor: leadsPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', backgroundColor: 'transparent', color: leadsPage <= 1 ? '#555' : '#888888' }}>Previous</button>
                <span style={{ fontSize: '0.875rem', color: '#888888' }}>Page {leadsPage}</span>
                <button onClick={() => setLeadsPage(leadsPage + 1)} disabled={leads.length < 25} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #2A2A2A', cursor: leads.length < 25 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', backgroundColor: 'transparent', color: leads.length < 25 ? '#555' : '#888888' }}>Next</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}