# Email Compliance

Navigate CAN-SPAM, GDPR, and CASL requirements so your emails are legally compliant across jurisdictions.

## When to use this skill

- Setting up email sending and need to know what legal requirements apply
- Adding unsubscribe handling to marketing or commercial emails
- Sending to recipients in the EU, Canada, or the US
- Classifying emails as transactional vs commercial to determine which rules apply
- Building consent collection flows (signup forms, checkboxes, double opt-in)
- Auditing existing email practices for compliance gaps
- Implementing List-Unsubscribe headers for bulk sender requirements
- Responding to a data deletion or erasure request

## Related skills

- `domain-authentication` - SPF, DKIM, DMARC setup (required for bulk sender compliance)
- `suppression-lists` - managing bounces, complaints, and opt-outs
- `transactional-email` - sending receipts, auth emails, and notifications (mostly exempt)
- `cold-outreach` - B2B cold email that doesn't violate consent laws

---

## The three laws you need to know

Most email senders need to comply with at least one of these. If you send internationally, you likely need all three.

| | CAN-SPAM (US) | GDPR (EU/EEA) | CASL (Canada) |
|---|---|---|---|
| **Consent model** | Opt-out (can send until they unsubscribe) | Opt-in (need consent before sending) | Opt-in (express or implied consent required) |
| **Applies to** | Commercial email messages | Any processing of personal data (email address = personal data) | Commercial electronic messages (CEMs) |
| **Consent type** | Not required to send; must honor opt-out | Explicit consent or legitimate interest | Express consent (never expires) or implied consent (time-limited) |
| **Unsubscribe deadline** | 10 business days | Without undue delay (typically 30 days max) | 10 business days |
| **Physical address** | Required in every commercial email | Not required in email itself (but must be available) | Required - sender identification with contact info |
| **Sender identification** | Accurate From, Reply-To, routing info | Data controller identity must be available | Name and contact info of sender required |
| **Record keeping** | No specific requirement | Must prove consent was given (timestamp, method, purpose) | Must retain consent records for 3 years after relationship ends |
| **Transactional exemption** | Yes - mostly exempt from CAN-SPAM rules | Contractual basis covers transactional email | Yes - non-commercial messages exempt |
| **Penalties (max)** | $51,744 per email (no cap on total) | 4% of global annual revenue or 20M EUR | $10M CAD per violation (business) |
| **Enforcement** | FTC | National data protection authorities | CRTC |
| **Extraterritorial** | Applies to email sent to US recipients | Applies if you process EU resident data, regardless of sender location | Applies to messages sent to or accessed in Canada |

**Practical rule of thumb:** If you comply with GDPR and CASL (the strictest), you automatically satisfy CAN-SPAM. Build for the strictest standard you face, not the loosest.

---

## CAN-SPAM (United States)

CAN-SPAM is an opt-out law. You can send commercial email to anyone until they tell you to stop. This sounds permissive, but the requirements for what your emails must contain are strict.

### What every commercial email must include

1. **Accurate header information.** The From, To, Reply-To, and routing information must identify the person or business who initiated the message. No spoofing, no misleading sender names.

2. **Honest subject line.** Must accurately reflect the content of the message. A subject line of "Your order has shipped" on a promotional email is a violation.

3. **Identification as an ad.** The message must clearly disclose that it's an advertisement or solicitation. The law doesn't prescribe exact wording - "this is an ad" works, and so does a clear visual distinction. Many senders handle this with footer text.

4. **Physical postal address.** Your valid physical postal address must appear in the message. A PO Box or registered commercial mail receiving agency address works. This is not optional.

5. **Clear opt-out mechanism.** Must be conspicuous. Can be a reply-to address or a single-page web link. Cannot require login, payment, or personal info beyond the email address to process. Must work for at least 30 days after the message is sent.

6. **Honor opt-outs within 10 business days.** Once someone unsubscribes, stop sending within 10 business days. You cannot transfer or sell their email address to another sender after they opt out.

### What CAN-SPAM does NOT require

- Prior consent to send (it's opt-out, not opt-in)
- Double opt-in
- Consent records or proof of permission

### Monitoring third-party senders

If you hire another company to send email on your behalf, you're both legally responsible. "Our vendor handles that" is not a defense. Monitor what they send under your name.

---

## GDPR (European Union / EEA)

GDPR is fundamentally different from CAN-SPAM. It's an opt-in framework - you need a lawful basis to process someone's personal data (an email address counts) before you send anything.

### Lawful bases for email

You need one of these for every email you send:

| Basis | When it applies | What it requires |
|---|---|---|
| **Explicit consent** | Marketing, newsletters, promotional email | Freely given, specific, informed, unambiguous. Clear affirmative action (not pre-checked boxes). Must be as easy to withdraw as to give. |
| **Legitimate interest** | B2B outreach, existing customer marketing ("soft opt-in") | Must pass a three-part test: (1) you have a legitimate interest, (2) processing is necessary for that interest, (3) it doesn't override the individual's rights. Document your assessment. |
| **Contractual necessity** | Transactional email, order confirmations, account notifications | Email must be necessary to fulfill a contract or pre-contractual steps the recipient requested. |
| **Legal obligation** | Regulatory notifications, compliance communications | You're legally required to send the communication. |

### The soft opt-in (legitimate interest for existing customers)

Under the ePrivacy Directive (which works alongside GDPR), you can email existing customers about similar products or services without explicit consent if:

- You obtained their email in the context of a sale or negotiation
- You're marketing your own similar products or services
- You gave them a clear opportunity to opt out at the point of collection
- You include an opt-out in every message

This is the "soft opt-in" and it's widely used in B2B. But it only applies to your own similar products - you can't use it to email about unrelated offerings or share the address with partners.

### Consent requirements (when you need explicit consent)

Valid GDPR consent must be:

- **Freely given** - no bundling consent with terms of service. "Agree to our terms AND receive marketing" is invalid.
- **Specific** - consent for "product updates" doesn't cover "partner offers."
- **Informed** - tell them who you are, what you'll send, and how to withdraw.
- **Unambiguous** - requires a clear affirmative action. Pre-checked boxes, silence, and inactivity do not count.
- **Documented** - you must be able to prove consent was given. Keep records.
- **Withdrawable** - must be as easy to withdraw as it was to give. If they consented with one click, they should be able to withdraw with one click.

### Data subject rights that affect email

| Right | What it means for email senders |
|---|---|
| **Right to object** | Any recipient can object to direct marketing at any time. You must stop immediately. Their objection overrides any legitimate interest claim. |
| **Right to erasure** | Recipients can request deletion of their personal data. You must comply within 30 days unless you have a legal obligation to retain it. |
| **Right of access** | Recipients can request a copy of all data you hold about them, including consent records, send history, and engagement data. |
| **Right to rectification** | Recipients can request correction of inaccurate data. |

### What to do when you receive an erasure request

1. Stop all email to the address immediately
2. Delete the personal data from your systems within 30 days
3. Notify any third parties you shared the data with
4. Keep a hashed or anonymized suppression record (so you don't accidentally re-add them later)
5. Confirm the deletion to the requester

You can retain data when it's necessary for legal compliance, defending legal claims, or archiving in the public interest. Document your reasoning.

---

## CASL (Canada)

CASL is the strictest of the three. It requires consent before sending any commercial electronic message (CEM), and it distinguishes between express and implied consent with different expiry rules.

### Express consent

Express consent means the recipient took a clear, proactive action to agree to receive your messages. Examples: checking an unchecked opt-in box, filling out a subscription form, sending a written request.

Express consent **does not expire** as long as the recipient doesn't withdraw it. But you must be able to prove you obtained it.

When requesting consent, you must disclose:
- The purpose for which consent is being sought
- The name of the person or organization seeking consent
- Contact information (mailing address, phone, email, or web URL)

### Implied consent

Implied consent is time-limited and arises from an existing relationship:

| Relationship type | Consent duration |
|---|---|
| Purchased a product or service | 2 years from the transaction |
| Active contract or membership | Duration + 2 years after expiry |
| Inquiry or application | 6 months from the inquiry |
| Conspicuously published email (e.g., on a website) | Only for messages relevant to their role/function |
| Referral from another person | Single message allowed |

Once implied consent expires, you must stop sending or obtain express consent.

### CASL record-keeping requirements

CASL is explicit about what you must retain:

- **Type of consent** (express or implied)
- **Date and time** consent was obtained
- **How consent was obtained** (web form, verbal, written)
- **The specific wording** used to request consent
- **Keep records for 3 years** after the business relationship ends

This is not optional. If you can't produce these records during an audit, the CRTC will treat the messages as unconsented.

---

## Transactional vs commercial email

Getting this classification right matters because transactional emails are exempt from most compliance requirements (unsubscribe links, physical address, ad identification). Getting it wrong exposes you to penalties.

### What qualifies as transactional

Under CAN-SPAM, transactional or relationship messages include:

- **Order confirmations and receipts** - confirming a completed transaction
- **Shipping and delivery notifications** - status updates on a purchase
- **Account notifications** - password resets, security alerts, login notifications
- **Product/service updates** - changes to terms, warranties, recalls, safety info
- **Subscription/membership status** - billing changes, renewal notices, plan changes
- **Employment-related messages** - benefits information, payroll notifications

Under GDPR, these are covered by the **contractual necessity** basis - no separate consent needed if the email is necessary to fulfill a contract.

Under CASL, transactional messages are generally exempt from consent requirements if they're directly related to an existing commercial activity.

### What is NOT transactional

- Upsell or cross-sell suggestions ("You bought X, you might like Y")
- Newsletters or content marketing
- Re-engagement campaigns ("We miss you!")
- Surveys or feedback requests (unless directly tied to a transaction)
- Feature announcements or product launches

### Mixed content emails

This is where most mistakes happen. An order confirmation that includes a promotional banner at the bottom is a mixed-content email.

**CAN-SPAM rule for mixed content:** If the subject line would lead a recipient to think it's a commercial message, or if the transactional content doesn't appear primarily at the beginning, it's classified as commercial. Put transactional content first and keep promotional elements minimal and clearly secondary.

**Best practice:** Keep transactional and commercial emails completely separate. Don't add promotional content to order confirmations, password resets, or account alerts. It risks reclassifying the entire message as commercial.

---

## One-click unsubscribe (RFC 8058)

Since June 2024, Google and Yahoo require RFC 8058 one-click unsubscribe for all bulk senders (5,000+ messages/day). Microsoft announced similar requirements for Outlook.com effective May 2025. This is now table stakes for any marketing email.

### What to implement

Add two headers to every marketing/promotional email:

```
List-Unsubscribe: <https://example.com/unsubscribe?id=abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### How it works

1. The mail client sees both headers and shows an unsubscribe button in the UI
2. When the recipient clicks it, the client sends an HTTP POST to your URL with body `List-Unsubscribe=One-Click`
3. Your server processes the unsubscribe - no login, no confirmation page, no multi-step flow

### Requirements

- The URL must be HTTPS
- Both `List-Unsubscribe` and `List-Unsubscribe-Post` headers must be covered by your DKIM signature
- Process the unsubscribe within 48 hours (Google/Yahoo requirement)
- The endpoint must not require authentication or user interaction
- Only required for marketing/promotional email, not transactional

### What happens if you don't implement it

- Gmail will show a warning banner on your messages
- Your messages are more likely to be classified as spam
- At scale, non-compliance degrades sender reputation

### Legacy List-Unsubscribe (mailto)

The older `mailto:` form still works but is not sufficient on its own for the bulk sender requirements:

```
List-Unsubscribe: <mailto:unsubscribe@example.com?subject=unsubscribe-abc123>
```

Include both the HTTPS and mailto forms for maximum compatibility:

```
List-Unsubscribe: <https://example.com/unsubscribe?id=abc123>, <mailto:unsubscribe@example.com?subject=unsubscribe-abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

---

## Consent management implementation

### What to store per consent record

At minimum, store these fields for every consent:

| Field | Purpose | Required by |
|---|---|---|
| `recipientEmail` | Who consented | All |
| `basis` | Consent type: `explicit_opt_in`, `legitimate_interest`, `contractual`, `legal_obligation` | GDPR, CASL |
| `source` | Where consent was collected: signup form URL, import file, verbal | GDPR, CASL |
| `jurisdiction` | Which law applies: `us`, `eu`, `ca` | All (determines rules) |
| `grantedAt` | Timestamp when consent was given | GDPR, CASL |
| `revokedAt` | Timestamp when consent was withdrawn (null if active) | All |
| `consentText` | The exact wording shown when consent was collected | CASL (required), GDPR (recommended) |
| `ipAddress` | IP at time of consent collection | Recommended for audit |

Platforms like [molted.email](https://molted.email) store consent records with basis, source, jurisdiction, and timestamps as a first-class data model, making audit responses straightforward.

### Double opt-in

Double opt-in (confirmation email) is not legally required by any of the three laws, but it's strongly recommended for GDPR and CASL compliance because:

- It proves the email address owner actually consented (not someone else using their address)
- It creates a stronger audit trail
- It reduces bounce rates and spam complaints (invalid addresses never confirm)
- Some EU data protection authorities consider it best practice for demonstrating "unambiguous" consent

### Consent expiry tracking

For CASL implied consent, you need to track expiry:

```
if consent.basis == 'implied' and consent.jurisdiction == 'ca':
    if consent.source == 'inquiry':
        expires = consent.grantedAt + 6 months
    else:  # purchase, contract
        expires = consent.grantedAt + 2 years

    if now > expires:
        # Must stop sending or upgrade to express consent
```

Don't wait until consent expires to act. Start a consent renewal campaign 30-60 days before expiry.

---

## Suppression list compliance

When someone unsubscribes, bounces, or files a complaint, they go on a suppression list. Compliance requires you to check this list before every send.

### Suppression reasons and what they mean

| Reason code | What triggered it | Can you remove it? |
|---|---|---|
| `complaint` | Recipient clicked "Report Spam" | No - honor permanently |
| `hard_bounce` | Address doesn't exist | No - remove from lists |
| `manual_dnc` | Unsubscribe request or manual addition | Only if recipient re-consents |
| `legal_request` | Erasure request, legal demand | No - honor permanently |
| `role_account` | Address is a role account (info@, admin@) | Generally avoid sending to role accounts |
| `no_engagement` | No opens/clicks over extended period | Yes, but consider if re-engagement is appropriate |

### The erasure vs suppression paradox

GDPR says you must delete personal data on request. But if you delete the email address entirely, you might accidentally re-import it and send again - which violates the erasure request.

**Solution:** Keep a hashed (one-way) suppression record. Hash the email address (SHA-256), store the hash on your suppression list, delete all other personal data. Before every send, hash the recipient address and check against the suppression list. This satisfies both the erasure requirement (you don't store the email in plaintext) and the suppression requirement (you won't send to them again).

---

## Common mistakes

### 1. Treating CAN-SPAM as the only standard

CAN-SPAM is the most permissive of the three. If you have any EU or Canadian recipients (and you probably do - you often can't know where someone is), build for GDPR/CASL compliance from the start. Retrofitting consent is painful.

### 2. Assuming transactional email needs no compliance

Transactional emails are exempt from most marketing rules, but they still must have accurate header information (From, Reply-To, routing) under CAN-SPAM, and they're still covered by GDPR data processing rules. You need a lawful basis (contractual necessity) even for transactional sends.

### 3. Bundling consent

"By creating an account, you agree to receive marketing emails" is invalid under GDPR. Consent for marketing must be separate from consent for terms of service. Use a separate, unchecked checkbox.

### 4. Using pre-checked opt-in boxes

Invalid under both GDPR and CASL. The checkbox must start unchecked. The recipient must take an affirmative action to consent.

### 5. No consent records

"They signed up on our website" is not proof of consent. You need the timestamp, the source URL, the IP address, and ideally the exact wording they agreed to. Under CASL, you must retain this for 3 years.

### 6. Ignoring implied consent expiry (CASL)

Implied consent from a purchase expires after 2 years. From an inquiry, 6 months. Many senders set up consent tracking at the start and never build expiry logic. Two years later, they're sending to expired-consent addresses - which is a CASL violation.

### 7. Making unsubscribe difficult

Multi-step unsubscribe flows ("Are you sure? Tell us why. Log in to confirm.") violate CAN-SPAM's requirement for a simple opt-out mechanism. They also violate GDPR's requirement that withdrawal be as easy as giving consent. One click. Done.

### 8. Forgetting List-Unsubscribe-Post

Adding only `List-Unsubscribe` without `List-Unsubscribe-Post` doesn't satisfy the RFC 8058 one-click requirement. You need both headers, and both must be covered by your DKIM signature.

### 9. Sending "one last email" after unsubscribe

"We're sorry to see you go!" emails sent after an unsubscribe are a violation if they contain any commercial content. If you want to send a confirmation of unsubscribe, make it purely informational with no promotional elements.

### 10. Not separating mail streams

Sending marketing and transactional email from the same domain/IP means a compliance issue with marketing email (complaints, blocks) affects your transactional delivery. Use separate subdomains: `mail.example.com` for transactional, `news.example.com` for marketing.

---

## Compliance checklist

### Every commercial email must have:

- [ ] Accurate From name and email address
- [ ] Honest subject line that reflects the content
- [ ] Physical postal address visible in the message
- [ ] Clear and conspicuous unsubscribe mechanism
- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` headers (for bulk senders)
- [ ] Identification as an advertisement (CAN-SPAM)

### Your systems must support:

- [ ] Processing unsubscribes within 10 business days (CAN-SPAM/CASL) or 48 hours (Google/Yahoo)
- [ ] Suppression list checked before every send
- [ ] Consent records with timestamp, source, and basis
- [ ] CASL implied consent expiry tracking
- [ ] Data subject access and erasure request handling (GDPR)
- [ ] Hashed suppression for erased recipients

### Before sending to a new list or market:

- [ ] Determine which jurisdictions apply (US, EU, Canada, other)
- [ ] Verify you have the required consent basis for each recipient
- [ ] Confirm your unsubscribe flow works end-to-end
- [ ] Test that suppressed addresses are actually blocked
- [ ] Review email content for required disclosures

---

## References

- [CAN-SPAM Act Compliance Guide (FTC)](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - official FTC guidance
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe
- [GDPR Official Text](https://gdpr-info.eu/) - full regulation text with commentary
- [ePrivacy Directive](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32002L0058) - supplements GDPR for electronic communications
- [CASL Guidance on Implied Consent (CRTC)](https://crtc.gc.ca/eng/com500/guide.htm) - official Canadian guidance
- [CASL Consent Requirements (Government of Canada)](https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email)
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - bulk sender requirements including one-click unsubscribe
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/)
- [Microsoft Outlook Sender Requirements](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook-s-new-requirements-for-high-volume-senders/4399730)
- [M3AAWG Sender Best Common Practices](https://www.m3aawg.org/published-documents) - industry standards for responsible sending
