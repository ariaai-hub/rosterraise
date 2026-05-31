'use client';

import { useState } from 'react';

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
          <a href="/partner#who" className="nav-link">Who We Serve</a>
          <a href="/partner#faq" className="nav-link">FAQ</a>
          <a href="/partner#apply" className="btn-nav">Apply Now</a>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? ' active' : ''}`}>
        <a href="/" onClick={() => setMobileOpen(false)}>Home</a>
        <a href="/partner#who" onClick={() => setMobileOpen(false)}>Who We Serve</a>
        <a href="/partner#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
        <a href="/partner#apply" onClick={() => setMobileOpen(false)}>Apply Now</a>
      </div>
    </>
  );
}

function StatStrip() {
  const stats = [
    { number: '500+', label: 'Teams on Platform' },
    { number: '$4.2M', label: 'Raised for Teams' },
    { number: '0%', label: 'Platform Fee — Forever' },
    { number: '24hr', label: 'Store Setup' },
  ];

  return (
    <section className="partner-stat-strip">
      <div className="stat-strip-inner">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-item">
            <div className="stat-number">{stat.number}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`partner-faq-item${isOpen ? ' is-open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question">
        <span>{question}</span>
        <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
      </div>
      <div className="faq-answer">
        <div className="faq-answer-inner">{answer}</div>
      </div>
    </div>
  );
}

function PartnerForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    org: '',
    role: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Partner application submitted:', formData);
    setSubmitted(true);
  };

  return (
    <section className="partner-form-section" id="apply">
      <div className="container">
        <div className="partner-form-header">
          <div className="section-label">Partner Application</div>
          <h2 className="section-headline">Ready to Bring RosterRaise to Your Network?</h2>
          <p className="partner-form-subhead">Tell us about yourself and your organization. We review every application and respond within 48 hours.</p>
        </div>
        <div className="partner-form-card">
          <div id="applySuccess" style={{ display: submitted ? 'block' : 'none' }} className="partner-success">
            <div className="success-icon">✓</div>
            <h3>Application Received</h3>
            <p>We&apos;ve got your info. Our partnerships team will reach out within 48 hours with next steps, your referral link, and everything you need to start earning.</p>
          </div>

          <div id="applyForm" style={{ display: submitted ? 'none' : 'block' }}>
            <form onSubmit={handleSubmit} id="partnerForm">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Alex Martinez"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Work Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="alex@springfieldathletics.org"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="org">Organization Name</label>
                  <input
                    type="text"
                    id="org"
                    name="org"
                    placeholder="Springfield Youth Athletics"
                    value={formData.org}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Your Role</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select your role</option>
                    <option value="director">Athletic Director</option>
                    <option value="booster">Booster Club President</option>
                    <option value="commissioner">League Commissioner</option>
                    <option value="coach">Head Coach / Travel Team Director</option>
                    <option value="admin">Organization Admin</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row single">
                <div className="form-group">
                  <label htmlFor="message">Tell us about your network and how you plan to onboard teams</label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="I run a travel baseball organization with 14 teams across the metro area. We have a weekly newsletter reaching 600+ families and I plan to present RosterRaise at our spring parent meeting..."
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                  />
                </div>
              </div>
              <button type="submit" className="btn-partner-submit">Submit Application →</button>
              <p className="form-note">No commitment. No quotas. Just a direct line to our partnerships team.</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PartnerPage() {
  const benefits = [
    {
      title: 'Dedicated Dashboard',
      body: 'Monitor every coach and team in your network from one place. Track store performance, total earnings, and team activity in real time.',
    },
    {
      title: 'Zero Cost to Your Organization',
      body: 'RosterRaise takes nothing from partner organizations. You earn commission on sales — we handle every dollar of product revenue separately.',
    },
    {
      title: 'Priority Support',
      body: 'Your partner account gets a dedicated support channel. When a coach has a question, we resolve it fast — you never have to be the middleman.',
    },
    {
      title: 'White-Label Materials',
      body: 'Custom flyers, email templates, and social assets branded for your organization. You look professional; we do the heavy lifting.',
    },
  ];

  const steps = [
    {
      step: '1',
      title: 'Submit Your Application',
      body: 'Tell us about your organization, your role, and your network. We review every application and respond within 48 hours.',
    },
    {
      step: '2',
      title: 'Get Your Partner Dashboard',
      body: 'Once approved, you receive a custom dashboard where you can track every team you onboard, monitor earnings, and access all marketing materials.',
    },
    {
      step: '3',
      title: 'Onboard Teams, Earn Commission',
      body: 'Share RosterRaise with coaches in your network using your unique link. Every time a referred team makes a sale, you earn — indefinitely.',
    },
  ];

  const testimonials = [
    {
      quote: 'We onboarded 11 teams in the first month. The dashboard makes it incredibly easy to see which coaches are active and how much each program is raising. The commission checks are a nice bonus.',
      name: 'Ray Stevenson',
      role: 'Director of Operations, Metro Detroit Basketball League',
      initials: 'RS',
    },
    {
      quote: 'I presented it at our spring coaches meeting and within two weeks, 8 of our 12 travel teams had stores running. The white-label flyers made me look like I had a full marketing team behind me.',
      name: 'Sandra Perez',
      role: 'Athletic Director, Lone Star Soccer Club',
      initials: 'SP',
    },
    {
      quote: 'Honestly, the hardest part was getting coaches to try something new. After they saw the first couple teams making money, the rest signed up on their own. It spread naturally.',
      name: 'Chris Okafor',
      role: 'Commissioner, Eastside Youth Football League',
      initials: 'CO',
    },
  ];

  const faqs = [
    {
      question: 'What exactly does it mean to partner with RosterRaise?',
      answer: 'You become an official RosterRaise partner — an organization that recommends our platform to coaches and teams in your network. You earn commission on every sale made by teams you refer, forever, with no cap and no expiration on your commissions.',
    },
    {
      question: 'How much can I earn as a partner?',
      answer: 'Partners earn 10% commission on every sale made by any team they refer — for the lifetime of that team\'s account. If a team raises $20,000 in a season, you earn $2,000 from that one team. Most partners refer multiple teams, and commissions compound over time as teams sell season after season.',
    },
    {
      question: 'What does my organization get out of this?',
      answer: 'Your organization earns commission on sales, and every team in your network gets access to RosterRaise\'s fundraising platform at zero cost. You also get a partner dashboard to monitor team activity, a dedicated support channel, and custom-branded marketing materials.',
    },
    {
      question: 'Who manages the teams — us or RosterRaise?',
      answer: 'RosterRaise manages everything post-onboarding — store setup, product fulfillment, customer service, and payouts. You simply connect us to the teams. We do the operational work so your organization doesn\'t have to.',
    },
    {
      question: 'How long does the application process take?',
      answer: 'The application takes about 5 minutes to complete. We review all applications within 48 hours and will reach out with your partner dashboard access, unique referral link, and a full kit of onboarding materials.',
    },
    {
      question: 'Is there a minimum number of teams I must refer?',
      answer: 'No. Refer one team or one hundred. There are no quotas, no minimums, and no penalties for inactivity. Your commissions are always active — if a team you referred makes a sale two years from now, you earn on it.',
    },
  ];

  return (
    <>
      <Nav />
      <StatStrip />

      {/* HERO */}
      <section className="partner-hero">
        <div className="container">
          <div className="partner-eyebrow">Now Accepting Partner Applications</div>
          <h1 className="partner-headline">
            Partner With RosterRaise —<br />
            Give Every Coach a Fundraising Store<br />
            <span className="red">in 24 Hours</span>
          </h1>
          <p className="partner-subhead">
            Sports organizations, school districts, and clubs partner with RosterRaise to equip their coaches with a fundraising store that earns money — automatically, season after season. You bring the network. We handle the rest. You earn commission on every sale.
          </p>
          <div className="partner-cta-row">
            <a href="#apply" className="btn-partner-primary">Apply to Partner →</a>
            <a href="#how" className="btn-partner-secondary">See How It Works</a>
          </div>
          <p className="partner-cta-note">Applications reviewed within 48 hours. No commitment required.</p>
        </div>
      </section>

      {/* WHAT PARTNERSHIP MEANS */}
      <section className="partner-benefits" id="benefits">
        <div className="container">
          <div className="section-label">Why Partner With Us</div>
          <h2 className="section-headline">Everything Your Network Needs to Start Fundraising</h2>
          <div className="partner-benefits-grid">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="partner-benefit-card">
                <div className="partner-benefit-icon">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11L9 16L18 7" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="partner-how" id="how">
        <div className="container">
          <div className="section-label">How It Works</div>
          <h2 className="section-headline">Three Steps to Your First Commission</h2>
          <div className="partner-steps-grid">
            {steps.map((step) => (
              <div key={step.step} className="partner-step-card">
                <div className="partner-step-number">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="partner-proof">
        <div className="container">
          <div className="section-label">Partner Testimonials</div>
          <h2 className="section-headline">What Athletic Directors and League Commissioners Are Saying</h2>
          <div className="partner-testimonial-grid">
            {testimonials.map((t) => (
              <div key={t.name} className="partner-testimonial-card">
                <p className="partner-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="partner-testimonial-footer">
                  <div className="partner-testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="partner-testimonial-name">{t.name}</div>
                    <div className="partner-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="partner-who" id="who">
        <div className="container">
          <div className="partner-who-inner">
            <div className="partner-who-left">
              <div className="section-label">Who This Is For</div>
              <h2 className="section-headline">Organizations That Already Have the Relationships</h2>
              <p className="partner-who-body">
                If you work with youth sports coaches and administrators, you already have the trust and access that makes RosterRaise easy to adopt. We handle the product, fulfillment, and customer service. You just make the introduction.
              </p>
            </div>
            <div className="partner-who-right">
              <div className="partner-who-list">
                <div className="partner-who-item">
                  <div className="partner-who-check">✓</div>
                  <div>
                    <strong>Travel Ball Organizations</strong>
                    <p>Onboard your member coaches and earn commission on every store your network runs.</p>
                  </div>
                </div>
                <div className="partner-who-item">
                  <div className="partner-who-check">✓</div>
                  <div>
                    <strong>High School Athletic Departments</strong>
                    <p>Give every sport program a fundraising store. Track performance across all teams from one dashboard.</p>
                  </div>
                </div>
                <div className="partner-who-item">
                  <div className="partner-who-check">✓</div>
                  <div>
                    <strong>Club Sports Organizations</strong>
                    <p>Basketball, soccer, volleyball, baseball — any club with multiple teams can benefit.</p>
                  </div>
                </div>
                <div className="partner-who-item">
                  <div className="partner-who-check">✓</div>
                  <div>
                    <strong>Youth Leagues and Recreation Departments</strong>
                    <p>From Pee Wee to competitive travel, every league has coaches who need a better way to raise money.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVENUE SHARE */}
      <section className="partner-revenue">
        <div className="container">
          <div className="partner-revenue-card">
            <div className="partner-revenue-badge">Revenue Share</div>
            <h2 className="partner-revenue-headline">You Earn 10% —<br />Every Sale, Forever</h2>
            <p className="partner-revenue-body">
              When a team you refer makes a sale, you earn 10% commission — automatically deposited to your account every month. There is no cap. There is no expiration on your commissions. Teams you refer keep selling season after season, and you keep earning on every order, year after year.
            </p>
            <div className="partner-revenue-example">
              <div className="partner-revenue-example-item">
                <div className="partner-revenue-figures">
                  <span className="partner-revenue-figure">$50,000</span>
                  <span className="partner-revenue-label">team season sales</span>
                </div>
                <div className="partner-revenue-arrow">→</div>
                <div className="partner-revenue-figures">
                  <span className="partner-revenue-figure partner-red">$5,000</span>
                  <span className="partner-revenue-label">partner commission</span>
                </div>
              </div>
              <p className="partner-revenue-example-note">Average partner with 8 active teams earns $2,800/month in commission.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="partner-faq" id="faq">
        <div className="container">
          <div className="section-label">Frequently Asked Questions</div>
          <h2 className="section-headline">Common Questions From Potential Partners</h2>
          <div className="partner-faq-list">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      <PartnerForm />

      {/* FINAL CTA */}
      <section className="partner-final-cta">
        <div className="container">
          <div className="partner-final-inner">
            <h2>Your Network Is Already<br /><span className="red">Fundraising — Just Not With Us.</span></h2>
            <p>Join sports organizations across the country that are equipping their coaches with a better fundraising tool — and earning commission in the process.</p>
            <a href="#apply" className="btn-partner-primary">Submit Your Application →</a>
            <p className="partner-final-note">Applications reviewed within 48 hours. No commitment. No quotas.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="partner-footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <a href="/">
              <span className="logo-text">
                <span className="white">ROSTER</span>
                <span className="red">RAISE</span>
              </span>
            </a>
          </div>
          <div className="footer-text">© 2025 RosterRaise. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}