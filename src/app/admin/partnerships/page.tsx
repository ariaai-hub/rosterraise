'use client';

import { useEffect, useState } from 'react';

interface Partnership {
  id: string;
  name: string;
  type: string;
  status: string;
  revenue: number;
  createdAt: string;
  contactName: string;
  contactEmail: string;
}

interface Pagination {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export default function AdminPartnershipsPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPartnerships();
  }, [statusFilter]);

  const fetchPartnerships = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/admin/partnerships?${params.toString()}`);
      
      if (res.ok) {
        const data = await res.json();
        setPartnerships(data.partnerships || []);
        setPagination(data.pagination);
      } else if (res.status === 404) {
        // API doesn't exist yet - show empty state
        setPartnerships([]);
        setPagination(null);
      }
    } catch {
      // API endpoint might not exist - show empty state
      setPartnerships([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#10B98120', text: '#10B981' },
    PENDING: { bg: '#F59E0B20', text: '#F59E0B' },
    INACTIVE: { bg: '#88888820', text: '#888888' },
    EXPIRED: { bg: '#EF444420', text: '#EF4444' },
  };

  const typeColors: Record<string, string> = {
    CORPORATE: '#3B82F6',
    SCHOOL: '#8B5CF6',
    COMMUNITY: '#10B981',
    SPONSOR: '#F59E0B',
    OTHER: '#888888',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
            Partnerships
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Manage partners, deals, and revenue
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
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="INACTIVE">Inactive</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : partnerships.length === 0 ? (
        /* Empty State */
        <div
          className="rounded-xl p-12 text-center"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
          {/* Empty state icon */}
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.5">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
            No partnerships yet
          </h3>
          <p className="text-gray-500 max-w-md mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Partnerships will appear here once your organization starts working with sponsors, schools, or corporate partners.
          </p>
        </div>
      ) : (
        /* Partnership Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partnerships.map((partnership) => (
            <div
              key={partnership.id}
              className="p-6 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105"
              style={{ 
                backgroundColor: '#111111', 
                border: '1px solid #222222',
              }}
              onClick={() => setSelectedPartnership(partnership)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#E63946';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#222222';
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                    style={{ 
                      backgroundColor: (typeColors[partnership.type] || '#888888') + '20', 
                      color: typeColors[partnership.type] || '#888888',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {partnership.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {partnership.name}
                    </h3>
                    <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                      {partnership.type}
                    </p>
                  </div>
                </div>
                <span
                  className="px-2 py-1 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: statusColors[partnership.status]?.bg || '#88888820',
                    color: statusColors[partnership.status]?.text || '#888888',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {partnership.status}
                </span>
              </div>

              {/* Revenue */}
              <div className="mb-4">
                <p className="text-sm mb-1" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Total Revenue</p>
                <p className="text-2xl font-bold" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                  {formatCurrency(partnership.revenue)}
                </p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t" style={{ borderColor: '#222222' }}>
                <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                  Since {formatDate(partnership.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Partnership Detail Modal */}
      {selectedPartnership && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedPartnership(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl"
                  style={{ 
                    backgroundColor: (typeColors[selectedPartnership.type] || '#888888') + '20', 
                    color: typeColors[selectedPartnership.type] || '#888888',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {selectedPartnership.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                    {selectedPartnership.name}
                  </h2>
                  <p className="text-gray-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{selectedPartnership.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPartnership(null)}
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
              {/* Status & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                  <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Status</p>
                  <span
                    className="px-3 py-1 text-sm font-semibold rounded-full"
                    style={{
                      backgroundColor: statusColors[selectedPartnership.status]?.bg || '#88888820',
                      color: statusColors[selectedPartnership.status]?.text || '#888888',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {selectedPartnership.status}
                  </span>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                  <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Type</p>
                  <p className="font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                    {selectedPartnership.type}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <p className="text-sm mb-3" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Contact</p>
                <p className="font-semibold mb-1" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                  {selectedPartnership.contactName}
                </p>
                <p className="text-sm" style={{ color: '#E63946', fontFamily: 'Inter, sans-serif' }}>
                  {selectedPartnership.contactEmail}
                </p>
              </div>

              {/* Revenue & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#0A0A0A' }}>
                  <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Total Revenue</p>
                  <p className="text-3xl font-bold" style={{ color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                    {formatCurrency(selectedPartnership.revenue)}
                  </p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#0A0A0A' }}>
                  <p className="text-sm mb-2" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>Partner Since</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                    {formatDate(selectedPartnership.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}