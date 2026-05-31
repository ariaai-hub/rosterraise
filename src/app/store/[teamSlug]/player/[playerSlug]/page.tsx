'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string;
  gradeLevel: string;
  slug: string;
  itemsSold: number;
}

interface PlayerRanking {
  rank: number;
}

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

interface Team {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const teamSlug = params.teamSlug as string;
  const playerSlug = params.playerSlug as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayer() {
      try {
        // Fetch player data
        const playerRes = await fetch(`/api/teams/${teamSlug}/players/${playerSlug}`);
        if (!playerRes.ok) {
          throw new Error('Player not found');
        }
        const playerData = await playerRes.json();
        setTeam(playerData.team);
        setPlayer(playerData.player);

        // Also fetch leaderboard to get rank
        const leaderboardRes = await fetch(`/api/teams/${teamSlug}/leaderboard`);
        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          const playerRank = leaderboardData.players.findIndex(
            (p: LeaderboardPlayer) => p.slug === playerSlug
          );
          setRank(playerRank >= 0 ? playerRank + 1 : null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayer();
  }, [teamSlug, playerSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !team || !player) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Player Not Found</h1>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const teamUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${team.slug}` : '';
  const shareText = `I just supported ${team.name} #${player.number} ${player.firstName} ${player.lastName}! Get your gear at ${teamUrl}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link href={`/store/${team.slug}`} className="text-gray-400 hover:text-white transition">
            ← Back to Store
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Player Hero */}
        <div className="text-center mb-12">
          {player.number && (
            <div className="text-8xl font-bold text-gray-800 mb-4">#{player.number}</div>
          )}
          <h1 className="text-5xl font-bold text-white mb-2">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-xl text-gray-400 mb-4">
            {player.position} • Grade {player.gradeLevel}
          </p>
          {rank && rank <= 3 && (
            <div
              className="inline-block px-4 py-2 rounded-full text-lg font-bold"
              style={{
                backgroundColor: rank === 1 ? '#FFD70020' : rank === 2 ? '#C0C0C020' : '#CD7F3220',
                color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
              }}
            >
              #{rank} on Leaderboard
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <p className="text-4xl font-bold text-white">{player.itemsSold}</p>
            <p className="text-sm text-gray-400 mt-1">Items Sold</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <p className="text-4xl font-bold text-white">{rank || '-'}</p>
            <p className="text-sm text-gray-400 mt-1">Leaderboard Rank</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <Link
            href={`/store/${team.slug}?player=${player.slug}`}
            className="inline-block px-8 py-4 rounded-lg font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#E63946' }}
          >
            Get Your Gear to Support {player.firstName}
          </Link>
        </div>

        {/* Share Section */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Spread the Word</h2>
          <div className="flex justify-center gap-4">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(teamUrl)}&quote=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] transition"
            >
              X (Twitter)
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
