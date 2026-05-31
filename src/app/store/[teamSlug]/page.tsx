'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, formatCents } from '@/lib/cart-context';
import CartButton from '@/components/cart-button';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string;
  gradeLevel: string;
  slug: string;
  itemsSold?: number;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  sport: string;
  logoUrl: string | null;
  primaryColor: string;
  fundraisingDeadline?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePriceCents: number;
  imageUrl: string | null;
  sizes: string[];
  colors: string[];
  inStock: boolean;
}

interface Bundle {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: string[];
  originalTotalCents: number;
  priceCents: number;
  savePercent: number;
  popular: boolean;
}

// Unsplash images by category
const CATEGORY_IMAGES: Record<string, string> = {
  hoodies: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop',
  shirts: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop',
  koozies: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=300&fit=crop',
  bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=300&fit=crop',
  apparel: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop',
  keychains: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=300&fit=crop',
};

// Embellishment type by category
const CATEGORY_EMBELLISHMENT: Record<string, 'Print' | 'Embroidery' | 'Applique' | 'Laser Etched'> = {
  hoodies: 'Embroidery',
  shirts: 'Print',
  koozies: 'Print',
  bags: 'Embroidery',
  accessories: 'Applique',
  apparel: 'Print',
  keychains: 'Laser Etched',
};

const CATEGORIES = [
  { key: 'all', label: 'Shop All' },
  { key: 'hoodies', label: 'Hoodies & Jackets' },
  { key: 'shirts', label: 'Shirts' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'bundles', label: 'Bundles' },
];

// Map API categories to tab categories
const CATEGORY_MAP: Record<string, string[]> = {
  hoodies: ['hoodies'],
  shirts: ['apparel'],
  bottoms: [],
  accessories: ['accessories', 'keychains', 'koozies', 'bags'],
  bundles: [], // handled separately
};

export default function TeamStorePage() {
  const params = useParams();
  const teamSlug = params.teamSlug as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selections, setSelections] = useState<Record<string, { size: string; color: string; quantity: number }>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New: category tab state
  const [activeCategory, setActiveCategory] = useState('all');

  // New: search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // New: countdown timer state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [storeClosingDate, setStoreClosingDate] = useState<string>('');

  const { addItem } = useCart();

  // Countdown timer effect
  useEffect(() => {
    if (!storeClosingDate) return;

    const target = new Date(storeClosingDate).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [storeClosingDate]);

  const fetchTeamData = useCallback(async () => {
    try {
      const [teamRes, productsRes, leaderboardRes] = await Promise.all([
        fetch(`/api/teams/${teamSlug}`),
        fetch('/api/products'),
        fetch(`/api/teams/${teamSlug}/leaderboard`),
      ]);

      if (!teamRes.ok) {
        throw new Error('Team not found');
      }

      const [teamData, productsData, leaderboardData] = await Promise.all([
        teamRes.json(),
        productsRes.json(),
        leaderboardRes.ok ? leaderboardRes.json() : { players: [] },
      ]);

      setTeam(teamData.team);
      setPlayers(teamData.team.players || []);
      setProducts(productsData.products || []);

      // Set fundraising deadline for countdown
      if (teamData.team.fundraisingDeadline) {
        setStoreClosingDate(teamData.team.fundraisingDeadline);
      } else {
        // Fallback: 14 days from now
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 14);
        setStoreClosingDate(fallback.toISOString());
      }

      if (leaderboardData.players) {
        setLeaderboard(leaderboardData.players);
      }

      // Bundles with premium naming
      setBundles([
        {
          id: 'starter',
          name: 'The Rookie Pack',
          icon: '🎯',
          description: 'Perfect for the casual fan. Shows up on game day, represents all season.',
          items: ['6 Custom Koozies', '2 Spirit Keychains', '1 Team Decal'],
          originalTotalCents: 5289,
          priceCents: 3999,
          savePercent: 24,
          popular: false,
        },
        {
          id: 'fan-favorite',
          name: 'The All-In Bundle',
          icon: '🏆',
          description: 'The most popular combo for serious supporters. Everything you need to rep the team from head to toe.',
          items: ['12 Custom Koozies', '4 Spirit Keychains', '2 Team Decals', '1 Koozie Wrap'],
          originalTotalCents: 9783,
          priceCents: 6999,
          savePercent: 28,
          popular: true,
        },
        {
          id: 'full-gear',
          name: 'The Ultimate Package',
          icon: '💪',
          description: 'For the ultimate superfan. Complete gear package with premium hoodie, insulated bottle, and enough koozies to supply the whole section.',
          items: ['1 Premium Hoodie', '12 Custom Koozies', '4 Spirit Keychains', '2 Team Decals', '1 Insulated Water Bottle'],
          originalTotalCents: 17182,
          priceCents: 11999,
          savePercent: 30,
          popular: false,
        },
      ]);

      // Initialize selections with defaults
      const initial: Record<string, { size: string; color: string; quantity: number }> = {};
      productsData.products.forEach((p: Product) => {
        initial[p.id] = {
          size: p.sizes[0] || '',
          color: p.colors[0] || '',
          quantity: 1,
        };
      });
      setSelections(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleAddToCart = (product: Product) => {
    const sel = selections[product.id];
    if (!sel || !sel.size || !sel.color) {
      alert('Please select size and color');
      return;
    }

    if (!selectedPlayer) {
      alert('Please select a player to support');
      return;
    }

    const cartItem = {
      id: `${product.id}-${selectedPlayer.id}-${sel.size}-${sel.color}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      playerId: selectedPlayer.id,
      playerName: `#${selectedPlayer.number} ${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
      size: sel.size,
      color: sel.color,
      quantity: sel.quantity,
      unitPriceCents: product.basePriceCents,
    };

    addItem(cartItem);
  };

  const handleAddBundleToCart = (bundle: Bundle) => {
    if (!selectedPlayer) {
      alert('Please select a player to support');
      return;
    }

    const cartItem = {
      id: `bundle-${bundle.id}-${selectedPlayer.id}-${Date.now()}`,
      productId: `bundle-${bundle.id}`,
      productName: bundle.name,
      imageUrl: null,
      playerId: selectedPlayer.id,
      playerName: `#${selectedPlayer.number} ${selectedPlayer.firstName} ${selectedPlayer.lastName}`,
      size: 'One Size',
      color: 'Multi',
      quantity: 1,
      unitPriceCents: bundle.priceCents,
    };

    addItem(cartItem);
  };

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Apply category filter
    if (activeCategory !== 'all' && activeCategory !== 'bundles') {
      const categoryKeys = CATEGORY_MAP[activeCategory] || [];
      filtered = filtered.filter((p) => categoryKeys.includes(p.category));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Apply sort
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.basePriceCents - b.basePriceCents);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.basePriceCents - a.basePriceCents);
    }

    return filtered;
  }, [products, activeCategory, searchQuery, sortBy]);

  // Show bundles section when bundles tab active
  const showBundles = activeCategory === 'bundles';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontFamily: 'Oswald, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Team Not Found</h1>
          <p style={{ color: '#9CA3AF', marginTop: '8px' }}>{error || 'This team store does not exist.'}</p>
        </div>
      </div>
    );
  }

  const closingDateDisplay = storeClosingDate
    ? new Date(storeClosingDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : 'TBD';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: 'white' }}>
      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#0A0A0A', borderBottom: '1px solid #1E1E1E', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href={`/store/${teamSlug}`} style={{ display: 'flex', alignItems: 'center' }}>
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} style={{ height: '72px', width: 'auto' }} />
            ) : (
              <div style={{ height: '72px', width: '72px', borderRadius: '50%', backgroundColor: '#141414', border: '2px solid #E63946', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                {team.name.charAt(0)}
              </div>
            )}
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <CartButton />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}
          >
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'white', transition: 'all 0.2s', transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'white', transition: 'all 0.2s', opacity: mobileMenuOpen ? 0 : 1 }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'white', transition: 'all 0.2s', transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }}></span>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0A0A0A', zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px' }}>
          <Link href={`/store/${teamSlug}`} onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Shop
          </Link>
          <a href="#leaderboard" onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Leaderboard
          </a>
          <a href="#share" onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Share
          </a>
        </div>
      )}

      {/* COUNTDOWN TIMER BANNER */}
      <div style={{ backgroundColor: 'rgba(230, 57, 70, 0.1)', borderBottom: '1px solid #E63946', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E63946', marginBottom: '8px' }}>
          ⏰ Ordering Closes: {closingDateDisplay} at 11:59 PM — {team.name} Fundraiser
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontFamily: 'Oswald, sans-serif' }}>
          {[
            { value: countdown.days, label: 'Days' },
            { value: countdown.hours, label: 'Hours' },
            { value: countdown.minutes, label: 'Minutes' },
            { value: countdown.seconds, label: 'Seconds' },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px' }}>
              <div style={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', fontSize: '24px', fontWeight: 'bold', color: 'white', minWidth: '50px', textAlign: 'center' }}>
                {String(value).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STORE POLICY NOTICE */}
      <div style={{ backgroundColor: '#111', borderBottom: '1px solid #1E1E1E', padding: '12px 20px', textAlign: 'center' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E63946' }}>
          ⚠️ Orders Delivered 3-4 Weeks After Store Closes • All Items Are Customized and May Not Be Returned
        </span>
      </div>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px', textAlign: 'center', background: 'linear-gradient(to bottom right, #0A0A0A, #1A0A0A)', borderBottom: '4px solid #E63946' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, transparent, rgba(230,57,70,0.15))', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ width: '120px', height: '120px', margin: '0 auto 24px', borderRadius: '50%', border: '3px solid #E63946', backgroundColor: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: '48px', fontWeight: 'bold', color: '#E63946', boxShadow: '0 0 40px rgba(230,57,70,0.3)' }}>
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              team.name.charAt(0)
            )}
          </div>
          <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', lineHeight: 1.1 }}>
            Represent Your Team.<br />
            <span style={{ color: '#E63946' }}>Every Purchase Goes Directly to Our Players.</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#D1D5DB', marginBottom: '8px', maxWidth: '640px', margin: '0 auto 8px' }}>
            Custom gear. Player-selected designs. 100% of profits fund uniforms, travel, and equipment.
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            You shop. They play. It's that simple.
          </p>
          <div style={{ marginTop: '32px' }}>
            <a
              href="#products"
              style={{ display: 'inline-block', padding: '16px 32px', borderRadius: '8px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '18px', transition: 'opacity 0.2s', backgroundColor: '#E63946', color: 'white' }}
            >
              Support Our Team
            </a>
          </div>
        </div>
      </section>

      {/* WHY SHOP WITH US */}
      <section style={{ padding: '48px 0', backgroundColor: '#080808', borderBottom: '1px solid #1E1E1E' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {[
              { icon: '💰', title: '100% Goes to the Team', desc: 'Every dollar you spend directly funds player gear, travel, and equipment. No middlemen, no deductions.' },
              { icon: '✋', title: 'Player-Picked Designs', desc: "Each item is chosen and approved by the players themselves. You're wearing what they believe in." },
              { icon: '🏆', title: 'Premium Quality', desc: "Quality materials that last — because supporting your team shouldn't mean replacing gear every season." },
              { icon: '🚀', title: 'Fast Shipping', desc: 'Orders ship within 3-5 business days. Get your gear in time for the next big game.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ backgroundColor: '#111', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</div>
                <p style={{ fontSize: '14px', color: '#9CA3AF' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAYER SELECTOR */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }} id="products">
        <div style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            👇 Who are you supporting today?
          </label>
          <select
            value={selectedPlayer?.id || ''}
            onChange={(e) => {
              const player = players.find((p) => p.id === e.target.value);
              setSelectedPlayer(player || null);
            }}
            style={{ width: '100%', maxWidth: '480px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #2A2A2A', fontSize: '16px', outline: 'none' }}
          >
            <option value="">-- Select Your Favorite Player --</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                #{player.number} {player.firstName} {player.lastName} — {player.position}
              </option>
            ))}
          </select>

          {selectedPlayer && (
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9999px', backgroundColor: 'rgba(230,57,70,0.15)', border: '1px solid #E63946', color: 'white' }}>
              <svg style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              You're backing: <span style={{ fontWeight: 'bold', color: '#E63946' }}>#{selectedPlayer.number} {selectedPlayer.firstName} {selectedPlayer.lastName}</span>
            </div>
          )}
        </div>

        {/* CATEGORY TABS */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px', borderBottom: '1px solid #1E1E1E' }}>
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                padding: '12px 24px',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: 'none',
                borderBottom: activeCategory === key ? '3px solid #E63946' : '3px solid transparent',
                background: 'none',
                color: activeCategory === key ? '#E63946' : '#9CA3AF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* SEARCH + SORT */}
        {!showBundles && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '8px', backgroundColor: '#141414', color: 'white', border: '1px solid #2A2A2A', fontSize: '14px', outline: 'none' }}
              />
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', fill: 'none', stroke: '#888', strokeWidth: 2 }} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#888', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
                style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#141414', color: 'white', border: '1px solid #2A2A2A', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* PRODUCTS GRID */}
      {!showBundles && (
        <section style={{ padding: '0 24px 64px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <p style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', textTransform: 'uppercase' }}>No products found</p>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Try adjusting your search or filter</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                {filteredProducts.map((product) => {
                  const imageUrl = CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES.accessories;
                  const embellishment = CATEGORY_EMBELLISHMENT[product.category] || 'Print';
                  const isBestSeller = product.category === 'hoodies';

                  return (
                    <div
                      key={product.id}
                      style={{
                        backgroundColor: '#F5F5F5',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Best Seller Badge */}
                      {isBestSeller && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#E63946', color: 'white', fontSize: '11px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '4px', zIndex: 10 }}>
                          Best Seller
                        </div>
                      )}

                      {/* Product Image */}
                      <div style={{ position: 'relative', height: '200px', overflow: 'hidden', backgroundColor: '#E8E8E8' }}>
                        <img
                          src={imageUrl}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop';
                          }}
                        />
                        {/* Embellishment Label */}
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '10px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '4px' }}>
                          {embellishment}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', color: '#1A1A1A' }}>
                        <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', color: '#111' }}>
                          {product.name}
                        </h3>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#E63946', marginBottom: '12px', fontFamily: 'Oswald, sans-serif' }}>
                          {formatCents(product.basePriceCents)}
                        </p>

                        {/* Size Selector */}
                        {product.sizes.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', marginBottom: '6px', letterSpacing: '0.05em' }}>Size</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {product.sizes.map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setSelections((prev) => ({
                                    ...prev,
                                    [product.id]: { ...prev[product.id], size },
                                  }))}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    border: '1px solid #ccc',
                                    backgroundColor: selections[product.id]?.size === size ? '#E63946' : 'white',
                                    color: selections[product.id]?.size === size ? 'white' : '#333',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color Selector */}
                        {product.colors.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: '#666', marginBottom: '6px', letterSpacing: '0.05em' }}>Color</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {product.colors.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setSelections((prev) => ({
                                    ...prev,
                                    [product.id]: { ...prev[product.id], color },
                                  }))}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    border: '1px solid #ccc',
                                    backgroundColor: selections[product.id]?.color === color ? '#E63946' : 'white',
                                    color: selections[product.id]?.color === color ? 'white' : '#333',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quantity + Add to Cart */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              onClick={() => setSelections((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  quantity: Math.max(1, (prev[product.id]?.quantity || 1) - 1),
                                },
                              }))}
                              style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: '#ddd', color: '#333', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              −
                            </button>
                            <span style={{ width: '28px', textAlign: 'center', fontWeight: 600, color: '#111' }}>
                              {selections[product.id]?.quantity || 1}
                            </span>
                            <button
                              onClick={() => setSelections((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  quantity: (prev[product.id]?.quantity || 1) + 1,
                                },
                              }))}
                              style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: '#ddd', color: '#333', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!selectedPlayer}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '6px',
                              fontFamily: 'Oswald, sans-serif',
                              fontWeight: 600,
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              border: 'none',
                              cursor: selectedPlayer ? 'pointer' : 'not-allowed',
                              backgroundColor: selectedPlayer ? '#E63946' : '#ccc',
                              color: selectedPlayer ? 'white' : '#888',
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {selectedPlayer ? 'Add to Cart' : 'Select Player'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SOCIAL PROOF STRIP */}
      {!showBundles && (
        <section style={{ padding: '0 24px 64px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '9999px', backgroundColor: 'rgba(230,57,70,0.1)', border: '1px solid #E63946', fontSize: '14px', color: '#D1D5DB' }}>
                  <span style={{ color: '#E63946' }}>★★★★★</span>
                  <span>Trusted by 200+ teams across the country</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center' }}>
                {[
                  { icon: '🚚', title: 'Free Shipping on Orders Over $100' },
                  { icon: '✅', title: '30-Day Satisfaction Guarantee' },
                  { icon: '⚡', title: 'Ships Within 3-5 Business Days' },
                ].map(({ icon, title }) => (
                  <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '24px' }}>{icon}</div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section style={{ padding: '64px 0', backgroundColor: '#080808', borderTop: '1px solid #1E1E1E' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '8px', position: 'relative' }}>
            Common Questions
            <span style={{ display: 'block', width: '60px', height: '3px', backgroundColor: '#E63946', margin: '16px auto 0' }}></span>
          </h2>
          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { q: 'Does my purchase actually help the team?', a: 'Yes — 100% of profits after payment processing go directly to your team\'s budget. You\'re not buying from us, you\'re buying for them.' },
              { q: 'How long does shipping take?', a: 'Orders ship within 3-5 business days. You\'ll get a tracking number emailed the moment it ships.' },
              { q: 'Can I buy for multiple players in one order?', a: 'Each item is tied to one player at checkout. Place a separate order for each player you want to support.' },
              { q: 'What if something doesn\'t fit or gets damaged?', a: 'Contact us and we\'ll replace it at no charge. We want every fan to be completely satisfied.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ backgroundColor: '#111', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: '#E63946' }}>
                  {q}
                </h3>
                <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUNDLES */}
      <section style={{ padding: '64px 0', backgroundColor: '#0A0A0A', borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '8px' }}>
            Bundle & Save
            <span style={{ display: 'block', width: '60px', height: '3px', backgroundColor: '#E63946', margin: '16px auto 0' }}></span>
          </h2>
          <p style={{ textAlign: 'center', color: '#9CA3AF', maxWidth: '512px', margin: '16px auto 40px' }}>
            Stock up and save big. Bundles are the smartest way to get everything you need at the best price.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                style={{
                  backgroundColor: '#141414',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  border: bundle.popular ? '2px solid #E63946' : '2px solid #1E1E1E',
                  position: 'relative',
                }}
              >
                {bundle.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#E63946', color: 'white', fontSize: '12px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 16px', borderRadius: '9999px' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{bundle.icon}</div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{bundle.name}</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '20px', lineHeight: 1.5 }}>{bundle.description}</div>
                <div style={{ backgroundColor: '#0D0D0D', borderRadius: '8px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  {bundle.items.map((item, i) => (
                    <div key={i} style={{ fontSize: '14px', color: '#9CA3AF', padding: '4px 0', borderBottom: i < bundle.items.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                      <span style={{ color: '#E63946', fontWeight: 'bold' }}>✓ </span>{item}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '18px', textDecoration: 'line-through', color: '#6B7280', marginBottom: '4px' }}>
                  {formatCents(bundle.originalTotalCents)}
                </div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '32px', fontWeight: 'bold', color: '#E63946', marginBottom: '4px' }}>
                  {formatCents(bundle.priceCents)}
                </div>
                <div style={{ fontSize: '14px', color: '#22C55E', fontWeight: 600, marginBottom: '20px' }}>Save {bundle.savePercent}%</div>
                <button
                  onClick={() => handleAddBundleToCart(bundle)}
                  disabled={!selectedPlayer}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    border: 'none',
                    cursor: selectedPlayer ? 'pointer' : 'not-allowed',
                    backgroundColor: selectedPlayer ? '#E63946' : '#374151',
                    color: selectedPlayer ? 'white' : '#9CA3AF',
                    transition: 'opacity 0.2s',
                  }}
                >
                  Add Bundle to Cart →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERBOARD */}
      {leaderboard.length > 0 && (
        <section style={{ padding: '64px 0', background: 'linear-gradient(to bottom, #0A0A0A, #0D0D0D)' }} id="leaderboard">
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '8px' }}>
              Meet the Players You're Supporting
              <span style={{ display: 'block', width: '60px', height: '3px', backgroundColor: '#E63946', margin: '16px auto 0' }}></span>
            </h2>
            <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '8px', maxWidth: '512px', margin: '16px auto' }}>
              The more you shop, the higher they climb.
            </p>
            <p style={{ textAlign: 'center', marginBottom: '40px' }}>
              <span style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '9999px', backgroundColor: 'rgba(230,57,70,0.15)', border: '1px solid #E63946', fontSize: '14px', color: '#D1D5DB' }}>
                Want your name on the leaderboard? Shop above and select your favorite player.
              </span>
            </p>
            <div style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden', maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px', padding: '16px', backgroundColor: '#E63946', fontFamily: 'Oswald, sans-serif', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span>#</span>
                <span>Player</span>
                <span style={{ textAlign: 'right' }}>Items Sold</span>
              </div>
              {leaderboard.slice(0, 8).map((player, index) => (
                <div
                  key={player.id}
                  style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px', padding: '16px', borderBottom: '1px solid #1E1E1E', alignItems: 'center', fontFamily: 'Oswald, sans-serif', fontSize: '16px', transition: 'background 0.15s' }}
                >
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'white',
                    }}
                  >
                    {index + 1}
                  </span>
                  <Link
                    href={`/store/${teamSlug}/player/${player.slug}`}
                    style={{ color: 'white', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none' }}
                  >
                    #{player.number} {player.firstName} {player.lastName}
                  </Link>
                  <span style={{ textAlign: 'right', fontWeight: 'bold', color: '#E63946' }}>
                    {player.itemsSold || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SHARE */}
      <section style={{ padding: '64px 0', backgroundColor: '#0A0A0A' }} id="share">
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '8px' }}>
            Spread the Word
            <span style={{ display: 'block', width: '60px', height: '3px', backgroundColor: '#E63946', margin: '16px auto 0' }}></span>
          </h2>
          <p style={{ textAlign: 'center', color: '#9CA3AF', maxWidth: '512px', margin: '16px auto 40px' }}>
            The more fans that shop, the more our players earn. Share the store with friends, family, and fellow supporters.
          </p>
          <div style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '40px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: '180px', height: '180px', backgroundColor: 'white', borderRadius: '12px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#374151', fontWeight: 'bold', padding: '16px', textAlign: 'center', flexDirection: 'column', gap: '8px' }}>
<span style={{ fontSize: '32px' }}>[QR]</span>
              <span style={{ fontSize: '12px' }}>QR CODE</span>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>rosterraise.com/{teamSlug}</span>
            </div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Scan to Support {team.name}
            </div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '28px' }}>
              rosterraise.com/{teamSlug}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://rosterraise.com/${teamSlug}`);
                }}
                style={{ padding: '12px 24px', borderRadius: '8px', fontFamily: 'Oswald, sans-serif', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#374151', color: 'white', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
              >
                📋 Copy Link
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support ${team.name}! 🏈 Check out their team store — every purchase goes directly to our players. Shipping is fast and quality is premium. 🏈🔥`)}&url=${encodeURIComponent(`https://rosterraise.com/${teamSlug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '12px 24px', borderRadius: '8px', fontFamily: 'Oswald, sans-serif', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#000', color: 'white', border: '1px solid #333', textDecoration: 'none', transition: 'opacity 0.2s' }}
              >
                𝕏 Share on X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://rosterraise.com/${teamSlug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '12px 24px', borderRadius: '8px', fontFamily: 'Oswald, sans-serif', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#1877F2', color: 'white', textDecoration: 'none', transition: 'opacity 0.2s' }}
              >
                📘 Share on Facebook
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#060606', padding: '40px 0', borderTop: '1px solid #111' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
              {team.name} <span style={{ color: '#E63946' }}>{team.sport}</span>
            </div>
            <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/store/${teamSlug}`} style={{ fontSize: '14px', color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>
                Shop
              </Link>
              <a href="#leaderboard" style={{ fontSize: '14px', color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>
                Leaderboard
              </a>
              <a href="#share" style={{ fontSize: '14px', color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>
                Share
              </a>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '16px', textAlign: 'center' }}>
            © {new Date().getFullYear()} {team.name}. Powered by RosterRaise.
          </p>
        </div>
      </footer>
    </div>
  );
}
