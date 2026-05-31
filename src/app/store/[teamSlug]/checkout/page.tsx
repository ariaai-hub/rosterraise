'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCart, formatCents } from '@/lib/cart-context';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface UpsellItem {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  description: string;
}

// Suggested upsell items
const UPSELL_ITEMS: UpsellItem[] = [
  {
    id: 'upsell-cap',
    name: 'Team Cap',
    priceCents: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=120&h=120&fit=crop',
    description: 'Premium embroidered team cap',
  },
  {
    id: 'upsell-blanket',
    name: 'Stadium Blanket',
    priceCents: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?w=120&h=120&fit=crop',
    description: 'Cozy fleece blanket — perfect for game day',
  },
  {
    id: 'upsell-autograph',
    name: 'Player Autograph Card',
    priceCents: 500,
    imageUrl: 'https://images.unsplash.com/photo-1609621941371-21e8f7b8b2f3?w=120&h=120&fit=crop',
    description: 'Official team autograph card',
  },
];

const FREE_SHIPPING_THRESHOLD_CENTS = 10000;

interface PaymentFormProps {
  team: Team;
  teamSlug: string;
  clientSecret: string;
  orderId: string;
}

function PaymentForm({ team, teamSlug, clientSecret, orderId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setSubmitting(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      clearCart();
      router.push(`/store/${teamSlug}/order-confirmed/${orderId}`);
    } else {
      setError('Payment was not completed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '8px' }}>Card Details</label>
        <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px', border: '1px solid #374151' }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': { color: '#555555' },
                },
                invalid: { color: '#ff4444' },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #7f1d1d', color: '#EF4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '8px',
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 'bold',
          fontSize: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          border: 'none',
          cursor: submitting || !stripe ? 'not-allowed' : 'pointer',
          opacity: submitting || !stripe ? 0.5 : 1,
          backgroundColor: '#E63946',
          color: 'white',
          transition: 'opacity 0.2s',
        }}
      >
        {submitting ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;

  const { items, subtotalCents, addItem } = useCart();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [fetchingPaymentIntent, setFetchingPaymentIntent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState({
    shippingName: '',
    shippingEmail: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
  });

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch(`/api/teams/${teamSlug}`);
        if (!res.ok) throw new Error('Team not found');
        const data = await res.json();
        setTeam(data.team);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, [teamSlug]);

  const taxCents = Math.round(subtotalCents * 0.08);
  const shippingCents = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : 599;
  const totalCents = subtotalCents + taxCents + shippingCents;

  // Free shipping progress
  const freeShippingProgress = Math.min((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100, 100);
  const amountAwayFromFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents, 0);
  const hasFreeShipping = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setFetchingPaymentIntent(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          items: items.map((item) => ({
            productId: item.productId,
            playerId: item.playerId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            unitPriceCents: item.unitPriceCents,
          })),
          shippingName: form.shippingName,
          shippingEmail: form.shippingEmail,
          shippingAddress: form.shippingAddress,
          shippingCity: form.shippingCity,
          shippingState: form.shippingState,
          shippingZip: form.shippingZip,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setOrderId(data.order.id);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setFetchingPaymentIntent(false);
    }
  };

  // Handle adding upsell item to cart
  const handleAddUpsell = (upsellItem: UpsellItem) => {
    if (items.length === 0) return;

    const firstItem = items[0];
    const cartItem = {
      id: `upsell-${upsellItem.id}-${Date.now()}`,
      productId: upsellItem.id,
      productName: upsellItem.name,
      imageUrl: upsellItem.imageUrl,
      playerId: firstItem.playerId,
      playerName: firstItem.playerName,
      size: 'One Size',
      color: 'Multi',
      quantity: 1,
      unitPriceCents: upsellItem.priceCents,
    };

    addItem(cartItem);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontFamily: 'Oswald, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Your cart is empty</h1>
          <p style={{ color: '#9CA3AF', marginTop: '8px' }}>Add some items before checking out.</p>
          <a
            href={`/store/${teamSlug}`}
            style={{ display: 'inline-block', marginTop: '24px', padding: '12px 24px', borderRadius: '8px', backgroundColor: '#E63946', color: 'white', textDecoration: 'none', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Go to Store
          </a>
        </div>
      </div>
    );
  }

  // If we have a clientSecret, show payment form with Stripe Elements
  if (clientSecret && orderId && team) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
        <header style={{ backgroundColor: '#111', borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', fontFamily: 'Oswald, sans-serif' }}>Checkout</h1>
          </div>
        </header>
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div>
              <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment</h2>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                  <PaymentForm
                    team={team}
                    teamSlug={teamSlug}
                    clientSecret={clientSecret}
                    orderId={orderId}
                  />
                </Elements>
              </div>
            </div>
            <div>
              <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Order Summary</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '16px' }}>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.productName} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                        {item.playerName && <p style={{ fontSize: '14px', color: '#22C55E' }}>{item.playerName}</p>}
                        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.size} / {item.color} / Qty: {item.quantity}</p>
                      </div>
                      <span style={{ fontWeight: 600, color: 'white' }}>{formatCents(item.unitPriceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid #1E1E1E' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Subtotal</span><span>{formatCents(subtotalCents)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Tax (8%)</span><span>{formatCents(taxCents)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Shipping</span><span style={{ color: hasFreeShipping ? '#22C55E' : '#9CA3AF' }}>{shippingCents === 0 ? 'FREE' : formatCents(shippingCents)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: 'white', paddingTop: '8px', borderTop: '1px solid #374151' }}><span>Total</span><span>{formatCents(totalCents)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Default: show shipping form first
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A' }}>
      <header style={{ backgroundColor: '#111', borderBottom: '1px solid #1E1E1E' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', fontFamily: 'Oswald, sans-serif' }}>Checkout</h1>
        </div>
      </header>
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <div>
            <form onSubmit={handleProceedToPayment} style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Shipping Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>Full Name</label>
                  <input type="text" required value={form.shippingName}
                    onChange={(e) => setForm((f) => ({ ...f, shippingName: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374151', fontSize: '16px', outline: 'none' }}
                    placeholder="John Doe" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>Email</label>
                  <input type="email" required value={form.shippingEmail}
                    onChange={(e) => setForm((f) => ({ ...f, shippingEmail: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374151', fontSize: '16px', outline: 'none' }}
                    placeholder="john@example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>Street Address</label>
                  <input type="text" required value={form.shippingAddress}
                    onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374151', fontSize: '16px', outline: 'none' }}
                    placeholder="123 Main St" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>City</label>
                    <input type="text" required value={form.shippingCity}
                      onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374151', fontSize: '16px', outline: 'none' }}
                      placeholder="New York" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>State</label>
                    <input type="text" required value={form.shippingState}
                      onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374151', fontSize: '16px', outline: 'none' }}
                      placeholder="NY" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#9CA3AF', marginBottom: '4px' }}>ZIP Code</label>
                  <input type="text" required value={form.shippingZip}
                    onChange={(e) => setForm((f) => ({ ...f, shippingZip: e.target.value }))}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#1A1A1A', color: 'white', border: '1px solid #374141', fontSize: '16px', outline: 'none' }}
                    placeholder="10001" />
                </div>
              </div>
              {fetchError && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #7f1d1d', color: '#EF4444', fontSize: '14px' }}>{fetchError}</div>
              )}
              <button type="submit" disabled={fetchingPaymentIntent}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius: '8px',
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  border: 'none',
                  cursor: fetchingPaymentIntent ? 'not-allowed' : 'pointer',
                  opacity: fetchingPaymentIntent ? 0.5 : 1,
                  backgroundColor: '#E63946',
                  color: 'white',
                  transition: 'opacity 0.2s',
                }}>
                {fetchingPaymentIntent ? 'Preparing checkout...' : 'Continue to Payment'}
              </button>
            </form>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Order Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '16px' }}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                      {item.playerName && <p style={{ fontSize: '14px', color: '#22C55E' }}>{item.playerName}</p>}
                      <p style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.size} / {item.color} / Qty: {item.quantity}</p>
                    </div>
                    <span style={{ fontWeight: 600, color: 'white' }}>{formatCents(item.unitPriceCents * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid #1E1E1E' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Subtotal</span><span>{formatCents(subtotalCents)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Tax (8%)</span><span>{formatCents(taxCents)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9CA3AF' }}><span>Shipping</span><span style={{ color: hasFreeShipping ? '#22C55E' : '#9CA3AF' }}>{shippingCents === 0 ? 'FREE' : formatCents(shippingCents)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: 'white', paddingTop: '8px', borderTop: '1px solid #374151' }}><span>Total</span><span>{formatCents(totalCents)}</span></div>
              </div>
            </div>

            {/* FREE SHIPPING THRESHOLD */}
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>🚚</span>
                <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white' }}>
                  {hasFreeShipping ? '✓ You Earned Free Shipping!' : `$${(amountAwayFromFreeShipping / 100).toFixed(2)} Away from Free Shipping`}
                </h3>
              </div>
              {!hasFreeShipping && (
                <>
                  <div style={{ height: '8px', backgroundColor: '#1A1A1A', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${freeShippingProgress}%`, backgroundColor: '#E63946', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                  </div>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
                    {formatCents(subtotalCents)} / {formatCents(FREE_SHIPPING_THRESHOLD_CENTS)}
                  </p>
                </>
              )}
              {hasFreeShipping && (
                <p style={{ fontSize: '14px', color: '#22C55E', fontWeight: 600 }}>Free shipping on all orders over $100 — applied!</p>
              )}
            </div>

            {/* FREQUENTLY BOUGHT TOGETHER */}
            <div style={{ backgroundColor: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #1E1E1E' }}>
              <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white', marginBottom: '4px' }}>
                🎯 Complete Your Game Day Look
              </h3>
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px' }}>Frequently bought together with your order</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {UPSELL_ITEMS.map((upsell) => (
                  <div key={upsell.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
                    <img src={upsell.imageUrl} alt={upsell.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'white', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upsell.name}</p>
                      <p style={{ fontSize: '12px', color: '#9CA3AF' }}>{upsell.description}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', fontWeight: 'bold', color: '#E63946' }}>{formatCents(upsell.priceCents)}</span>
                      <button
                        onClick={() => handleAddUpsell(upsell)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontFamily: 'Oswald, sans-serif',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          border: '1px solid #E63946',
                          backgroundColor: 'transparent',
                          color: '#E63946',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
