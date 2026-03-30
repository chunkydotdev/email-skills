# Domain Authentication

Set up SPF, DKIM, and DMARC so your emails actually reach the inbox.

## When to use this skill

- Setting up email sending for a new domain
- Emails are landing in spam or being rejected
- Adding a new email provider or SaaS tool that sends on your behalf
- Preparing for Google/Yahoo/Microsoft bulk sender requirements
- Auditing an existing domain's authentication setup
- Locking down a domain that doesn't send email

## Related skills

- `email-warmup` - after authentication is in place, ramp sending volume gradually
- `provider-setup` - choose and configure an email provider
- `bounce-handling` - handle delivery failures and protect your reputation
- `email-compliance` - legal requirements (CAN-SPAM, GDPR, unsubscribe)

---

## The authentication stack

Three protocols work together. All three are required - not optional - for any domain sending email in 2025+.

| Protocol | What it does | DNS record type |
|----------|-------------|-----------------|
| SPF | Declares which servers can send email for your domain | TXT on domain root |
| DKIM | Cryptographically signs each message to prove it wasn't tampered with | TXT or CNAME on selector subdomain |
| DMARC | Tells receivers what to do when SPF/DKIM fail, and sends you reports | TXT on `_dmarc` subdomain |

A message passes DMARC if **either** SPF or DKIM passes **and** aligns with the From domain. Both should pass, but only one is required.

---

## SPF (Sender Policy Framework)

SPF declares which IP addresses and services are authorized to send email for your domain.

### Record format

```
v=spf1 include:_spf.google.com include:sendgrid.net ip4:203.0.113.0/24 -all
```

### The 10 DNS lookup limit

This is the single most common SPF failure. Per RFC 7208, SPF evaluation allows a maximum of **10 DNS-querying mechanisms**. These count toward the limit:

- `include`, `a`, `mx`, `redirect`, `exists` - each costs 1 lookup
- **Nested includes count too.** `include:_spf.google.com` costs 1 + however many lookups Google's record contains.

These do **not** count: `ip4`, `ip6`, `all`.

Exceeding 10 lookups causes a `permerror`. Most receivers treat this as a **fail**.

### Common SPF mistakes

1. **Too many includes.** Every SaaS tool says "just add our include." After Google Workspace + SendGrid + Mailchimp + HubSpot + Zendesk, you're past 10.
2. **Multiple SPF records.** Only ONE `v=spf1` TXT record is allowed per domain. Two records cause a `permerror`. This happens when different teams add records independently.
3. **Using `~all` forever.** Softfail was a transitional mechanism. Use `-all` (hardfail) once you've confirmed all legitimate sources are listed.
4. **Using the `ptr` mechanism.** RFC 7208 says "SHOULD NOT be used" - it's slow, unreliable, and some receivers ignore it.

### SPF flattening

When you hit the lookup limit, flattening replaces `include` mechanisms with their resolved IP addresses:

- **Manual flattening** works but IPs change (especially cloud providers), so your record goes stale silently.
- **Automated flattening** services resolve and update periodically, keeping a single `include` to their managed record.
- **Better approach:** Use a dedicated subdomain for each mail stream (e.g., `mail.example.com` for transactional, `news.example.com` for marketing). Each subdomain gets its own SPF record with a fresh 10-lookup budget.

### Alignment

For DMARC, SPF alignment checks whether the envelope-from domain (Return-Path) matches the header From domain.

- **Relaxed alignment** (default, recommended): organizational domains must match. `bounce.example.com` aligns with `example.com`.
- **Strict alignment**: exact domain match required. Breaks most SaaS setups.

---

## DKIM (DomainKeys Identified Mail)

DKIM adds a cryptographic signature to each outgoing message. The receiver looks up your public key in DNS to verify it.

### Key size

- **2048-bit RSA is the minimum.** 1024-bit keys are deprecated and increasingly rejected. Google warns about them.
- **Ed25519** (RFC 8463) is faster and smaller but not universally supported - Microsoft 365 still doesn't reliably verify Ed25519. If you want to use it, dual-sign with both RSA-2048 and Ed25519.
- **4096-bit RSA** exceeds the 255-byte DNS TXT string limit, requiring concatenation that some resolvers mishandle. Stick with 2048-bit.

### Canonicalization

Always use **`relaxed/relaxed`** (for both header and body). The `simple` mode requires exact byte matching, which breaks when any intermediate server modifies whitespace, wraps headers, or normalizes line endings - which many do.

### Key rotation

Rotate DKIM keys at least annually. Every 6 months is better.

**Rotation process:**

1. Generate a new keypair with a **new selector** (e.g., `sel-202501`).
2. Publish the new public key in DNS. Wait for TTL propagation (check with `dig`).
3. Switch signing to the new selector.
4. **Keep the old public key in DNS for at least 7 days** (ideally 30). Messages in transit, greylisted, or queued for retry will still carry the old signature.
5. Remove the old public key.

Never reuse a selector name for a different key.

### Selector naming

Include a date or version in the selector name: `google2024`, `sel-202503`, `resend-v2`. This makes rotation visible and avoids collisions. Avoid generic names like `default` that give no indication of age.

### Headers to sign

Sign at minimum: `From`, `To`, `Subject`, `Date`, `MIME-Version`, `Content-Type`. Over-signing (listing a header twice in the `h=` tag) prevents header injection attacks.

**Do not use the `l=` (body length) tag.** It allows attackers to append content to signed messages. Gmail penalizes messages that use it.

---

## DMARC (Domain-based Message Authentication, Reporting & Conformance)

DMARC ties SPF and DKIM together. It tells receivers what to do when authentication fails and sends you reports about it.

### Record format

```
_dmarc.example.com TXT "v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=mailto:dmarc@example.com; fo=1; pct=100"
```

### Tag reference

| Tag | Purpose | Recommendation |
|-----|---------|----------------|
| `p` | Policy for your domain | Progress to `reject` |
| `sp` | Policy for subdomains | Set to `reject` explicitly |
| `adkim` | DKIM alignment mode | `r` (relaxed) |
| `aspf` | SPF alignment mode | `r` (relaxed) |
| `rua` | Where to send aggregate reports | Always set this |
| `ruf` | Where to send forensic reports | Set with `fo=1`, but few providers send these |
| `pct` | Percentage of failures to apply policy to | Use for rollout, remove when at 100 |
| `fo` | Failure reporting options | `fo=1` (report on any mechanism failure) |

### Policy progression

Never jump straight to `p=reject`. You'll block legitimate email you forgot about - marketing tools, CRM systems, invoicing platforms, internal apps.

**Step 1 - Monitor** (2-4 weeks minimum):
```
v=DMARC1; p=none; sp=reject; rua=mailto:dmarc@example.com; fo=1
```
Collect reports. Identify all legitimate sending sources. Fix their authentication.

**Step 2 - Quarantine gradually:**
```
v=DMARC1; p=quarantine; pct=10; sp=reject; rua=mailto:dmarc@example.com; fo=1
```
Increase `pct` in steps: 10 -> 25 -> 50 -> 100. Monitor reports at each step.

**Step 3 - Reject:**
```
v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@example.com; fo=1
```

### Subdomain policy matters

Without `sp=`, subdomains inherit the parent domain's policy. If you're at `p=none` during rollout, all subdomains are unprotected too.

Attackers commonly spoof subdomains (e.g., `security.example.com`, `billing.example.com`). Set `sp=reject` on your org domain even during the `p=none` monitoring phase, unless you have subdomains actively sending email that aren't authenticated yet.

### DMARC reporting

**Always set `rua`.** Without it, you're flying blind. Aggregate reports tell you:

- Which IPs are sending email as your domain
- Whether SPF and DKIM are passing or failing
- What disposition receivers applied (none, quarantine, reject)

You can receive reports directly via email, but at volume they're hard to parse manually. Services like Postmark DMARC Digests, Valimail, or dmarcian parse them into dashboards.

---

## Bulk sender requirements (2024-2025)

Google, Yahoo, and Microsoft now enforce authentication requirements for domains sending more than 5,000 messages per day to their users.

### What's required

| Requirement | Details |
|------------|---------|
| SPF **and** DKIM | Both required, not just one |
| DMARC | `p=none` minimum (Google recommends `p=quarantine` or higher) |
| Valid PTR records | Forward and reverse DNS must match for sending IPs |
| TLS | SMTP transmission must use TLS |
| One-click unsubscribe | RFC 8058 `List-Unsubscribe-Post` header for marketing mail |
| Spam complaint rate | Below 0.3% (Google recommends below 0.1%) |

### One-click unsubscribe headers

Required for marketing and promotional email (not transactional):

```
List-Unsubscribe: <https://example.com/unsub?id=abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

The mail client sends an HTTP POST to the URL with body `List-Unsubscribe=One-Click`. Your endpoint must process this without requiring login, confirmation pages, or any user interaction. Honor within 2 days.

### Microsoft's requirements (May 2025)

Microsoft announced similar requirements for Outlook.com and Hotmail, effective May 5, 2025. SPF, DKIM, and DMARC (`p=none` minimum) required for high-volume senders. Non-compliant messages go to Junk initially, with future rejection planned.

---

## Common failure modes

These are the things that actually break authentication in practice.

### SaaS tools and envelope-from

The most common real-world issue. When you use SendGrid, Mailchimp, HubSpot, etc.:

1. They set their own domain as the envelope-from (Return-Path), e.g., `bounce.sendgrid.net`.
2. SPF passes for their domain, not yours.
3. SPF alignment fails for DMARC because `sendgrid.net` doesn't match `example.com`.

**Fix:** Configure the provider to use a custom Return-Path on your domain (e.g., `em1234.example.com`). Most providers call this "domain authentication" or "authenticated sending domain." Then add their SPF include to that subdomain's record.

### Email forwarding

When mail is forwarded (e.g., `user@alumni.edu` to `user@gmail.com`):

- SPF fails because the forwarding server's IP isn't in the original sender's SPF record.
- DKIM fails if the forwarder modifies the message (adds footer, subject tag).
- DMARC fails if both fail.

This is largely solved by **ARC** (Authenticated Received Chain, RFC 8617), which preserves original authentication results through forwarding chains. Gmail and Microsoft trust ARC from validated intermediaries. As a sender, you don't need to implement ARC - it's handled by intermediaries.

### Multiple From domains

Your app sends as `noreply@example.com`, but marketing sends as `team@example.io` through the same provider. DKIM is only configured for `example.com`. Messages from `example.io` fail DKIM alignment.

**Fix:** Configure DKIM signing for every domain you send from. Audit all From addresses across all teams and tools.

### DNS propagation during key rotation

You rotate a DKIM key and immediately remove the old public key from DNS. Messages still in transit (queued, greylisted, retried) carry the old signature and fail verification.

**Fix:** Keep old public keys in DNS for at least 7 days after rotation.

---

## Non-sending domains

Domains that don't send email should publish denial records to prevent spoofing:

```
; SPF - no one is authorized to send
example.com TXT "v=spf1 -all"

; DKIM - empty public key = explicitly revoked
*._domainkey.example.com TXT "v=DKIM1; p="

; DMARC - reject everything, still collect reports
_dmarc.example.com TXT "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@example.com"
```

This applies to parked domains, redirect domains, and any domain you own but don't use for email. Attackers target unprotected domains you've forgotten about.

---

## BIMI (optional, advanced)

BIMI displays your brand logo next to emails in supporting clients. It requires DMARC `p=quarantine` or `p=reject` as a prerequisite.

### Current support (2025)

- **Gmail**: full support, requires a Verified Mark Certificate (VMC)
- **Apple Mail**: supports BIMI, does NOT require VMC
- **Yahoo**: supported, VMC preferred but not required
- **Microsoft Outlook**: **not supported**

### Requirements

- A registered trademark (for VMC)
- VMC from DigiCert or Entrust (~$1,000-1,500/year)
- Logo in SVG Tiny Portable/Secure format (not regular SVG - most Figma/Illustrator exports won't work)
- DMARC at `p=quarantine` or `p=reject`

### Is it worth it?

For most companies: **not yet.** The VMC cost, trademark requirement, and lack of Outlook support make it impractical unless you're a large brand with high sending volume. Google reports ~10% improvement in engagement for BIMI-enabled senders.

The biggest value of BIMI is that it forces proper DMARC deployment as a prerequisite.

---

## MTA-STS and DANE (optional, advanced)

These protocols prevent TLS downgrade attacks on mail delivery.

### MTA-STS (RFC 8461)

Declares that your domain only accepts mail over TLS. Deploy if you want to ensure inbound mail is encrypted.

1. Publish DNS: `_mta-sts.example.com TXT "v=STSv1; id=20250301"`
2. Host policy at `https://mta-sts.example.com/.well-known/mta-sts.txt`:
```
version: STSv1
mode: enforce
mx: mail.example.com
max_age: 604800
```

Start with `mode: testing`, add TLSRPT for failure reports, then move to `mode: enforce`.

### DANE (RFC 7672)

Stronger than MTA-STS but requires DNSSEC. Widely deployed in Europe (especially Netherlands, Germany, Nordics). Google does not support DANE for outbound SMTP, which limits adoption.

**Recommendation:** Deploy MTA-STS first (broader support). Add DANE if you're already running DNSSEC and communicate with European/government organizations.

---

## Verification checklist

After setup, verify everything works:

- [ ] **SPF:** `dig TXT example.com` shows exactly one `v=spf1` record
- [ ] **SPF lookup count:** Use an SPF checker tool to verify you're at or under 10 DNS lookups
- [ ] **DKIM:** `dig TXT selector._domainkey.example.com` returns your public key
- [ ] **DKIM key size:** Confirm 2048-bit RSA minimum
- [ ] **DMARC:** `dig TXT _dmarc.example.com` shows your policy
- [ ] **DMARC reporting:** `rua` is set and you're receiving aggregate reports
- [ ] **Subdomain policy:** `sp=` is set explicitly (preferably `reject`)
- [ ] **Alignment:** Send a test email, check headers for `dmarc=pass`, `spf=pass`, `dkim=pass`
- [ ] **All sending sources:** Every service that sends as your domain is authenticated (SPF include + DKIM signing)
- [ ] **Non-sending domains:** Parked/redirect domains have denial records

---

## References

- [RFC 7208](https://datatracker.ietf.org/doc/html/rfc7208) - SPF
- [RFC 6376](https://datatracker.ietf.org/doc/html/rfc6376) - DKIM
- [RFC 8301](https://datatracker.ietf.org/doc/html/rfc8301) - DKIM cryptographic algorithm update
- [RFC 9714](https://datatracker.ietf.org/doc/html/rfc9714) - DMARC (Standards Track, 2024)
- [RFC 8617](https://datatracker.ietf.org/doc/html/rfc8617) - ARC
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe
- [RFC 8461](https://datatracker.ietf.org/doc/html/rfc8461) - MTA-STS
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126)
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/)
- [Microsoft Outlook Sender Requirements](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)
- [M3AAWG Best Practices](https://www.m3aawg.org/published-documents)
- [BIMI Working Group](https://bimigroup.org/)
