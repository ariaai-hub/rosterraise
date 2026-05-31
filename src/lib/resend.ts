import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_DOMAIN = process.env.RESEND_DOMAIN || 'rosterraise.com';
const FROM_EMAIL = `RosterRaise <noreply@${RESEND_DOMAIN}>`;
const REPLY_DOMAIN = `reply.${RESEND_DOMAIN}`;

export function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email functionality disabled');
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

export function isResendConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export function getReplyToAddress(leadId: string): string {
  return `lead-${leadId}@${REPLY_DOMAIN}`;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  leadId?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const { to, subject, body, replyTo, leadId } = params;

  if (!to) {
    return { success: false, error: 'No recipient email address' };
  }

  try {
    const emailReplyTo = replyTo || (leadId ? getReplyToAddress(leadId) : undefined);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: body,
      reply_to: emailReplyTo,
    });

    const messageId = result.data?.id;
    if (!messageId) {
      return { success: false, error: 'No message ID returned from Resend' };
    }

    return { success: true, messageId };
  } catch (error: any) {
    console.error('Resend email send error:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

export function interpolateTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export function getLeadVariables(lead: {
  firstName?: string | null;
  lastName?: string | null;
  schoolName?: string | null;
  sport?: string | null;
  sourceGroupName?: string | null;
  email?: string | null;
}): Record<string, string> {
  return {
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    schoolName: lead.schoolName || '',
    sport: lead.sport || '',
    sourceGroupName: lead.sourceGroupName || '',
    email: lead.email || '',
  };
}
