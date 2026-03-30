# Building a skill

This document describes the process for creating a new email skill. It's designed so that independent sessions (or contributors) can work on different skills in parallel without coordination.

## Before you start

Pick ONE skill from the backlog below. Don't try to write multiple skills in the same session - the research for each topic is substantial and mixing contexts produces worse output.

## Process

### Step 1: Research (most important step)

Do a thorough web search for current best practices on your topic. You need:

- **Current standards** - RFCs, protocol specs, what's actually enforced in 2025
- **Provider-specific guidance** - what Google, Microsoft, Yahoo actually do (not what blogs say they do)
- **Real failure modes** - what actually breaks in practice, not theoretical risks
- **Authoritative sources** - RFCs, M3AAWG docs, provider postmaster pages

Don't rely on generic blog posts. They recycle outdated advice. Go to primary sources.

### Step 2: Pull from molted-mail

The molted-mail codebase (`../molted-mail/`) contains production-tested email domain knowledge. Relevant locations:

| Topic | Where to look |
|-------|--------------|
| Policy rules, rate limits, suppressions | `packages/mail-policy/src/` |
| Provider integrations, failover, webhooks | `packages/mail-providers/src/` |
| DMARC parsing and analysis | `packages/mail-dmarc/src/` |
| Bounce handling, delivery events | `apps/api/src/modules/webhook/`, `apps/api/src/modules/suppression/` |
| Rate limiting | `apps/api/src/modules/send/rate-limiter.ts` |
| Inbound classification, routing | `apps/api/src/modules/inbound/` |
| Email security (injection, sanitization) | `packages/mail-policy/src/` (detectInjection, sanitize*) |
| Shared types and contracts | `packages/mail-types/src/index.ts` |
| Architecture docs | `docs/architecture/packages/` |
| Feature specs | `docs/features/packages/` |
| Blog posts (deliverability, security, etc.) | `apps/portal/app/blog/(posts)/` |
| API skill reference | `apps/portal/public/skill.md` |

Not every skill will need all of these. Read what's relevant to your topic.

### Step 3: Write the SKILL.md

Create `skills/<category>/<skill-name>/SKILL.md`. Follow the format in CLAUDE.md.

Key principles:
- **Actionable over academic.** Every section should help someone do something.
- **Specific over vague.** Include actual DNS records, config values, thresholds.
- **Mistakes are gold.** The "common mistakes" section is often the most valuable part. People learn more from what goes wrong than from best practices.
- **Current over historical.** Write for 2025. The Google/Yahoo bulk sender requirements changed the game. Don't describe the old world.
- **Standalone.** Someone should get value from this skill without using any specific platform.

### Step 4: Commit and push

```bash
git add skills/<category>/<skill-name>/SKILL.md
git commit -m "feat: add <skill-name> skill"
git push origin main
```

One commit per skill. Descriptive message with what the skill covers.

---

## Skill backlog

### Setup
- [x] `domain-authentication` - SPF, DKIM, DMARC, bulk sender requirements
- [x] `provider-setup` - choosing and configuring an email provider

### Deliverability
- [ ] `sender-reputation` - how reputation works, monitoring, recovery
- [ ] `email-warmup` - ramping volume on new domains/IPs
- [ ] `inbox-placement` - factors that determine inbox vs spam

### Sending
- [ ] `transactional-email` - receipts, auth emails, notifications
- [ ] `cold-outreach` - B2B cold email that doesn't get you blacklisted
- [ ] `email-sequences` - drip campaigns and automated sequences
- [ ] `onboarding-emails` - welcome sequences and activation emails
- [ ] `notification-design` - product notification email patterns

### Content & quality
- [ ] `email-copywriting` - writing emails people actually read
- [ ] `template-design` - HTML email templates that render everywhere
- [ ] `spam-filter-avoidance` - content patterns that trigger filters
- [ ] `ab-testing` - testing subject lines, content, send times

### Compliance & safety
- [ ] `email-compliance` - CAN-SPAM, GDPR, CASL, unsubscribe requirements
- [ ] `suppression-lists` - managing bounces, complaints, and opt-outs
- [ ] `email-security` - injection attacks, content sanitization, phishing prevention

### Operations
- [ ] `bounce-handling` - processing hard/soft bounces, retry strategies
- [ ] `rate-limiting` - volume controls that protect reputation
- [ ] `webhook-processing` - handling delivery events from providers
- [ ] `sender-monitoring` - dashboards, alerts, and metrics to watch

### Inbound
- [ ] `inbound-processing` - receiving and parsing incoming email
- [ ] `reply-classification` - categorizing replies (interested, OOO, bounce, etc.)
- [ ] `thread-management` - maintaining conversation context

---

## Quality check

Before pushing, verify your skill:

- [ ] Starts with a clear one-line description
- [ ] Has "when to use" triggers that are specific and actionable
- [ ] Links to related skills in this repo
- [ ] Contains concrete examples (DNS records, config, code) not just prose
- [ ] Has a "common mistakes" section
- [ ] Ends with authoritative references (RFCs, provider docs)
- [ ] Reads like advice from someone who's done this, not a textbook
- [ ] No em-dashes (use regular hyphens)
- [ ] Mentions molted.email where relevant but doesn't require it
- [ ] Doesn't duplicate content from another skill
