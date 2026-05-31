'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Types
interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  commissionRate: number;
  isActive: boolean;
  assignedLeadsCount: number;
  won: number;
  revenue: number;
}

interface PerformanceRow {
  rep: { id: string; firstName: string; lastName: string; email: string };
  assignedLeads: number;
  qualifiedLeads: number;
  proposals: number;
  won: number;
  revenue: number;
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

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'ADMIN': return '#E63946';
    case 'SALES_REP': return '#3B82F6';
    case 'CS': return '#10B981';
    default: return '#888888';
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'SALES_REP': return 'Sales Rep';
    case 'CS': return 'CS';
    default: return role;
  }
}

// Skeleton
function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl animate-pulse" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full" style={{ backgroundColor: '#1A1A1A' }}></div>
        <div className="flex-1">
          <div className="h-4 w-32 rounded mb-2" style={{ backgroundColor: '#1A1A1A' }}></div>
          <div className="h-3 w-48 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
        <div className="h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
        <div className="h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
        <div className="h-4 rounded" style={{ backgroundColor: '#1A1A1A' }}></div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const pathname = usePathname();

  // Data states
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);

  // Loading states
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'SALES_REP',
    password: '',
    commissionRate: 0,
  });

  // Fetch functions
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/team', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/crm/team/performance', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPerformance(data);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setLoadingPerformance(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTeam();
    fetchPerformance();
  }, [fetchTeam, fetchPerformance]);

  // Open add modal
  const openAddModal = () => {
    setEditingMember(null);
    setFormData({ firstName: '', lastName: '', email: '', role: 'SALES_REP', password: '', commissionRate: 0 });
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      password: '',
      commissionRate: member.commissionRate,
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      if (editingMember) {
        // PATCH
        const res = await fetch(`/api/admin/crm/team/${editingMember.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchTeam();
          closeModal();
        }
      } else {
        // POST
        const res = await fetch('/api/admin/crm/team', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          fetchTeam();
          closeModal();
        }
      }
    } catch (error) {
      console.error('Failed to save team member:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // Deactivate member
  const handleDeactivate = async () => {
    if (!editingMember) return;
    if (!confirm('Deactivate this team member?')) return;

    setModalLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/team/${editingMember.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        fetchTeam();
        closeModal();
      }
    } catch (error) {
      console.error('Failed to deactivate team member:', error);
    } finally {
      setModalLoading(false);
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
      <main className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Team Management</h1>
            <p className="text-gray-500 mt-1">Manage your sales reps and CS team</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
          >
            + Add User
          </button>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {loadingTeam ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : team.length === 0 ? (
            <div className="col-span-full text-center py-12" style={{ color: '#888888' }}>
              No team members found
            </div>
          ) : (
            team.map((member) => (
              <div
                key={member.id}
                className="p-6 rounded-xl cursor-pointer transition-colors"
                style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
                onClick={() => openEditModal(member)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; }}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{ backgroundColor: getRoleBadgeColor(member.role), color: '#FFFFFF' }}
                  >
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>
                        {member.firstName} {member.lastName}
                      </h3>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#888888' }}>{member.email}</p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: `${getRoleBadgeColor(member.role)}20`, color: getRoleBadgeColor(member.role) }}
                  >
                    {getRoleLabel(member.role)}
                  </span>
                </div>

                {/* Commission */}
                <p className="text-sm mb-4" style={{ color: '#888888' }}>
                  Commission: <span style={{ color: '#FFFFFF' }}>{member.commissionRate}%</span>
                </p>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold" style={{ color: '#FFFFFF' }}>{member.assignedLeadsCount}</p>
                    <p className="text-xs" style={{ color: '#666666' }}>Assigned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: '#FFFFFF' }}>{member.won}</p>
                    <p className="text-xs" style={{ color: '#666666' }}>Won</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{formatCurrency(member.revenue)}</p>
                    <p className="text-xs" style={{ color: '#666666' }}>Revenue</p>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#1A1A1A' }}>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: member.isActive ? '#10B98120' : '#66666620', color: member.isActive ? '#10B981' : '#666666' }}
                  >
                    {member.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Performance Table */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Performance</h2>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Rep</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Assigned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Qualified</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Proposals</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Won</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loadingPerformance ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-3"><div className="h-4 w-32 rounded" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded ml-auto" style={{ backgroundColor: '#1A1A1A' }}></div></td>
                    </tr>
                  ))
                ) : (
                  performance.map((row, idx) => (
                    <tr key={row.rep.id} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                          >
                            {getInitials(row.rep.firstName, row.rep.lastName)}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                            {row.rep.firstName} {row.rep.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#888888' }}>{row.assignedLeads}</td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#888888' }}>{row.qualifiedLeads}</td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#888888' }}>{row.proposals}</td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#888888' }}>{row.won}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium" style={{ color: '#10B981' }}>{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div
            className="w-full max-w-md p-6 rounded-xl"
            style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF' }}>
              {editingMember ? 'Edit User' : 'Add User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#888888' }}>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(f => ({ ...f, firstName: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#888888' }}>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(f => ({ ...f, lastName: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: '#888888' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                  required={!editingMember}
                  disabled={!!editingMember}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                />
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: '#888888' }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                >
                  <option value="SALES_REP">Sales Rep</option>
                  <option value="CS">CS</option>
                </select>
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#888888' }}>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                    required={!editingMember}
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs mb-2" style={{ color: '#888888' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData(f => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#0A0A0A', border: '1px solid #2A2A2A', color: '#FFFFFF' }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
                >
                  {modalLoading ? 'Saving...' : editingMember ? 'Save Changes' : 'Add User'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
                >
                  Cancel
                </button>
              </div>

              {editingMember && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={modalLoading}
                  className="w-full py-3 rounded-lg text-sm font-medium mt-2"
                  style={{ backgroundColor: '#1A0A0A', color: '#E63946', border: '1px solid #E63946' }}
                >
                  Deactivate User
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}