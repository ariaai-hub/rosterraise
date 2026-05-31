'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  sport: string;
  gradeLevel: string;
  slug: string;
  itemsSold?: number;
}

interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: string;
}

export default function PlayersPage() {
  const pathname = usePathname();
  const teamSlug = pathname.split('/')[2];
  const [user, setUser] = useState<SessionUser | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    number: '',
    sport: '',
    gradeLevel: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamData, setTeamData] = useState<{ team: { id: string } | null }>({ team: null });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const teamRes = await fetch(`/api/teams?slug=${teamSlug}`);
        if (!teamRes.ok) return;
        const teamJson = await teamRes.json();
        const team = teamJson.teams?.[0];
        if (!team) return;
        setTeamData({ team: { id: team.id } });

        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.user?.role === 'COACH' && team.id === data.user?.teamId) {
          setUser(data.user);
        }
      } catch {}
    };
    checkAuth();
  }, [teamSlug]);

  useEffect(() => {
    if (!user) return;
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/teams/${user.teamId}/players`);
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [user, teamSlug]);

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', number: '', sport: '', gradeLevel: '' });
    setFormError('');
    setEditingPlayer(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      number: player.number?.toString() ?? '',
      sport: player.sport,
      gradeLevel: player.gradeLevel,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      number: form.number ? parseInt(form.number) : undefined,
      sport: form.sport,
      gradeLevel: form.gradeLevel,
      slug: `${form.firstName.toLowerCase()}-${form.lastName.toLowerCase()}-${Date.now().toString(36)}`,
    };

    try {
      const url = editingPlayer
        ? `/api/players/${editingPlayer.id}`
        : `/api/teams/${user!.teamId}/players`;
      const method = editingPlayer ? 'PUT' : 'POST';

      if (!editingPlayer && !user) { setFormError('Not authenticated'); setSaving(false); return; }
      const teamId = user!.teamId;

      // For create, we need to POST to /api/players with teamId, or maybe the route expects teamId in body or params
      // Looking at existing routes, POST /api/players expects teamId in body
      const bodyData = editingPlayer
        ? payload
        : { ...payload, teamId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save player');
        return;
      }

      // Refresh list
      const refreshRes = await fetch(`/api/teams/${user!.teamId}/players`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setPlayers(refreshData.players || []);
      }

      setShowModal(false);
      resetForm();
    } catch {
      setFormError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (!confirm(`Delete ${player.firstName} ${player.lastName}?`)) return;
    setDeletingId(player.id);
    setDeleteError('');

    try {
      const res = await fetch(`/api/players/${player.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete player');
        return;
      }

      setPlayers(prev => prev.filter(p => p.id !== player.id));
    } catch {
      setDeleteError('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;
    setSaving(true);
    setBulkResult(null);

    const text = await bulkFile.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const players = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i]; });
      obj.number = obj.number ? parseInt(obj.number) : undefined;
      obj.slug = `${obj.firstname.toLowerCase()}-${obj.lastname.toLowerCase()}-${Date.now().toString(36)}`;
      return obj;
    });

    try {
      const res = await fetch('/api/players/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      });
      const data = await res.json();

      if (res.ok) {
        setBulkResult({ created: data.created?.length || 0, failed: data.failed?.length || 0 });
        // Refresh
        if (user) {
          const refreshRes = await fetch(`/api/teams/${user.teamId}/players`);
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setPlayers(refreshData.players || []);
          }
        }
      } else {
        setBulkResult({ created: 0, failed: players.length });
      }
    } catch {
      setBulkResult({ created: 0, failed: players.length });
    } finally {
      setSaving(false);
    }
  };

  const sports = ['Basketball', 'Football', 'Soccer', 'Baseball', 'Volleyball', 'Hockey', 'Lacrosse', 'Softball', 'Track and Field', 'Swimming', 'Wrestling', 'Tennis', 'Golf', 'Other'];
  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  return (
    <div className="p-8" style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="text-gray-500 mt-1">Manage your team roster</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF', border: '1px solid #333333' }}
            >
              Bulk Import
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
            >
              + Add Player
            </button>
          </div>
        </div>

        {deleteError && (
          <div className="mb-4 p-4 rounded-lg text-sm" style={{ backgroundColor: '#1a0000', color: '#E63946', border: '1px solid #E63946' }}>
            {deleteError}
          </div>
        )}

        {/* Players Table */}
        <div style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Number</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Sport</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Items Sold</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No players yet. Add your first player!</td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td className="p-4 text-white font-medium">
                      {player.firstName} {player.lastName}
                    </td>
                    <td className="p-4 text-gray-400">{player.number ?? '—'}</td>
                    <td className="p-4 text-gray-400">{player.sport}</td>
                    <td className="p-4 text-gray-400">{player.gradeLevel}</td>
                    <td className="p-4 text-gray-400">{player.itemsSold ?? 0}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEditModal(player)}
                          className="px-3 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(player)}
                          disabled={deletingId === player.id}
                          className="px-3 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: '#2a0000', color: '#E63946' }}
                        >
                          {deletingId === player.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Player Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}>
              <h2 className="text-xl font-bold text-white mb-6">
                {editingPlayer ? 'Edit Player' : 'Add Player'}
              </h2>

              {formError && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#1a0000', color: '#E63946' }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">First Name</label>
                    <input
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      required
                      className="w-full px-4 py-2 rounded-lg outline-none"
                      style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #333333' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                    <input
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      required
                      className="w-full px-4 py-2 rounded-lg outline-none"
                      style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #333333' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Jersey Number</label>
                  <input
                    type="number"
                    value={form.number}
                    onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #333333' }}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Sport</label>
                  <select
                    value={form.sport}
                    onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #333333' }}
                  >
                    <option value="">Select sport</option>
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Grade Level</label>
                  <select
                    value={form.gradeLevel}
                    onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))}
                    required
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', border: '1px solid #333333' }}
                  >
                    <option value="">Select grade</option>
                    {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#E63946', color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Saving...' : editingPlayer ? 'Update' : 'Add Player'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}>
              <h2 className="text-xl font-bold text-white mb-6">Bulk Import Players</h2>

              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV with columns: <span className="text-white">firstName, lastName, number, position, gradeLevel</span>
              </p>

              {bulkResult && (
                <div className="mb-4 p-4 rounded-lg text-sm" style={{ backgroundColor: '#0A0A0A', border: '1px solid #333333' }}>
                  <p className="text-green-400">Imported: {bulkResult.created} players</p>
                  {bulkResult.failed > 0 && <p className="text-red-400 mt-1">Failed: {bulkResult.failed}</p>}
                </div>
              )}

              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={e => setBulkFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold"
                    style={{ color: '#888888' }}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowBulkModal(false); setBulkResult(null); setBulkFile(null); }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF' }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkFile || saving}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#E63946', color: '#FFFFFF', cursor: (!bulkFile || saving) ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}