import { Resend } from 'resend';

const FROM_EMAIL = 'RosterRaise <noreply@rosterraise.com>';

// Domain verification status cache
let domainStatusCache: { status: string; checkedAt: number } | null = null;
const DOMAIN_STATUS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function checkDomainVerification(): Promise<{ verified: boolean; status: string }> {
  // Return cached status if fresh
  if (domainStatusCache && Date.now() - domainStatusCache.checkedAt < DOMAIN_STATUS_CACHE_TTL) {
    return { verified: domainStatusCache.status === 'verified', status: domainStatusCache.status };
  }

  const resend = getResend();
  if (!resend) {
    return { verified: false, status: 'no_api_key' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domains = await resend.domains.list() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listData = (domains?.data as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domain = listData.find((d: any) => d.name === 'rosterraise.com');
    
    if (!domain) {
      domainStatusCache = { status: 'not_found', checkedAt: Date.now() };
      return { verified: false, status: 'not_found' };
    }

    domainStatusCache = { status: domain.status, checkedAt: Date.now() };
    return { verified: domain.status === 'verified', status: domain.status };
  } catch (error) {
    console.error('Failed to check domain verification status:', error);
    return { verified: false, status: 'error' };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { success: false, error: 'No Resend API key' };
  }

  // Check domain verification status
  const { verified, status } = await checkDomainVerification();
  if (!verified) {
    console.warn(`Domain not verified (status: ${status}) — emails will fail. See DNS_RECORDS.md for required DNS configuration.`);
    // Still attempt to send - Resend may queue the email for when domain is verified
  }

  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your RosterRaise account',
      html: `
        <h1>Welcome to RosterRaise!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>Or copy and paste this link: ${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send verification email:', error);
    // Provide actionable error message
    if (error?.message?.includes('domain is not verified')) {
      return { success: false, error: 'Domain not verified. Please add DNS records listed in DNS_RECORDS.md and wait for propagation.' };
    }
    return { success: false, error };
  }
}

export async function sendTeamApprovedEmail(email: string, teamSlug: string, teamName: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { success: false, error: 'No Resend API key' };
  }

  // Check domain verification status
  const { verified, status } = await checkDomainVerification();
  if (!verified) {
    console.warn(`Domain not verified (status: ${status}) — emails will fail. See DNS_RECORDS.md for required DNS configuration.`);
  }

  const storeUrl = `${process.env.NEXTAUTH_URL}/store/${teamSlug}`;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your team store is live!',
      html: `
        <h1>Your Team Store is Live!</h1>
        <p>Great news! Your team <strong>${teamName}</strong> has been approved.</p>
        <p>Visit your store to start selling:</p>
        <a href="${storeUrl}" style="display: inline-block; background: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Visit Store</a>
        <p>Store URL: ${storeUrl}</p>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send team approved email:', error);
    if (error?.message?.includes('domain is not verified')) {
      return { success: false, error: 'Domain not verified. Please add DNS records listed in DNS_RECORDS.md and wait for propagation.' };
    }
    return { success: false, error };
  }
}

export async function sendTeamRejectedEmail(email: string, teamName: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { success: false, error: 'No Resend API key' };
  }

  // Check domain verification status
  const { verified, status } = await checkDomainVerification();
  if (!verified) {
    console.warn(`Domain not verified (status: ${status}) — emails will fail. See DNS_RECORDS.md for required DNS configuration.`);
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Update on your RosterRaise application',
      html: `
        <h1>Application Update</h1>
        <p>Thank you for your interest in RosterRaise.</p>
        <p>Unfortunately, we were unable to approve your team <strong>${teamName}</strong> at this time.</p>
        <p>If you believe this was a mistake or would like more information, please contact our support team.</p>
        <p>We appreciate your understanding.</p>
        <p>— The RosterRaise Team</p>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send team rejected email:', error);
    if (error?.message?.includes('domain is not verified')) {
      return { success: false, error: 'Domain not verified. Please add DNS records listed in DNS_RECORDS.md and wait for propagation.' };
    }
    return { success: false, error };
  }
}

export async function sendOrderConfirmationEmail(order: any, userEmail: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping order confirmation email');
    return { success: false };
  }

  // Check domain verification status
  const { verified, status } = await checkDomainVerification();
  if (!verified) {
    console.warn(`Domain not verified (status: ${status}) — emails will fail. See DNS_RECORDS.md for required DNS configuration.`);
  }

  const itemsList = order.orderItems
    .map((item: any) => `${item.product.name} (${item.size}/${item.color}) x${item.quantity} - $${(item.unitPriceCents * item.quantity / 100).toFixed(2)}`)
    .join('\n');

  const playerName = order.orderItems[0]?.player
    ? `${order.orderItems[0].player.firstName} ${order.orderItems[0].player.lastName}`
    : 'your selected player';

  const html = `
<h1>Your Order is Confirmed! #${order.orderNumber}</h1>
    <p>Thank you for supporting ${playerName}!</p>
    <h2>Order Details:</h2>
    <ul>
      ${order.orderItems.map((item: any) => `
        <li>${item.product.name} - Size: ${item.size}, Color: ${item.color}, Qty: ${item.quantity} - $${(item.unitPriceCents / 100).toFixed(2)} each</li>
      `).join('')}
    </ul>
    <p><strong>Subtotal:</strong> $${(order.subtotalCents / 100).toFixed(2)}</p>
    <p><strong>Tax:</strong> $${(order.taxCents / 100).toFixed(2)}</p>
    <p><strong>Shipping:</strong> $${(order.shippingCents / 100).toFixed(2)}</p>
    <p><strong>Total:</strong> $${(order.totalCents / 100).toFixed(2)}</p>
    <h3>Shipping Address:</h3>
    <p>${order.shippingName}<br>${order.shippingAddress}</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Your Order is Confirmed! #${order.orderNumber}`,
      html,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send order confirmation email:', error);
    if (error?.message?.includes('domain is not verified')) {
      return { success: false, error: 'Domain not verified. Please add DNS records listed in DNS_RECORDS.md and wait for propagation.' };
    }
    return { success: false, error };
  }
}