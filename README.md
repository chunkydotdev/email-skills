# Email Skills

Open-source skill files that give AI agents deep email expertise - deliverability, authentication, bounce handling, content quality, compliance, and more.

24 skills across 7 categories, organized by the email lifecycle.

## What are skills?

Skills are markdown files that give AI agents specialized knowledge for specific tasks. When an agent detects a relevant task, it loads the appropriate skill to get expert-level guidance on how to handle it.

These skills work with any AI coding agent that supports the [Agent Skills](https://agentskills.io) format - Claude Code, Cursor, Windsurf, and others.

## Installation

### CLI (recommended)

```bash
npx skills add chunkydotdev/email-skills
```

### Clone

```bash
git clone https://github.com/chunkydotdev/email-skills.git
```

### Git submodule

```bash
git submodule add https://github.com/chunkydotdev/email-skills.git skills/email
```

## Available skills

### Setup

Get your email infrastructure right before you send anything.

| Skill | Description |
|-------|-------------|
| [domain-authentication](skills/setup/domain-authentication) | Set up SPF, DKIM, and DMARC. Bulk sender requirements. Non-sending domain lockdown. |
| [provider-setup](skills/setup/provider-setup) | Choose and configure an email provider. Multi-provider failover. Migration strategy. |

### Deliverability

Get into the inbox, not spam.

| Skill | Description |
|-------|-------------|
| [sender-reputation](skills/deliverability/sender-reputation) | How reputation works. Monitoring tools. Blocklist detection. Recovery playbook. |
| [email-warmup](skills/deliverability/email-warmup) | Ramp volume on new domains/IPs. Warmup schedules. Dedicated vs shared IP. |
| [inbox-placement](skills/deliverability/inbox-placement) | Signal hierarchy. Engagement signals. Gmail Promotions vs Primary. Spam filter diagnostics. |

### Sending

Write and send emails that work.

| Skill | Description |
|-------|-------------|
| [transactional-email](skills/sending/transactional-email) | Receipts, auth emails, notifications. Transactional vs commercial classification. Deduplication. |
| [cold-outreach](skills/sending/cold-outreach) | B2B cold email infrastructure. Volume limits. Legal requirements. Follow-up sequences. |
| [email-sequences](skills/sending/email-sequences) | Drip campaigns. Entry/exit triggers. Branching logic. Sequence performance metrics. |
| [onboarding-emails](skills/sending/onboarding-emails) | Welcome sequences. Activation emails. Trial-to-paid conversion. Stall detection. |
| [notification-design](skills/sending/notification-design) | Product notifications. Frequency management. Digest strategies. Preference centers. |

### Content & Quality

Make the email itself good.

| Skill | Description |
|-------|-------------|
| [email-copywriting](skills/content/email-copywriting) | Subject lines. Preview text. Email structure frameworks. CTAs. Mobile-first writing. |
| [template-design](skills/content/template-design) | HTML email that renders everywhere. Outlook fixes. Dark mode. Accessibility. |
| [spam-filter-avoidance](skills/content/spam-filter-avoidance) | Content patterns that trigger filters. Link hygiene. HTML structure. What doesn't work. |
| [ab-testing](skills/content/ab-testing) | Sample sizes. Statistical significance. Test design. Bandit algorithms. Holdout groups. |

### Compliance & Safety

Legal requirements and security.

| Skill | Description |
|-------|-------------|
| [email-compliance](skills/compliance/email-compliance) | CAN-SPAM, GDPR, CASL. One-click unsubscribe. Consent management. Transactional exemptions. |
| [suppression-lists](skills/compliance/suppression-lists) | Bounce/complaint suppression. GDPR erasure paradox. Provider migration. Role accounts. |
| [email-security](skills/compliance/email-security) | Prompt injection. Content sanitization. BEC patterns. Canary tokens. Thread integrity. |

### Operations

Monitor and maintain your sending.

| Skill | Description |
|-------|-------------|
| [bounce-handling](skills/operations/bounce-handling) | SMTP status codes. Hard vs soft bounce. Retry strategies. Auto-suppression. |
| [rate-limiting](skills/operations/rate-limiting) | Multi-window limits. Per-domain throttling. ISP 421 responses. Provider limits. |
| [webhook-processing](skills/operations/webhook-processing) | Delivery event webhooks. Signature verification. Idempotency. Provider formats. |
| [sender-monitoring](skills/operations/sender-monitoring) | Metrics and alerts. Google Postmaster Tools. Blocklist monitoring. Incident response. |

### Inbound

Handle replies and incoming email.

| Skill | Description |
|-------|-------------|
| [inbound-processing](skills/inbound/inbound-processing) | MIME parsing. Header extraction. Content sanitization. Provider inbound setup. |
| [reply-classification](skills/inbound/reply-classification) | Intent detection. OOO/bounce auto-detection. Confidence scoring. Routing rules. |
| [thread-management](skills/inbound/thread-management) | Threading headers (RFC 5322). Quoted reply stripping. Thread integrity. Provider differences. |

## How skills connect

Skills are designed to work together. Here's the typical flow:

```
Setup                  Deliverability              Sending
domain-authentication  sender-reputation           transactional-email
provider-setup    -->  email-warmup           -->  cold-outreach
                       inbox-placement             email-sequences
                                                   onboarding-emails
                                                   notification-design

Content & Quality      Compliance & Safety         Operations
email-copywriting      email-compliance            bounce-handling
template-design   -->  suppression-lists      -->  rate-limiting
spam-filter-avoidance  email-security              webhook-processing
ab-testing                                         sender-monitoring

                       Inbound
                       inbound-processing
                       reply-classification
                       thread-management
```

Start with **Setup** to get your infrastructure right. Move to **Deliverability** to build reputation. Then tackle **Sending** for your specific use case. The other categories support the entire lifecycle.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add or improve skills.

## License

MIT
