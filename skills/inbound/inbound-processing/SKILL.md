---
name: inbound-processing
description: Receive, parse, and process incoming email via provider webhooks. Use when setting up inbound email handling, parsing MIME messages, extracting content from replies, detecting threads, filtering spam on inbound, or routing incoming messages.
license: MIT
---

# Inbound Email Processing

Receive incoming email, parse it into structured data, and route it to the right place.

## When to use this skill

- Setting up inbound email processing for the first time
- Choosing between provider inbound features (Postmark, SendGrid, Mailgun, SES)
- Parsing MIME messages (multipart bodies, attachments, inline images)
- Extracting clean content from HTML email or stripping quoted replies
- Building thread detection from email headers (In-Reply-To, References, Message-ID)
- Filtering inbound email for spam, phishing, or injection attacks
- Designing routing logic for incoming messages (support, billing, leads, etc.)
- Handling webhook payloads from email providers

## Related skills

- `domain-authentication` - SPF/DKIM/DMARC setup that affects inbound auth verification
- `reply-classification` - classifying reply intent (interested, OOO, objection, etc.)
- `thread-management` - maintaining full conversation context across messages
- `webhook-processing` - general webhook handling patterns (retries, idempotency)
- `email-security` - injection attacks, content sanitization, phishing prevention
- `bounce-handling` - processing delivery failures from outbound sends

---

## How inbound email works

When someone sends an email to your domain, it hits an MX server. You have two options:

1. **Run your own mail server** - receive raw SMTP, parse MIME yourself. High control, high maintenance. Almost never worth it for application developers.
2. **Use a provider's inbound feature** - the provider receives the email, parses it, and POSTs structured data to your webhook URL. This is what you should do.

The provider handles MX record reception, MIME parsing, spam pre-filtering, and delivers a clean JSON payload to your endpoint. You handle business logic.

---

## Provider inbound features

### Postmark

The cleanest developer experience for inbound. Postmark parses emails and POSTs JSON to your webhook URL.

**Setup:**
1. Point your MX record to Postmark's inbound servers
2. Configure the webhook URL in your Postmark server settings
3. Postmark POSTs JSON for every inbound message

**Key payload fields:**

```json
{
  "From": "sender@example.com",
  "FromFull": { "Email": "sender@example.com", "Name": "Jane Smith" },
  "To": "support+ref123@yourdomain.com",
  "ToFull": [{ "Email": "support+ref123@yourdomain.com", "Name": "" }],
  "Subject": "Re: Your proposal",
  "TextBody": "Looks great, let's schedule a call.",
  "HtmlBody": "<html>...</html>",
  "MessageID": "<abc123@mail.example.com>",
  "Headers": [
    { "Name": "In-Reply-To", "Value": "<original-id@yourdomain.com>" },
    { "Name": "References", "Value": "<original-id@yourdomain.com>" },
    { "Name": "Authentication-Results", "Value": "spf=pass; dkim=pass; dmarc=pass" }
  ],
  "Attachments": [
    {
      "Name": "proposal.pdf",
      "Content": "base64-encoded-content",
      "ContentType": "application/pdf",
      "ContentLength": 54321
    }
  ],
  "MailboxHash": "ref123"
}
```

**MailboxHash trick:** Postmark parses the `+` portion of the To address into `MailboxHash`. Send from `support+userId123@yourdomain.com`, and when the reply comes back, `MailboxHash` is `userId123`. Use this for stateless thread/user association without database lookups.

**Retry behavior:** Postmark retries on non-2xx responses. Return 200 quickly and process asynchronously.

### SendGrid (Inbound Parse)

SendGrid's Inbound Parse posts email data as `multipart/form-data`, not JSON. This catches people off guard.

**Setup:**
1. Add an MX record pointing to `mx.sendgrid.net` (priority 10)
2. Configure the Inbound Parse webhook URL in Settings > Inbound Parse
3. Optionally enable spam checking (for emails under 2.5 MB)

**Key form fields:**

| Field | Content |
|-------|---------|
| `from` | Sender address |
| `to` | Recipient address |
| `subject` | Subject line |
| `text` | Plain text body |
| `html` | HTML body |
| `envelope` | JSON string with actual SMTP envelope sender/recipients |
| `headers` | Full raw headers as a single string |
| `attachments` | Number of attachments |
| `attachment1`, `attachment2`... | File uploads |

**Important:** The `headers` field is a raw string, not parsed JSON. You need to parse it yourself to extract `In-Reply-To`, `References`, and `Authentication-Results`.

**Raw mode:** If you need the full raw MIME message (for your own parsing or archival), enable "Post the raw, full MIME message" in settings. The raw message arrives in the `email` field.

### Mailgun

Mailgun's Routes feature is the most flexible for pattern-based inbound routing.

**Setup:**
1. Point MX records to Mailgun's servers
2. Create Routes with match expressions and actions

**Route matching examples:**

```
# Match a specific address
match_recipient("support@yourdomain.com") -> forward("https://your-api.com/webhooks/support")

# Catch-all for a domain
match_recipient(".*@yourdomain.com") -> forward("https://your-api.com/webhooks/inbound")

# Match by header
match_header("subject", ".*urgent.*") -> forward("https://your-api.com/webhooks/urgent")
```

**Payload:** Mailgun POSTs `multipart/form-data` with fields like `sender`, `recipient`, `subject`, `body-plain`, `body-html`, `stripped-text` (body without quoted parts), `stripped-html`, and `Message-Id`.

**Stripped content:** Mailgun is the only major provider that strips quoted reply text for you automatically. The `stripped-text` and `stripped-html` fields contain only the new content, not the quoted thread below. This saves you from implementing your own reply stripping.

### AWS SES

SES is the most powerful option but requires the most assembly. It does not POST webhooks - it stores raw messages and notifies you.

**Setup:**
1. Verify the domain in SES
2. Create Receipt Rules that define what happens when email arrives
3. Chain actions: store to S3, notify via SNS, invoke Lambda

**Architecture pattern:**

```
Email arrives
  -> SES Receipt Rule matches recipient
    -> Store raw MIME in S3
    -> Publish SNS notification
      -> Lambda triggered by SNS
        -> Parse MIME from S3
        -> Process and route
```

**Key considerations:**
- SES inbound is only available in US East (N. Virginia), US West (Oregon), and EU (Ireland)
- Maximum email size is 40 MB (including headers)
- You get the raw MIME message, not parsed fields - you must parse it yourself
- Lambda can be invoked synchronously (to control mail flow with STOP_RULE/CONTINUE) or asynchronously (fire-and-forget processing)
- Receipt Rules evaluate in order; processing stops at the first match unless you return CONTINUE

**When to use SES:** When you need raw MIME access, want to store every message in S3 for compliance, or are already deep in the AWS ecosystem. Not recommended if you just want parsed JSON.

---

## MIME parsing

If you are processing raw email (from SES, or using raw mode on other providers), you need to understand MIME structure.

### Multipart message structure

A typical email with HTML body and attachments has this MIME tree:

```
multipart/mixed
  +-- multipart/alternative
  |     +-- text/plain          (plain text body)
  |     +-- multipart/related
  |           +-- text/html     (HTML body)
  |           +-- image/png     (inline image, referenced by Content-ID)
  +-- application/pdf           (attachment)
```

**Key multipart types:**

| Type | Purpose |
|------|---------|
| `multipart/mixed` | Top-level container when message has attachments |
| `multipart/alternative` | Same content in multiple formats (text + HTML) |
| `multipart/related` | HTML body with inline resources (images referenced by `cid:`) |

### Walking the MIME tree

Parse in this order:

1. Check the top-level `Content-Type`. If it is `multipart/*`, descend into parts.
2. For `multipart/alternative`, prefer `text/html` for rendering, keep `text/plain` as fallback.
3. For `multipart/related`, the first part is the HTML body. Subsequent parts are inline resources. Match them using `Content-ID` headers (the HTML references them as `src="cid:image001"`).
4. For `multipart/mixed`, iterate children. Parts with `Content-Disposition: attachment` are attachments. Parts with `Content-Disposition: inline` are inline content.
5. For each leaf part, decode based on `Content-Transfer-Encoding` (usually `base64` or `quoted-printable`).

### Content-ID and inline images

Inline images use the `Content-ID` header to create a reference that the HTML body can embed:

```
Content-Type: image/png
Content-ID: <logo@company.com>
Content-Disposition: inline
Content-Transfer-Encoding: base64
```

The HTML body references this as `<img src="cid:logo@company.com">`. When processing inbound HTML, you can either:
- Replace `cid:` references with data URIs (for immediate display)
- Upload inline images to your own storage and rewrite the `src` attributes
- Strip inline images entirely if you only need the text content

### Character encoding

The `Content-Type` header specifies the charset: `Content-Type: text/plain; charset=utf-8`. Common charsets you will encounter:
- `utf-8` - the standard, handles everything
- `iso-8859-1` / `latin1` - Western European, still common in legacy systems
- `windows-1252` - Microsoft's extension of ISO-8859-1
- `iso-2022-jp` - Japanese email, especially from older systems

Always normalize to UTF-8 after decoding. Libraries like `iconv-lite` (Node.js) or Python's built-in `codecs` handle this.

### Parsing libraries

Don't write your own MIME parser. Use battle-tested libraries:

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | `mailparser` (from Nodemailer) | Full-featured, handles edge cases well |
| Node.js | `postal-mime` | Lightweight, works in workers/edge |
| Python | `email` (stdlib) | Built-in, handles most cases |
| Go | `net/mail` + `mime/multipart` | Standard library, lower-level |
| Ruby | `mail` gem | Mature, widely used |
| C#/.NET | `MimeKit` | The gold standard for .NET MIME parsing |

---

## Email header parsing

### Threading headers

Three headers control email threading. All are defined in RFC 5322.

**Message-ID:** A globally unique identifier for each message, enclosed in angle brackets.

```
Message-ID: <unique-id-12345@yourdomain.com>
```

Generate a unique Message-ID for every outbound email. Format: `<unique-value@your-sending-domain>`. Without this, replies cannot reference your message.

**In-Reply-To:** Contains the Message-ID of the message being replied to.

```
In-Reply-To: <unique-id-12345@yourdomain.com>
```

This is your primary thread-linking mechanism. When an inbound message has `In-Reply-To`, look up the original send by matching against your outbound Message-IDs.

**References:** Contains the Message-IDs of all messages in the thread chain, oldest first.

```
References: <first-message@example.com> <second-message@example.com> <third-message@example.com>
```

When building a reply, set `References` to the parent's `References` (if any) followed by the parent's `Message-ID`. This creates a full thread chain that any email client can reconstruct.

### Thread detection in practice

The reliable path for thread linking:

```
1. Inbound message arrives with In-Reply-To header
2. Look up In-Reply-To value against your stored outbound Message-IDs
3. If found: exact match, high confidence (1.0)
4. If not found: fall back to References header, check each ID
5. If still not found: fall back to heuristic matching
```

**Fallback heuristics** (lower confidence, use with caution):
- Match sender email against recent outbound recipients (within 7 days)
- Match subject line after stripping Re:/Fwd: prefixes
- Match the `+tag` portion of the recipient address (Postmark's MailboxHash pattern)

Assign a confidence score to each linking method. Exact `In-Reply-To` match gets 1.0. Heuristic matches should get 0.5 or lower. Let downstream logic (routing, auto-responses) use the confidence to decide how aggressively to act.

### Authentication headers

The `Authentication-Results` header is added by the receiving mail server and contains SPF, DKIM, and DMARC verification results.

```
Authentication-Results: mx.yourdomain.com;
  spf=pass (sender IP is 198.51.100.1) smtp.mailfrom=sender@example.com;
  dkim=pass header.d=example.com header.s=selector1;
  dmarc=pass (policy=reject) header.from=example.com
```

Parse this to extract three values:

| Mechanism | Values | What it means |
|-----------|--------|---------------|
| SPF | pass, fail, softfail, neutral, none | Whether the sending IP is authorized |
| DKIM | pass, fail, none | Whether the cryptographic signature is valid |
| DMARC | pass, fail, none | Whether SPF/DKIM align with the From domain |

**How to use auth results for inbound filtering:**
- All three pass: sender is authenticated, lower spam score
- DMARC fail: the From domain does not authorize this sender - increase phishing/spam score
- SPF softfail + DKIM fail: suspicious but not definitive - flag for review
- All three fail: very likely spoofed or unauthorized - quarantine or reject

Also check the `Received-SPF` header as a fallback for SPF results if `Authentication-Results` does not contain SPF.

---

## Content extraction

### HTML to text conversion

When you receive HTML email but need plain text (for classification, search indexing, or display), do not just strip tags. That turns `<p>Hello</p><p>World</p>` into `HelloWorld`.

Proper conversion:
- Insert newlines for block elements (`<p>`, `<div>`, `<br>`, `<li>`, `<tr>`)
- Convert `<a href="url">text</a>` to `text (url)` or just `text`
- Convert lists to indented lines with bullets/numbers
- Preserve table structure as aligned text where possible
- Strip scripts, styles, and hidden elements before conversion

Libraries: `html-to-text` (Node.js), `html2text` (Python), `Jsoup` (Java).

### Quoted reply stripping

When someone replies to an email, their client includes the original message below a marker line. You want the new content, not the entire quoted history.

**Common quote markers:**

```
On Mon, Mar 30, 2026, Jane Smith <jane@example.com> wrote:
```

```
From: Jane Smith <jane@example.com>
Sent: Monday, March 30, 2026
```

```
> This is quoted text
> from the original message
```

```
-----Original Message-----
```

```
________________________________
```

**Stripping approaches:**

1. **Line-prefix detection:** Lines starting with `>` are quoted. Simple but misses HTML-formatted quotes.
2. **Marker line detection:** Scan for patterns like `On .* wrote:`, `-----Original Message-----`, or `From:.*Sent:.*` blocks. Everything after the marker is quoted.
3. **Provider features:** Mailgun gives you `stripped-text` automatically. Postmark does not. SendGrid does not.
4. **Libraries:** GitHub's `email_reply_parser` (Ruby, with ports to Python, JavaScript, Go) handles the common patterns. Mailgun's `talon` library (Python) uses machine learning for signature and reply detection.

**Practical advice:** Start with marker-line detection for the most common patterns. Fall back to `>` prefix detection. Accept that you will never catch 100% of cases - email client formatting is inconsistent. Log raw content alongside stripped content so you can debug false positives.

### Content sanitization

Inbound email content is untrusted input. Sanitize before storing or displaying.

**Plain text sanitization:**
- Strip invisible Unicode characters (zero-width spaces, byte order marks, directional overrides)
- Remove data URIs (`data:text/html;base64,...`) that could embed executable content
- Truncate to reasonable limits (100 KB for text, 500 KB for HTML, 1 KB for subject lines)
- Preserve UTF-8 character boundaries when truncating - do not cut in the middle of a multi-byte character

**HTML sanitization:**
- Strip `<script>`, `<iframe>`, and event handler attributes (`onclick`, `onload`, etc.)
- Strip hidden elements (`display:none`, `visibility:hidden`, `font-size:0`) - these are commonly used to smuggle content past human readers
- Allowlist tags rather than blocklist. A safe allowlist: `p`, `br`, `a`, `b`, `i`, `em`, `strong`, `u`, `ul`, `ol`, `li`, `h1`-`h6`, `table`, `thead`, `tbody`, `tr`, `td`, `th`, `img`, `div`, `span`, `blockquote`, `pre`, `code`
- Allowlist attributes per tag: `href` and `title` on `<a>`, `src`/`alt`/`width`/`height` on `<img>`, `colspan`/`rowspan` on `<td>`/`<th>`
- Only allow `https:` and `mailto:` URL schemes. Reject `javascript:`, `data:`, `vbscript:`, and anything else
- Decode HTML entities before checking URL protocols to prevent bypasses like `&#106;avascript:`

**Size limits** (reasonable defaults):

| Field | Max size | Rationale |
|-------|----------|-----------|
| Subject | 1 KB | RFC 5322 has no limit, but anything longer is spam or malformed |
| Text body | 100 KB | Sufficient for any legitimate business email |
| HTML body | 500 KB | HTML with inline styles can be larger, but 500 KB is generous |
| Single attachment | 25 MB | Gmail's limit, a reasonable default |
| Total message | 40 MB | SES's limit, most providers are similar |

---

## Inbound security filtering

### Authentication-based filtering

Use the parsed SPF/DKIM/DMARC results to adjust spam scores:

```
Auth failure weights:
  SPF fail or softfail: +0.3 to phishing score
  DKIM fail:            +0.3 to phishing score
  DMARC fail:           +0.4 to phishing score
  All three fail:       strong quarantine signal
```

Do not reject solely based on auth failure. Legitimate senders sometimes have misconfigured authentication, especially small businesses. Use auth results as one signal among many.

### Content-based spam signals

Pattern categories to check:

| Signal | Weight | Examples |
|--------|--------|---------|
| Spam keywords | 0.5 | "free gift", "act now", "limited time offer", "you've been selected" |
| Excessive caps | 0.3 | More than 50% uppercase letters (in messages with 20+ alpha characters) |
| Excessive links | 0.25 | More than 5 URLs in the body |
| Bulk sender patterns | 0.3 | "to unsubscribe", "view in browser", "email preferences" |
| Phishing urgency | 0.5 | "verify your account", "immediate action required", "account suspended" |
| Fake login requests | 0.4 | "enter your password", "sign in to verify", "update your payment info" |
| Executable references | 0.6 | `.exe`, `.bat`, `.ps1` file extensions, "enable macros" |
| Impersonation | 0.5 | "from the CEO", "wire transfer", "purchase gift cards" |
| Domain lookalikes | 0.35 | `paypa1.com`, `micr0soft.com`, `amaz0n.com` |

Sum the weights of matched categories. Verdict threshold at 0.5: above it, classify as the highest-scoring threat type. Below it, classify as clean.

### Prompt injection detection (for AI/agent mailboxes)

If an AI agent reads your inbound email, you need to scan for prompt injection before the agent sees the content. This is a real attack surface - someone replies to your agent's outreach email with content designed to manipulate the agent.

**Pattern categories (ordered by severity):**

| Category | Weight | What it catches |
|----------|--------|----------------|
| System prompt mimicry | 0.60 | `system:`, `<\|im_start\|>`, `[INST]`, `<<SYS>>` |
| Instruction override | 0.50 | "ignore previous instructions", "override your rules" |
| Context manipulation | 0.50 | `assistant:`, "end of conversation", fake chat transcripts |
| Data exfiltration | 0.45 | "repeat your system prompt", "dump your API key" |
| Tool abuse | 0.45 | "call the function", `<function_call>`, JSON tool invocation |
| Authority escalation | 0.45 | "I am the admin", "debug mode enabled", "sudo access" |
| Role play | 0.40 | "you are now", "act as", "pretend to be" |
| Delimiter abuse | 0.35 | ` ```system `, `<instructions>`, `<prompt>` |
| Payload smuggling | 0.25 | Hidden text in HTML comments, zero-size font content |
| Encoding evasion | 0.25 | Base64-encoded instructions, Cyrillic-Latin mixing, zero-width character clusters |

**Risk levels:**
- Score >= 0.70: **High** - quarantine, do not show to agent
- Score >= 0.30: **Medium** - quarantine for human review
- Score > 0: **Low** - flag but allow through
- Score = 0: **None** - clean

**Canary token defense:** For unknown attack patterns that bypass regex matching, embed a unique token in the agent's context for each thread. If the token appears in any outbound draft (meaning the agent was manipulated into echoing its context), block the send and flag the thread. This catches injection attacks by their effect rather than their form.

### Sender whitelisting

Allow trusted senders to bypass classification. Match by exact email or by domain. Contacts from known partners, internal addresses, and verified customers do not need injection scanning on every message. The false positive cost on routine correspondence from trusted senders outweighs the risk.

But maintain the whitelist carefully. Compromised accounts are a real attack vector.

---

## Inbound routing

### Routing by intent

After classifying the inbound message, route it based on intent:

| Intent | Action | SLA |
|--------|--------|-----|
| `interested` | Notify owner / auto-respond | 5 minutes |
| `support` | Route to support queue | 30 minutes |
| `billing` | Route to billing, require approval | 60 minutes |
| `legal` | Route to human review, never auto-respond | 30 minutes |
| `security` | Route to human review, never auto-respond | 15 minutes |
| `out_of_office` | Auto-archive | - |
| `objection` | Auto-archive, update suppression | - |
| `not_now` | Auto-archive, schedule follow-up | - |
| `unclassified` | Route to owner with low priority | 60 minutes |

### Confidence-based escalation

Do not let automated routing act on low-confidence classifications:

- **Confidence < 0.6:** Escalate to human approval regardless of intent. The classifier is not sure enough for autonomous action.
- **Conflicting intents** (top two scores within 0.15 of each other): Escalate. The message is ambiguous.
- **Adversarial position detected** (e.g., "legal" keywords appearing only in the body, not the subject, with action indicators): Escalate. May be an attempt to trigger a specific routing path.

### Catch-all and domain-based routing

Set up routing at the domain level:

```
support@yourdomain.com  -> support queue
billing@yourdomain.com  -> billing queue
sales@yourdomain.com    -> sales notifications
*@yourdomain.com        -> catch-all inbox
```

Enable catch-all routing on your mailbox so that typos and unknown addresses still arrive somewhere. Without a catch-all, emails to `suport@yourdomain.com` (typo) bounce, and you lose the message.

### Thread anomaly detection

Watch for suspicious patterns in thread context:

- **Forged thread injection:** A new sender appears in an existing thread who was never part of the conversation. Flag as suspicious.
- **Intent flip from different sender:** Thread history shows `interested` from `alice@example.com`, then a new message with `objection` from `bob@example.com`. This is either a different stakeholder or a manipulation attempt. Route to human review.
- **Rapid intent flip:** Same thread flips from `interested` to `objection` (or vice versa) within 30 minutes. Unusual and worth flagging.

If multiple anomalies occur in the same thread, or an intent flip comes from a new sender, treat it as critical severity and require human approval before any automated action.

---

## Webhook processing architecture

### Return 200 immediately

Your webhook endpoint should store the raw payload and return 200 within a few seconds. Do all processing asynchronously.

```
Webhook receives POST
  -> Validate payload (signature, required fields)
  -> Store raw message to database/queue
  -> Return 200
  -> [async] Parse content
  -> [async] Run safety classification
  -> [async] Link to thread
  -> [async] Route and notify
```

If your webhook does parsing, classification, database writes, and third-party calls before returning, you will hit timeouts and trigger retries. Retries create duplicate processing.

### Idempotency

Webhook deliveries are at-least-once. You will receive duplicates. Deduplicate using:
- Provider's message ID (Postmark's `MessageID`, SendGrid's `Message-Id` header)
- The email's `Message-ID` header
- A hash of sender + recipient + subject + timestamp

Store processed message IDs and skip duplicates before doing any work.

### Rate limiting inbound

Count inbound messages toward your tenant's quota. Providers that charge per-message (like Resend) bill for both directions. Even if you do not get billed per inbound, rate-limit to protect against:
- Mailbomb attacks (thousands of emails to one address)
- Runaway forwarding rules that create loops
- Compromised accounts flooding your webhook

---

## Common mistakes

1. **Processing inside the webhook handler.** Do classification, routing, and notifications asynchronously. If your handler takes 30 seconds, the provider retries, and you process the same message twice.

2. **Not deduplicating.** Webhook delivery is at-least-once. If you do not check for duplicate message IDs, you will create duplicate records, send duplicate notifications, and confuse your users.

3. **Trusting Content-Type for body format.** Some emails claim `text/html` but contain plain text. Some claim `text/plain` but contain HTML tags. Check the actual content, not just the header.

4. **Using subject-line matching for threading.** Subject lines change (`Re: Re: Fwd: Re: Original`), get mangled by email clients, and are trivially spoofable. Use `In-Reply-To` and `References` headers. Subject matching is a last resort.

5. **Not sanitizing inbound HTML.** Email HTML is untrusted input from the internet. If you display it without sanitizing, you are vulnerable to XSS, tracking pixels, and hidden content attacks. Allowlist tags and attributes, not blocklist.

6. **Stripping quoted replies too aggressively.** There is no standard for quote markers. If your stripping logic is too aggressive, you will lose actual message content. Keep the raw message alongside the stripped version.

7. **Ignoring Authentication-Results.** The receiving server already checked SPF, DKIM, and DMARC for you. The results are in the headers. Parse them and use them as a signal for spam scoring. Ignoring them means you are throwing away free security data.

8. **Auto-responding to everything.** Auto-responses to out-of-office replies create loops. Auto-responses to mailing lists create storms. Auto-responses to spam confirm your address is active. Check intent and sender type before auto-responding. Never auto-respond to messages with the `Auto-Submitted` header set to anything other than `no`.

9. **Blocking on auth failure alone.** Legitimate senders have misconfigured SPF/DKIM/DMARC all the time, especially small businesses. Use auth results as one signal in a weighted scoring system, not as a binary gate.

10. **Not storing the raw MIME.** Even if you parse and extract everything, store the raw message. You will need it for debugging, compliance, and re-processing when your parsing logic improves.

---

## References

- [RFC 5322 - Internet Message Format](https://www.rfc-editor.org/rfc/rfc5322.html) - message structure, Message-ID, In-Reply-To, References
- [RFC 2045-2049 - MIME](https://www.rfc-editor.org/rfc/rfc2045) - multipart messages, content types, transfer encoding
- [RFC 7001 - Authentication-Results header](https://www.rfc-editor.org/rfc/rfc7001) - SPF/DKIM/DMARC result reporting
- [RFC 5256 - IMAP SORT and THREAD](https://www.rfc-editor.org/rfc/rfc5256.html) - thread reconstruction algorithms
- [Postmark Inbound Webhook docs](https://postmarkapp.com/developer/webhooks/inbound-webhook) - JSON payload format and setup
- [SendGrid Inbound Parse docs](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/inbound-email) - webhook format and configuration
- [Mailgun Inbound Routing docs](https://www.mailgun.com/features/inbound-email-routing/) - route matching and stripped content
- [AWS SES Receiving Email docs](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html) - receipt rules, S3, Lambda
- [GitHub email_reply_parser](https://github.com/github/email_reply_parser) - quoted reply stripping library
- [Mailgun talon](https://github.com/mailgun/talon) - ML-based email signature and reply detection
- [molted.email](https://molted.email) - managed inbound processing with intent classification, injection scanning, and routing built in
