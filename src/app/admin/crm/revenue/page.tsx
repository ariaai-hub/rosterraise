'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RevenueSummary {
  wonThisMonth: { count: number; revenue: number };
  wonLastMonth: { count: number; revenue: number };
  trend: number;
  avgDealSize: number;
  pipelineValue: number;
}

interface SportRevenue {
  sport: string;
  count: number;
  revenue: number;
}

interface StateRevenue {
  state: string;
  count: number;
  revenue: number;
}

interface ForecastData {
  thirtyDay: number;
  ninetyDay: number;
}

interface WonDeal {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  sport: string | null;
  contractValue: number | null;
  wonAt: string | null;
}

interface SummaryResponse {
  wonThisMonth: { count: number; revenue: number };
  wonLastMonth: { count: number; revenue: number };
  trend: number;
  avgDealSize: number;
  pipelineValue: number;
  wonDeals: WonDeal[];
}

const SPORT_COLORS: Record<string, string> = {
  Football: '#E63946',
  Basketball: '#3B82F6',
  Soccer: '#10B981',
  Baseball: '#F97316',
  Other: '#888888',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [sportData, setSportData] = useState<SportRevenue[]>([]);
  const [stateData, setStateData] = useState<StateRevenue[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [wonDeals, setWonDeals] = useState<WonDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, sportRes, stateRes, forecastRes] = await Promise.all([
        fetch('/api/admin/crm/revenue/summary'),
        fetch('/api/admin/crm/revenue/by-sport'),
        fetch('/api/admin/crm/revenue/by-state'),
        fetch('/api/admin/crm/revenue/forecast'),
      ]);

      if (summaryRes.ok) {
        const data: SummaryResponse = await summaryRes.json();
        setSummary(data);
        setWonDeals(data.wonDeals || []);
      }
      if (sportRes.ok) setSportData(await sportRes.json());
      if (stateRes.ok) setStateData(await stateRes.json());
      if (forecastRes.ok) setForecast(await forecastRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalRevenue = sportData.reduce((s, d) => s + d.revenue, 0);
  const topStates = [...stateData].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Revenue</h1>
        <p className="text-sm mt-1" style={{ color: '#888888' }}>Track won deals, pipeline, and revenue forecasts</p>
      </div>

      {/* Top 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-xl animate-pulse" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="h-4 w-24 rounded mb-4" style={{ backgroundColor: '#1A1A1A' }} />
              <div className="h-8 w-32 rounded mb-2" style={{ backgroundColor: '#1A1A1A' }} />
              <div className="h-3 w-20 rounded" style={{ backgroundColor: '#1A1A1A' }} />
            </div>
          ))
        ) : summary ? (
          <>
            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🏆</span>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: summary.trend >= 0 ? '#10B981' : '#E63946', color: '#FFFFFF' }}>
                  {formatPercent(summary.trend)}
                </span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{summary.wonThisMonth.count}</p>
              <p className="text-sm mt-1" style={{ color: '#FFFFFF' }}>Won This Month</p>
              <p className="text-xs mt-1" style={{ color: '#10B981' }}>{formatCurrency(summary.wonThisMonth.revenue)}</p>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>{summary.wonLastMonth.count}</p>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Won Last Month</p>
              <p className="text-xs mt-1" style={{ color: '#888888' }}>{formatCurrency(summary.wonLastMonth.revenue)}</p>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#3B82F6' }}>{formatCurrency(summary.avgDealSize)}</p>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Avg Deal Size</p>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(summary.pipelineValue)}</p>
              <p className="text-sm mt-1" style={{ color: '#888888' }}>Pipeline Value</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Revenue by Sport + 30/90 Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="lg:col-span-2 p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF' }}>Revenue by Sport</h2>
          {loading ? (
            <div className="h-64 animate-pulse rounded" style={{ backgroundColor: '#1A1A1A' }} />
          ) : sportData.length === 0 ? (
            <div className="h-64 flex items-center justify-center" style={{ color: '#888888' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sportData}
                  dataKey="revenue"
                  nameKey="sport"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {sportData.map((entry) => (
                    <Cell key={entry.sport} fill={SPORT_COLORS[entry.sport] || '#888888'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 6, color: '#FFFFFF' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span style={{ color: '#FFFFFF' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Forecast Cards */}
        <div className="space-y-6">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl animate-pulse" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
                <div className="h-4 w-24 rounded mb-4" style={{ backgroundColor: '#1A1A1A' }} />
                <div className="h-8 w-32 rounded" style={{ backgroundColor: '#1A1A1A' }} />
              </div>
            ))
          ) : forecast ? (
            <>
              <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
                <p className="text-sm mb-2" style={{ color: '#888888' }}>30-Day Forecast</p>
                <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(forecast.thirtyDay)}</p>
                <p className="text-xs mt-2" style={{ color: '#888888' }}>Based on stage 7+ leads at 30% probability</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
                <p className="text-sm mb-2" style={{ color: '#888888' }}>90-Day Forecast</p>
                <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(forecast.ninetyDay)}</p>
                <p className="text-xs mt-2" style={{ color: '#888888' }}>Based on stage 5+ leads at 15% probability</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Revenue by State */}
      <div className="mb-8 p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
        <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF' }}>Revenue by State</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>State</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Deals</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {topStates.map((row) => (
                  <tr key={row.state} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#FFFFFF' }}>{row.state}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>{row.count}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: '#10B981' }}>{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>{totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Won Deal List */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: '#111111', border: '1px solid #1A1A1A' }}>
        <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF' }}>Won Deal List</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />)}</div>
        ) : wonDeals.length === 0 ? (
          <p className="text-center py-12" style={{ color: '#888888' }}>No won deals yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#1A1A1A' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Lead Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>School</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Sport</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Contract Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#888888' }}>Won Date</th>
                </tr>
              </thead>
              <tbody>
                {wonDeals.map((deal) => (
                  <tr key={deal.id} className="border-b" style={{ borderColor: '#1A1A1A' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#FFFFFF' }}>{deal.firstName} {deal.lastName}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>{deal.schoolName || '-'}</td>
                    <td className="px-4 py-3">
                      {deal.sport ? (
                        <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: SPORT_COLORS[deal.sport] || '#888888', color: '#FFFFFF' }}>{deal.sport}</span>
                      ) : <span style={{ color: '#888888' }}>-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: '#10B981' }}>{deal.contractValue != null ? formatCurrency(deal.contractValue) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#888888' }}>{deal.wonAt ? new Date(deal.wonAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
