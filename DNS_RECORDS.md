# DNS Records Required for Resend Domain Verification

## Domain: rosterraise.com

The following DNS records must be added to your domain registrar (e.g., Cloudflare, GoDaddy, Namecheap, etc.) to verify your domain with Resend:

### 1. DKIM Record (Required for email authentication)
| Type | Name | Value |
|------|------|-------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0vwnLvhGKPAyx3095jPopbDnThm9crorp/BbZVMYCJM3ch1quTY/sy1aGgbgWQScY2cmWDMHhIq7Wkj2INnpMUNYUwv+ikSzcoVC9NqXmwYqqbvWW1xAm1HW03yawSbeR16bcUMmjNVdYrsHjJrbTYzZvbInPOhYjSgcENpYmNwIDAQAB` |

### 2. SPF Record (MX type - for email receiving)
| Type | Name | Priority | Value |
|------|------|----------|-------|
| MX | `send` | 10 | `feedback-smtp.us-east-1.amazonses.com` |

### 3. SPF Record (TXT type - for email sending)
| Type | Name | Value |
|------|------|-------|
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

## How to Add These Records

1. Log in to your domain registrar's DNS settings
2. Add each record as specified above
3. Wait5-30 minutes for DNS propagation
4. Return to https://resend.com/domains and click "Verify" on rosterraise.com
5. Status should change from "pending" to "verified"

## Current Status
- Domain ID: `665aa194-92a6-4d16-a50e-3d6a09b469ad`
- Status: `pending` (DNS records not yet detected)
- Capabilities: sending=enabled, receiving=disabled

## Notes
- Without these DNS records, emails from `noreply@rosterraise.com` will fail with: "The rosterraise.com domain is not verified"
- The `send` MX record is for email receiving ( bounces)
- The DKIM record is for email authentication/signatures
- The SPF TXT record authorizes Resend to send emails on behalf of your domain