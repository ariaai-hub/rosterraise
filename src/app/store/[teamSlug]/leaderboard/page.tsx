'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardPlayer {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string;
  gradeLevel: string;
  slug: string;
  itemsSold: number;
}

interface PlayerRanking extends LeaderboardPlayer {
  rank: number;
}

interface Team {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
}

export default function LeaderboardPage() {
  const params = useParams();
  const teamSlug = params.teamSlug as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<PlayerRanking[]>([]);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const [teamRes, leaderboardRes] = await Promise.all([
          fetch(`/api/teams/${teamSlug}`),
          fetch(`/api/teams/${teamSlug}/leaderboard`),
        ]);

        if (!teamRes.ok || !leaderboardRes.ok) {
          throw new Error('Failed to load leaderboard');
        }

        const teamData = await teamRes.json();
        const leaderboardData = await leaderboardRes.json();

        setTeam(teamData.team);
        setPlayers(leaderboardData.players);
        setTotalItemsSold(leaderboardData.totalItemsSold);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [teamSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Leaderboard Not Found</h1>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: '#FFD700', label: '🥇' }; // Gold
    if (rank === 2) return { color: '#C0C0C0', label: '🥈' }; // Silver
    if (rank === 3) return { color: '#CD7F32', label: '🥉' }; // Bronze
    return { color: '#FFFFFF', label: `#${rank}` };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {team.logoUrl && (
              <img src={team.logoUrl} alt={team.name} className="h-12 w-12 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name} Leaderboard</h1>
              <p className="text-gray-400">{totalItemsSold} items sold supporting our team</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {players.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No sales yet. Be the first to support a player!</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-950 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Player</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Position</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Items Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {players.map((player, index) => {
                  const rankStyle = getRankStyle(index + 1);
                  return (
                    <tr
                      key={player.id}
                      className={`hover:bg-gray-800/50 transition ${
                        index < 3 ? 'bg-gray-850' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold" style={{ color: rankStyle.color }}>
                          {rankStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/store/${teamSlug}/player/${player.slug}`}
                          className="flex items-center gap-3 group"
                        >
                          {player.number && (
                            <span className="text-2xl font-bold text-gray-600 w-10">
                              #{player.number}
                            </span>
                          )}
                          <div>
                            <span className="font-semibold text-white group-hover:text-[#E63946] transition">
                              {player.firstName} {player.lastName}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              Grade {player.gradeLevel}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{player.position}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xl font-bold text-white">{player.itemsSold}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
