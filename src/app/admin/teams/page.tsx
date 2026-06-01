'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  slug: string;
  sport: string;
  status: string;
  createdAt: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  _count: {
    players: number;
    orders: number;
  };
}

interface Pagination {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export default function AdminTeamsPage() {
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sportFilter, setSportFilter] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchTeams = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('offset', offset.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/admin/teams?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [statusFilter]);

  const handleApprove = async (team: Team) => {
    setActionLoading(team.id);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeams((prev) =>
          prev.map((t) =>
            t.id === team.id ? { ...t, status: 'APPROVED', slug: data.team.slug } : t
          )
        );
        showToast(`Team approved! Store URL: /store/${data.team.slug}`, 'success');
      } else {
        const error = await res.json();
        showToast(`Failed to approve: ${error.error}`, 'error');
      }
    } catch {
      showToast('Failed to approve team', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (team: Team) => {
    if (!confirm(`Are you sure you want to reject "${team.name}"?`)) {
      return;
    }

    setActionLoading(team.id);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (res.ok) {
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? { ...t, status: 'REJECTED' } : t))
        );
        showToast('Team rejected successfully', 'success');
      } else {
        const error = await res.json();
        showToast(`Failed to reject: ${error.error}`, 'error');
      }
    } catch {
      showToast('Failed to reject team', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#F59E0B20', text: '#F59E0B' },
    APPROVED: { bg: '#10B98120', text: '#10B981' },
    REJECTED: { bg: '#EF444420', text: '#EF4444' },
  };

  return (
    <div className="p-8">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in"
            style={{
              backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
              color: '#FFFFFF',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
            Teams
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Manage team applications and approvals
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg outline-none"
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF',
            border: '1px solid #333333',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="px-4 py-2 rounded-lg outline-none"
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF',
            border: '1px solid #333333',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <option value="">All Sports</option>
          <option value="Football">Football</option>
          <option value="Basketball">Basketball</option>
          <option value="Baseball">Baseball</option>
          <option value="Soccer">Soccer</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Softball">Softball</option>
          <option value="Lacrosse">Lacrosse</option>
          <option value="Swimming">Swimming</option>
          <option value="Track">Track</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#0A0A0A' }}>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Team
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Sport
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Coach
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Applied
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#222222' }}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    No teams found
                  </td>
                </tr>
              ) : (
                teams
                  .filter((t) => !sportFilter || t.sport === sportFilter)
                  .map((team) => {
                    const coach = team.users.find((u) => u.role === 'COACH');
                    return (
                      <tr 
                        key={team.id} 
                        className="cursor-pointer transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onClick={() => setSelectedTeam(team)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                              {team.name}
                            </p>
                            {team.slug && (
                              <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                                /store/{team.slug}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                          {team.sport}
                        </td>
                        <td className="px-6 py-4">
                          {coach ? (
                            <div>
                              <p style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                                {coach.firstName} {coach.lastName}
                              </p>
                              <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                                {coach.email}
                              </p>
                            </div>
                          ) : (
                            <span style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>No coach</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 text-xs font-semibold rounded-full"
                            style={{
                              backgroundColor: statusColors[team.status]?.bg || '#88888820',
                              color: statusColors[team.status]?.text || '#888888',
                              fontFamily: 'Inter, sans-serif',
                            }}
                          >
                            {team.status}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                          {formatDate(team.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedTeam(team)}
                              className="px-3 py-1 text-sm rounded-lg transition-colors"
                              style={{
                                backgroundColor: '#1a1a1a',
                                color: '#888888',
                                fontFamily: 'Inter, sans-serif',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#222222';
                                e.currentTarget.style.color = '#FFFFFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#1a1a1a';
                                e.currentTarget.style.color = '#888888';
                              }}
                            >
                              View
                            </button>
                            {team.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(team)}
                                  disabled={actionLoading === team.id}
                                  className="px-3 py-1 text-sm rounded-lg font-semibold transition-colors"
                                  style={{
                                    backgroundColor: '#10B981',
                                    color: '#FFFFFF',
                                    opacity: actionLoading === team.id ? 0.5 : 1,
                                    cursor: actionLoading === team.id ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                  }}
                                >
                                  {actionLoading === team.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleReject(team)}
                                  disabled={actionLoading === team.id}
                                  className="px-3 py-1 text-sm rounded-lg font-semibold transition-colors"
                                  style={{
                                    backgroundColor: '#EF4444',
                                    color: '#FFFFFF',
                                    opacity: actionLoading === team.id ? 0.5 : 1,
                                    cursor: actionLoading === team.id ? 'not-allowed' : 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 20 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid #222222' }}
          >
            <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + 20, pagination.total)} of {pagination.total} teams
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTeams(pagination.offset - 20)}
                disabled={pagination.offset === 0}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{
                  backgroundColor: '#1a1a1a',
                  color: pagination.offset === 0 ? '#555555' : '#FFFFFF',
                  cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Previous
              </button>
              <button
                onClick={() => fetchTeams(pagination.offset + 20)}
                disabled={!pagination.hasMore}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{
                  backgroundColor: '#1a1a1a',
                  color: !pagination.hasMore ? '#555555' : '#FFFFFF',
                  cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                  {selectedTeam.name}
                </h2>
                <p className="text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{selectedTeam.sport}</p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#1a1a1a', color: '#888888' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E63946';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                  e.currentTarget.style.color = '#888888';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#0A0A0A' }}
              >
                <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Status
                </p>
                <span
                  className="px-3 py-1 text-sm font-semibold rounded-full"
                  style={{
                    backgroundColor: statusColors[selectedTeam.status]?.bg || '#88888820',
                    color: statusColors[selectedTeam.status]?.text || '#888888',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {selectedTeam.status}
                </span>
              </div>

              {/* Coach Info */}
              {selectedTeam.users.find((u) => u.role === 'COACH') && (
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: '#0A0A0A' }}
                >
                  <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    Coach
                  </p>
                  <p className="font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                    {selectedTeam.users.find((u) => u.role === 'COACH')?.firstName}{' '}
                    {selectedTeam.users.find((u) => u.role === 'COACH')?.lastName}
                  </p>
                  <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    {selectedTeam.users.find((u) => u.role === 'COACH')?.email}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: '#0A0A0A' }}
                >
                  <p className="text-2xl font-bold" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                    {selectedTeam._count.players}
                  </p>
                  <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    Players
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: '#0A0A0A' }}
                >
                  <p className="text-2xl font-bold" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                    {selectedTeam._count.orders}
                  </p>
                  <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    Orders
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: '#0A0A0A' }}
                >
                  <p className="text-sm mb-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    Store URL
                  </p>
                  <p className="font-medium truncate" style={{ color: '#E63946', fontFamily: 'Inter, sans-serif' }}>
                    {selectedTeam.slug ? `/store/${selectedTeam.slug}` : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Applied Date */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#0A0A0A' }}
              >
                <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Applied
                </p>
                <p className="font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  {formatDate(selectedTeam.createdAt)}
                </p>
              </div>

              {/* Actions */}
              {selectedTeam.status === 'PENDING' && (
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      handleApprove(selectedTeam);
                      setSelectedTeam(null);
                    }}
                    disabled={actionLoading === selectedTeam.id}
                    className="flex-1 py-3 rounded-lg font-semibold transition-colors"
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      opacity: actionLoading === selectedTeam.id ? 0.5 : 1,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Approve Team
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedTeam);
                      setSelectedTeam(null);
                    }}
                    disabled={actionLoading === selectedTeam.id}
                    className="flex-1 py-3 rounded-lg font-semibold transition-colors"
                    style={{
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      opacity: actionLoading === selectedTeam.id ? 0.5 : 1,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Reject Team
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}