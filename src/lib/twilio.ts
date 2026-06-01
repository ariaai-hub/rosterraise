import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && phoneNumber);
}

let _client: ReturnType<typeof Twilio> | null = null;

function getClient() {
  if (!isTwilioConfigured()) {
    return null;
  }
  if (!_client) {
    _client = Twilio(accountSid as string, authToken as string);
  }
  return _client;
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  timestamp: string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const timestamp = new Date().toISOString();

  if (!isTwilioConfigured()) {
    return {
      success: false,
      error: 'Twilio not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER.',
      timestamp,
    };
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: 'Twilio client not initialized.',
      timestamp,
    };
  }

  try {
    const message = await client.messages.create({
      body,
      from: phoneNumber,
      to,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      timestamp,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown Twilio error';
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error,
      timestamp,
    };
  }
}

export function formatPhoneForTwilio(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }
  if (!digits.startsWith('+')) {
    return `+${digits}`;
  }
  return digits;
}

export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
