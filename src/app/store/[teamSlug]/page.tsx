'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

const CATEGORY_IMAGES: Record<string, string> = {
  apparel: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
  accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
  bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
  equipment: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600',
};

const CATEGORY_EMBELLISHMENT: Record<string, string> = {
  apparel: 'Print',
  accessories: 'Print',
  bags: 'Print',
  equipment: 'Print',
};

const CATEGORIES = ['all', 'apparel', 'accessories', 'bags', 'equipment'];

const CATEGORY_MAP: Record<string, string[]> = {
  all: ['apparel', 'accessories', 'bags', 'equipment'],
  apparel: ['t-shirt', 'polo', 'dryfit-shirt', 'hoodie', 'quarter-zip', 'shorts', 'jogging-pants'],
  accessories: ['hat', 'keychain', 'can-koozie', 'magnet', 'hype-chain'],
  bags: ['bookbag', 'dufflebag'],
  equipment: ['jersey', 'lightbox'],
};

export default function TeamStorePage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selections, setSelections] = useState<Record<string, { size: string; color: string; quantity: number }>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [storeClosingDate, setStoreClosingDate] = useState<string>('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { addItem } = useCart();

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const [teamRes, productsRes, leaderboardRes] = await Promise.all([
        fetch(`/api/teams/${teamSlug}`),
        fetch(`/api/products`),
        fetch(`/api/teams/${teamSlug}/leaderboard`),
      ]);

      if (!teamRes.ok) {
        throw new Error('Team not found');
      }

      const teamData = await teamRes.json();
      const productsData = await productsRes.json();
      const leaderboardData = await leaderboardRes.json();

      setTeam(teamData);
      setPlayers(teamData.players || []);
      setProducts(productsData.products || productsData || []);
      setLeaderboard(leaderboardData.leaderboard || leaderboardData || []);

      if (teamData.fundraisingDeadline) {
        setStoreClosingDate(teamData.fundraisingDeadline);
      } else {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 14);
        setStoreClosingDate(fallback.toISOString());
      }

      const initialSelections: Record<string, { size: string; color: string; quantity: number }> = {};
      const allProducts = productsData.products || productsData || [];
      allProducts.forEach((product: Product) => {
        initialSelections[product.id] = {
          size: product.sizes?.[0] || 'M',
          color: product.colors?.[0] || 'Black',
          quantity: 1,
        };
      });
      setSelections(initialSelections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  useEffect(() => {
    if (!storeClosingDate) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const close = new Date(storeClosingDate).getTime();
      const diff = close - now;

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

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (activeCategory !== 'all') {
      const categories = CATEGORY_MAP[activeCategory] || [];
      filtered = filtered.filter((p) =>
        categories.some((cat) => p.category?.toLowerCase().includes(cat.toLowerCase()))
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.basePriceCents - b.basePriceCents);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.basePriceCents - a.basePriceCents);
    }

    return filtered;
  }, [products, activeCategory, searchQuery, sortBy]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      const selection = selections[product.id];
      if (!selection) return;

      addItem({
        id: `${product.id}-${selection.size}-${selection.color}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        playerId: selectedPlayer?.id || null,
        playerName: selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : null,
        size: selection.size,
        color: selection.color,
        quantity: selection.quantity,
        unitPriceCents: product.basePriceCents,
      });
    },
    [selections, selectedPlayer, addItem]
  );

  const handleCheckout = () => {
    router.push(`/checkout?team=${teamSlug}&player=${selectedPlayer?.id || ''}`);
  };

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
                {team?.name?.charAt(0) || 'T'}
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
            <span style={{ width: '24px', height: '2px', backgroundColor: 'white', display: 'block' }}></span>
            <span style={{ width: '24px', height: '2px', backgroundColor: 'white', display: 'block' }}></span>
            <span style={{ width: '24px', height: '2px', backgroundColor: 'white', display: 'block' }}></span>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: '100px', left: 0, right: 0, backgroundColor: '#141414', zIndex: 40, padding: '20px', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href={`/store/${teamSlug}`} style={{ color: 'white', textDecoration: 'none', fontSize: '18px' }}>Shop</Link>
            <a href="#share" style={{ color: 'white', textDecoration: 'none', fontSize: '18px' }}>Share</a>
          </div>
        </div>
      )}

      {/* HERO */}
      <div style={{ padding: '60px 40px', textAlign: 'center', borderBottom: '1px solid #1E1E1E' }}>
        <h1 style={{ fontSize: '48px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', marginBottom: '16px' }}>
          {team?.name || 'Team'} Fundraiser
        </h1>
        <p style={{ fontSize: '18px', color: '#9CA3AF', marginBottom: '24px' }}>
          Support your team! Every purchase goes directly to our fundraiser.
        </p>
        {/* COUNTDOWN */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', color: '#E63946' }}>{countdown.days}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>Days</div>
          </div>
          <div style={{ fontSize: '36px', color: '#E63946' }}>:</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', color: '#E63946' }}>{countdown.hours}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>Hours</div>
          </div>
          <div style={{ fontSize: '36px', color: '#E63946' }}>:</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', color: '#E63946' }}>{countdown.minutes}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>Minutes</div>
          </div>
          <div style={{ fontSize: '36px', color: '#E63946' }}>:</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'Oswald, sans-serif', color: '#E63946' }}>{countdown.seconds}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase' }}>Seconds</div>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>Store closes {closingDateDisplay}</p>
      </div>

      {/* TOP FUNDRAISERS - Inline Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ padding: '40px', backgroundColor: '#111111', borderBottom: '1px solid #1A1A1A' }}>
          <h2 style={{ fontSize: '28px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px', color: '#FFFFFF' }}>
            TOP FUNDRAISERS
          </h2>
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaderboard.slice(0, 8).map((player, index) => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #1A1A1A' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: index < 3 ? '#0A0A0A' : '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '16px' }}>{player.firstName} {player.lastName}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '12px' }}>#{player.number || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#E63946', fontWeight: 'bold', fontSize: '16px', fontFamily: 'Oswald, sans-serif' }}>{player.itemsSold || 0}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '11px', textTransform: 'uppercase' }}>items sold</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECT PLAYER */}
      <div style={{ padding: '40px', borderBottom: '1px solid #1E1E1E' }}>
        <h2 style={{ fontSize: '28px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
          Select a Player to Support
        </h2>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              style={{
                padding: '16px 24px',
                borderRadius: '8px',
                border: selectedPlayer?.id === player.id ? '2px solid #E63946' : '2px solid #374151',
                backgroundColor: selectedPlayer?.id === player.id ? '#1A1A1A' : 'transparent',
                cursor: 'pointer',
                minWidth: '180px',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E63946', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'white', fontFamily: 'Oswald, sans-serif' }}>
                  {player?.firstName?.charAt(0) || ''}{player?.lastName?.charAt(0) || ''}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{player.firstName} {player.lastName}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '12px' }}>#{player.number} · {player.position}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {selectedPlayer && (
          <p style={{ textAlign: 'center', color: '#E63946', marginTop: '16px', fontSize: '14px' }}>
            Supporting: {selectedPlayer.firstName} {selectedPlayer.lastName}
          </p>
        )}
      </div>

      {/* CATEGORY TABS */}
      <div style={{ padding: '20px 40px', borderBottom: '1px solid #1E1E1E', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeCategory === cat ? '#E63946' : '#1E1E1E',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* SEARCH AND SORT */}
      <div style={{ padding: '20px 40px', display: 'flex', gap: '16px', borderBottom: '1px solid #1E1E1E', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #374151',
            backgroundColor: '#141414',
            color: 'white',
            fontSize: '14px',
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #374151',
            backgroundColor: '#141414',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {/* PRODUCT GRID */}
      <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {filteredProducts.map((product) => (
          <div key={product.id} style={{ backgroundColor: '#141414', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1E1E1E' }}>
            <div style={{ height: '200px', backgroundColor: '#1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: '#6B7280', fontSize: '14px' }}>No image</div>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Oswald, sans-serif' }}>{product.name}</h3>
              <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '12px' }}>{product.description}</p>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#E63946', marginBottom: '16px', fontFamily: 'Oswald, sans-serif' }}>
                {formatCents(product.basePriceCents)}
              </div>

              {/* SIZE SELECTOR */}
              {product.sizes && product.sizes.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Size</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelections((prev) => ({ ...prev, [product.id]: { ...prev[product.id], size } }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: selections[product.id]?.size === size ? '2px solid #E63946' : '1px solid #374151',
                          backgroundColor: selections[product.id]?.size === size ? '#1A1A1A' : 'transparent',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COLOR SELECTOR */}
              {product.colors && product.colors.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Color</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelections((prev) => ({ ...prev, [product.id]: { ...prev[product.id], color } }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: selections[product.id]?.color === color ? '2px solid #E63946' : '1px solid #374151',
                          backgroundColor: selections[product.id]?.color === color ? '#1A1A1A' : 'transparent',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ADD TO CART */}
              <button
                onClick={() => handleAddToCart(product)}
                disabled={!product.inStock}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: product.inStock ? '#E63946' : '#374151',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: product.inStock ? 'pointer' : 'not-allowed',
                  fontFamily: 'Oswald, sans-serif',
                }}
              >
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#9CA3AF', fontSize: '18px' }}>No products found matching your criteria.</p>
        </div>
      )}

      {/* SOCIAL PROOF */}
      <div style={{ padding: '60px 40px', backgroundColor: '#141414', borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E' }}>
        <h2 style={{ fontSize: '32px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px' }}>
          Trusted by Teams Nationwide
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>500+</div>
            <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Teams</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>$2M+</div>
            <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Raised</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>50K+</div>
            <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Products Sold</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '60px 40px', backgroundColor: '#111111', borderTop: '1px solid #1A1A1A' }}>
        <h2 style={{ fontSize: '32px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px', color: '#FFFFFF' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[
            { q: 'When will my order arrive?', a: 'Orders typically ship within 5-7 business days after the store closes. Delivery takes an additional 3-5 days.' },
            { q: 'How does my purchase support the team?', a: 'Every purchase supports your team — 100% of proceeds go directly to the team fundraiser. You select which player to support when ordering.' },
            { q: 'Can I return or exchange items?', a: 'Due to the custom nature of team merchandise, all sales are final. Please check sizing charts carefully before ordering.' },
            { q: 'What if I have issues with my order?', a: 'Contact us and we will help resolve any issues with your order as quickly as possible.' },
          ].map((faq, i) => (
            <div key={i} style={{ backgroundColor: '#111111', padding: '24px', borderRadius: '8px', border: '1px solid #1A1A1A' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Oswald, sans-serif', color: '#FFFFFF' }}>{faq.q}</h3>
              <p style={{ color: '#BBBBBB', fontSize: '14px', lineHeight: '1.6' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CHECKOUT BUTTON */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 50 }}>
        <button
          onClick={handleCheckout}
          style={{
            padding: '16px 32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#E63946',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif',
            boxShadow: '0 4px 20px rgba(230, 57, 70, 0.4)',
          }}
        >
          Checkout
        </button>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '40px', borderTop: '1px solid #1E1E1E', backgroundColor: '#0A0A0A' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <Link href={`/store/${teamSlug}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} style={{ height: '48px', width: 'auto' }} />
              ) : (
                <div style={{ height: '48px', width: '48px', borderRadius: '50%', backgroundColor: '#141414', border: '2px solid #E63946', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#E63946', fontFamily: 'Oswald, sans-serif' }}>
                  {team?.name?.charAt(0) || 'T'}
                </div>
              )}
              <span style={{ marginLeft: '12px', fontSize: '24px', fontFamily: 'Oswald, sans-serif', fontWeight: 'bold', color: 'white' }}>{team.name}</span>
            </Link>
            <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/store/${teamSlug}`} style={{ fontSize: '14px', color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>
                Shop
              </Link>
              <a href="#share" style={{ fontSize: '14px', color: '#9CA3AF', textDecoration: 'none', transition: 'color 0.2s' }}>
                Share
              </a>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '16px', textAlign: 'center' }}>
            © {new Date().getFullYear()} {team?.name || 'Team'}. Powered by RosterRaise.
          </p>
        </div>
      </footer>
    </div>
  );
}
