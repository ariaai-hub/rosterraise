import Twilio from 'twilio';

let _client: ReturnType<typeof Twilio> | null = null;

function isTwilioConfigured(): boolean {
  return !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_PHONE_NUMBER;
}

function getClient() {
  if (!isTwilioConfigured()) return null;
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  if (!_client) {
    _client = Twilio(accountSid, authToken);
  }
  return _client;
}

export function getTwilioPhoneNumber(): string | null {
  return process.env.TWILIO_PHONE_NUMBER || null;
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  const from = getTwilioPhoneNumber();

  if (!client || !from) {
    console.warn('Twilio not configured — skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    await client.messages.create({
      body,
      to,
      from,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Twilio SMS error:', error?.message || error);
    return { success: false, error: error?.message || 'SMS failed' };
  }
}

export async function sendCoachNewOrderSMS(coachPhone: string, teamName: string, orderTotal: string): Promise<{ success: boolean; error?: string }> {
  return sendSMS(
    coachPhone,
    `RosterRaise: New order for ${teamName}! Total: ${orderTotal}. We'll notify you when it ships.`
  );
}

export async function sendCoachNewMemberSMS(coachPhone: string, teamName: string, memberName: string): Promise<{ success: boolean; error?: string }> {
  return sendSMS(
    coachPhone,
    `RosterRaise: ${memberName} just joined your team store (${teamName}). Spread the word!`
  );
}