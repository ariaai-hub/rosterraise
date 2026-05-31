'use client';

import { useState } from 'react';

// Nav component
function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav>
        <div className="nav-logo">
          <a href="/">
            <span className="logo-text">
              <span className="white">ROSTER</span>
              <span className="red">RAISE</span>
            </span>
          </a>
        </div>
        <button
          className="nav-hamburger"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="nav-right">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="/auth/login" className="nav-link-signin">Sign In</a>
          <a href="/auth/register" className="btn-nav">Start Free Store</a>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? ' active' : ''}`}>
        <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setMobileOpen(false)}>How It Works</a>
        <a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
        <a href="/auth/register" onClick={() => setMobileOpen(false)}>Start Free Store</a>
      </div>
    </>
  );
}

// FAQ Accordion
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item${isOpen ? ' is-open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question">
        {question}
        <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
      </div>
      <div className="faq-answer">
        <div className="faq-answer-inner">{answer}</div>
      </div>
    </div>
  );
}

// Main Page
export default function HomePage() {
  const [formData, setFormData] = useState({
    name: '',
    teamName: '',
    email: '',
    confirmEmail: '',
    sport: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      name: formData.name,
      team: formData.teamName,
      email: formData.email,
      sport: formData.sport,
    });
    window.location.href = `/auth/register?${params.toString()}`;
  };

  const features = [
    {
      title: 'Your Store, Live in 5 Minutes',
      body: 'Answer 3 questions. Pick your colors. Your store goes live immediately — no design skills, no technical setup required.',
    },
    {
      title: 'Zero Inventory Risk',
      body: 'We print and ship every order. You never buy a box, worry about sizes, or handle returns. You just share the link.',
    },
    {
      title: 'Fans Buy to Support Players',
      body: 'Each product is tied to a player. The leaderboard gamifies giving — parents and fans compete to support their favorite athletes.',
    },
{
      title: 'Bi-Weekly Payouts, Automatic',
      body: 'Every other Friday, profits transfer directly to your account. No invoicing. No chasing checks. No awkward conversations.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Create Your Store',
      body: 'Takes 5 minutes. Pick your sport, upload your logo, choose your products. We handle the rest.',
    },
    {
      step: '2',
      title: 'Share Your Link',
      body: 'We give you a ready-to-post landing page, email template, and social graphics. You just share the link.',
    },
    {
      step: '3',
      title: 'Orders Roll In',
      body: 'We handle printing, shipping, and customer service. You focus on coaching.',
    },
  ];

  const testimonials = [
    {
      quote: 'I raised $12,400 in one season without touching a single product. My booster club president was shocked.',
      name: 'Marcus Thompson',
      role: 'Basketball Coach, Austin TX',
    },
    {
      quote: 'We used to spend 3 weeks organizing our biggest fundraiser. Last year with RosterRaise, I did nothing but share a link.',
      name: 'Jennifer Rodriguez',
      role: 'Athletic Director, Dallas TX',
    },
    {
      quote: 'The leaderboard got parents more excited than the games themselves. Our engagement increased 300%.',
      name: 'David Martinez',
      role: 'Football Coach, Houston TX',
    },
  ];

  const faqs = [
    {
      question: 'What sports work with RosterRaise?',
      answer: 'All of them. Basketball, football, soccer, volleyball, baseball, track, wrestling — if your team has fans, we work.',
    },
    {
      question: 'Do we need to buy inventory upfront?',
      answer: 'No. We operate on-demand. You only pay for what your community orders, and those costs come out of the profits — not your pocket.',
    },
    {
      question: 'How does the money get to our team?',
      answer: 'Every other Friday, we transfer the prior two weeks\' profits directly to your bank account. No invoicing, no waiting 30 days.',
    },
    {
      question: 'Who handles customer service and returns?',
      answer: 'We do. Our support team handles every customer question, every reprint request, every return. You focus on coaching.',
    },
  ];

  return (
    <main style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Nav />

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1 style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif', display: 'flex', flexDirection: 'column', gap: 0, margin: 0, padding: 0, lineHeight: '78px' }}>
              <span style={{ display: 'block', marginBottom: 0 }}>Your Team.</span>
              <span style={{ display: 'block', marginBottom: 0 }}>Your Store.</span>
              <span className="red" style={{ display: 'block', marginBottom: 0 }}>Your Commission.</span>
            </h1>
            <p className="subhead">
              Stop chasing fundraisers nobody wants. RosterRaise gives your team thirty percent of every sale — custom koozies, hoodies, gear parents actually buy. We handle everything else. Turn your roster into a fundraising machine in 48 hours.
            </p>
          </div>
          <div className="hero-right">
            <div className="hero-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80"
                alt="Youth sports team with custom gear"
                className="hero-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.img-placeholder') as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div className="img-placeholder" style={{ display: 'none' }}>
                <svg viewBox="0 0 24 24" fill="#444">
                  <path d="M12 2C8 2 5 5 5 9c0 3 2 6 5 8 1 .6 2 1.4 2 2.5V22h2v-2.5c0-1.1 1-1.9 2-2.5 3-2 5-5 5-8 0-4-3-7-7-7zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
                <span>Team Spirit Products</span>
              </div>
            </div>
            <div className="hero-earnings-badge">
              <div className="eb-amount">$3,400</div>
              <div className="eb-label">Avg first-season<br />earnings per team</div>
            </div>
          </div>
        </div>
      </section>

      {/* HERO FORM */}
      <section id="hero-form" style={{ background: 'var(--black)', padding: '0 0 80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div className="hero-form">
            <label className="hero-form-label">Start Your Team Store — Takes 2 Minutes</label>
            <form onSubmit={handleSubmit}>
              <div className="hero-form-row">
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  className="form-input"
                  type="text"
                  name="teamName"
                  placeholder="Team / Organization Name"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                />
              </div>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ marginBottom: '10px' }}
              />
              <input
                className="form-input"
                type="email"
                name="confirmEmail"
                placeholder="Confirm Email Address"
                value={formData.confirmEmail}
                onChange={handleChange}
                required
                style={{ marginBottom: '10px' }}
              />
              <select
                className="form-select"
                name="sport"
                value={formData.sport}
                onChange={handleChange}
                required
              >
                <option value="">Select Your Sport</option>
                <option>Basketball</option>
                <option>Football</option>
                <option>Soccer</option>
                <option>Baseball</option>
                <option>Softball</option>
                <option>Volleyball</option>
                <option>Swimming</option>
                <option>Track & Field</option>
                <option>Lacrosse</option>
                <option>Hockey</option>
                <option>Tennis</option>
                <option>Golf</option>
                <option>Wrestling</option>
                <option>Gymnastics</option>
                <option>Cheerleading / Dance</option>
                <option>Other Youth Sports</option>
              </select>
              <button type="submit" className="btn-hero-cta">Start My Team Store →</button>
              <p className="hero-trust">
                <span>250+ teams funded</span> &nbsp;|&nbsp; <span>No minimums</span> &nbsp;|&nbsp; <span>No catch — ever</span>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section className="social-strip">
        <div className="social-strip-inner">
          <div className="social-stat">
            <span className="social-stat-num">200+</span>
            <span className="social-stat-label">Teams</span>
          </div>
          <div className="social-divider"></div>
          <div className="social-stat">
            <span className="social-stat-num">40</span>
            <span className="social-stat-label">States</span>
          </div>
          <div className="social-divider"></div>
          <div className="social-stat">
            <span className="social-stat-num">$2.4M</span>
            <span className="social-stat-label">Raised for Players</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-label">Features</div>
          <div className="section-headline">Everything You Need to Fundraise Without the Headache</div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-label">Process</div>
          <div className="section-headline">How RosterRaise Works</div>
          <div className="steps-grid">
            {howItWorks.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.step}</div>
                <h3 style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif', fontSize: '24px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-label">Social Proof</div>
          <div className="section-headline">Coaches Love RosterRaise</div>
          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-footer">
                  <div className="testimonial-avatar">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="container-narrow">
          <div className="section-label">Pricing</div>
          <div className="section-headline">Simple, Transparent Pricing</div>
          <div className="pricing-card">
            <div className="pricing-headline">30% Commission. Bi-Weekly Payouts.</div>
            <p className="pricing-body">
              We make money only when you make money. Every sale your team makes earns you commission — deposited directly to your account every two weeks. Average first-season earnings: $3,400.
            </p>
            <a href="/auth/register" className="pricing-cta">Start Your Free Store</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container-narrow">
          <div className="section-label">FAQ</div>
          <div className="section-headline">Questions? We Have Answers.</div>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="final-cta-inner">
          <h2>Ready to Stop Begging for Fundraiser Volunteers?</h2>
          <a href="/auth/register" className="final-cta-btn">Start Your Free Store — It&apos;s Actually Free</a>
          <p className="final-cta-sub">or <a href="/store/demo-team" className="final-cta-link">explore the demo store first</a></p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-logo">
            <a href="/" className="footer-logo-text">
              <span style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif', fontSize: '22px', fontWeight: 700, letterSpacing: '2px' }}>
                <span style={{ color: 'var(--white)' }}>ROSTER</span>
                <span style={{ color: 'var(--red)' }}>RAISE</span>
              </span>
            </a>
          </div>
          <div className="footer-text">© 2025 RosterRaise. Built for coaches, by coaches.</div>
        </div>
      </footer>
    </main>
  );
}