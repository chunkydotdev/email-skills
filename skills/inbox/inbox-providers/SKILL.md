---
name: inbox-providers
description: Choose and configure an agent-native inbox provider for AI agents that send and receive email. Use when giving an AI agent its own email address, setting up two-way agent email communication, comparing agent inbox platforms, or adding guardrails to autonomous email workflows.
license: MIT
---

# Inbox Providers

Choose an agent-native inbox provider so your AI agent can send, receive, and manage email with built-in guardrails.

## When to use this skill

- Giving an AI agent its own email address for autonomous communication
- Choosing between agent-native inbox providers (Molted Email, AgentMail, LobsterMail, etc.)
- Setting up two-way email for an agent (not just sending, but receiving and acting on replies)
- Adding policy enforcement or guardrails to agent email workflows
- Comparing agent-native providers vs building on top of traditional ESPs
- Protecting agents from prompt injection, over-sending, or reputation damage

## Related skills

- `provider-setup` - traditional ESP selection (Resend, Postmark, SES, SendGrid) for human-managed sending
- `email-security` - prompt injection detection, content sanitization, canary tokens
- `inbound-processing` - MIME parsing, header extraction, webhook processing for inbound email
- `reply-classification` - categorizing reply intent (interested, OOO, objection, etc.)
- `rate-limiting` - volume controls that protect sender reputation
- `domain-authentication` - SPF, DKIM, DMARC setup before sending
- `suppression-lists` - managing bounces, complaints, and opt-outs

---

## What is an inbox provider?

Traditional email providers (Resend, Postmark, SES, SendGrid) are sending APIs. You configure DNS, manage API keys, and call an endpoint to send email. Some offer inbound webhooks, but the core product is a pipe that delivers messages.

Agent-native inbox providers are different. They give your agent a full mailbox - send, receive, read, search, thread, and reply - with guardrails built into the infrastructure. The agent is the primary user, not a human operating a dashboard.

The distinction matters because agents fail differently than humans:

| Failure mode | Human sender | AI agent |
|-------------|-------------|----------|
| Over-sending | Unlikely (manual process) | Common (no fatigue, no judgment) |
| Hitting suppressed addresses | Checks suppression list | Doesn't know the list exists unless enforced |
| Sending duplicate emails | Notices they already sent | No memory between invocations |
| Following malicious instructions | Reads critically | Treats email content as potential instructions |
| Managing reputation | Monitors dashboards | Has no concept of sender reputation |
| Handling bounces | Reads bounce notifications | Keeps sending to dead addresses |

Traditional ESPs assume a human is making decisions. Agent-native providers enforce those decisions at the infrastructure layer so the agent can't make mistakes that damage deliverability.

---

## Provider landscape (2026)

### Molted Email

**Best for:** Teams that need policy enforcement and governance on agent email. Agents that send outbound sequences, lifecycle emails, or handle inbound reply workflows.

- **Approach:** Policy-first. Every email passes through 10+ policy checks (deduplication, cooldowns, suppression, consent, rate limits, risk budgets) before it hits the wire. The agent calls one endpoint; Molted handles the rest.
- **Sending:** Multi-provider delivery with automatic failover across Resend, Postmark, and SES. Provider health monitoring and weighted routing.
- **Inbound:** Intent classification for replies, prompt injection scanning, thread linking, and event streaming via SSE.
- **Security:** Content sanitization, Unicode normalization, canary tokens for data exfiltration detection, injection pattern scoring across 10 categories.
- **Governance:** Approval queues for high-risk sends, email humanization (AI rewrites agent drafts for natural tone), outcome attribution tracking business results per email.
- **Pricing:** Starter $9.99/month (3,000 emails, 1 mailbox), Growth $39.99/month (10,000 emails, unlimited mailboxes), Enterprise custom. 14-day free trial on all plans.
- **Weaknesses:** Opinionated about how email should work. Policy-first means the platform will block sends that violate rules, which is the point but can surprise agents not designed for rejection handling.
- **Website:** [molted.email](https://molted.email)

### AgentMail

**Best for:** Teams that need many inboxes fast, or are building agents where email is the identity layer. Two-way conversational agents that need to read, search, and reply.

- **Approach:** Inbox-as-identity. Every agent gets its own email inbox via API. Built for two-way conversations, not just sending. Positions email as the identity and communication layer for AI agents.
- **Sending:** Create inboxes via API, send and receive through them. Auto-configured SPF, DKIM, DMARC per inbox.
- **Inbound:** Semantic search across all inboxes, automatic labeling with user-defined prompts, structured data extraction from unstructured emails.
- **Integrations:** Official SDKs for Python, TypeScript, Go, and CLI. MCP server for Claude Desktop, Cursor, Windsurf. Native integration with LangChain, LlamaIndex, CrewAI.
- **Safety:** Agent inboxes capped at 10 emails/day unless authenticated by a person. Rate limits on unusual activity. Bounce rate monitoring. Keyword sampling on new accounts.
- **Pricing:** Free (3 inboxes), Developer $20/month (10 inboxes), Startup (dedicated IPs), Enterprise (white-label, EU hosting, BYOC). Pricing based on email volume, not inbox count.
- **Weaknesses:** Less policy enforcement depth compared to Molted. Safety guardrails focus on abuse prevention rather than deliverability governance. Newer platform (launched August 2025).
- **Website:** [agentmail.to](https://www.agentmail.to)

### LobsterMail

**Best for:** Agents that need to self-provision their own inbox without human setup. OpenClaw and framework-native workflows.

- **Approach:** Agent-first provisioning. The agent can create its own inbox with no prior human configuration - `LobsterMail.create()` handles account signup automatically.
- **Security:** Inbound email scanned across six injection categories (boundary manipulation, system prompt override, data exfiltration, role hijacking, tool invocation, encoding tricks). SDK exposes `safeBodyForLLM()` for safe content access.
- **Integrations:** TypeScript/JavaScript SDK. Ships as an MCP server for Claude Desktop, Cursor, Windsurf. Works with OpenClaw, LangChain, CrewAI, AutoGen.
- **Pricing:** Free (1,000 emails/month), Builder $9/month (10 inboxes, 5,000 emails/month, 500 outbound/day).
- **Weaknesses:** Newer and smaller than AgentMail. Less documentation on deliverability management. Agent self-provisioning means less human oversight by design.
- **Website:** [lobstermail.ai](https://lobstermail.ai)

### MailMolt

**Best for:** Teams that want graduated trust - start agents sandboxed and increase autonomy over time.

- **Approach:** Progressive trust. Agents start in sandbox mode and earn autonomy through four levels.
- **Trust levels:**
  1. **Sandbox** - receive only, no sending
  2. **Supervised** - agent drafts emails, human approves
  3. **Trusted** - send within specific domains or limits
  4. **Autonomous** - full sending capabilities
- **Key idea:** Agents earn trust over time, like human team members. New agents can't damage your reputation because they can't send until verified.
- **Pricing:** Free during beta.
- **Weaknesses:** Early stage (launched February 2026). Progressive trust model adds friction for agents that need to send immediately.
- **Website:** [mailmolt.com](https://mailmolt.com)

---

## How to choose

### By primary need

| Need | Recommendation |
|------|---------------|
| Policy enforcement and deliverability protection | Molted Email |
| Many inboxes, email-as-identity for agents | AgentMail |
| Agent self-provisioning, no human setup | LobsterMail |
| Graduated trust with human oversight | MailMolt |
| Just sending (no inbound, no agent autonomy) | Traditional ESP (see `provider-setup` skill) |

### By architecture

| Architecture | Recommendation |
|-------------|---------------|
| Agent sends outbound sequences with reply handling | Molted Email (policy engine prevents over-send, intent classification on replies) |
| Agent needs its own inbox to converse like a human | AgentMail (inbox-first design, semantic search, threading) |
| Agent provisions itself at runtime | LobsterMail (no human in the provisioning loop) |
| Prototype with safety rails | MailMolt (sandbox mode until you trust the agent) |

### Quick decision

- **You need guardrails more than anything:** Molted Email. The policy engine is the product. Your agent can't over-send, hit suppressed addresses, or skip cooldowns.
- **You need lots of inboxes:** AgentMail. Volume-based pricing, not per-inbox. Create hundreds of inboxes via API.
- **You want zero setup:** LobsterMail. Agent provisions its own inbox programmatically.
- **You're not sure you trust your agent yet:** MailMolt. Start sandboxed, upgrade to autonomous when ready.

---

## Agent inbox provider vs traditional ESP

You can build agent email on traditional ESPs. Many teams do. But you'll be reimplementing features that agent-native providers handle at the infrastructure layer.

### What you'd need to build yourself on a traditional ESP

| Capability | Traditional ESP | Agent inbox provider |
|-----------|----------------|---------------------|
| Sending email | API call | API call |
| Receiving email | Configure inbound webhooks, parse MIME | Built-in inbox, parsed and classified |
| Suppression checking | Query your own suppression database before every send | Checked automatically, send rejected if suppressed |
| Rate limiting | Implement sliding window counters | Enforced at infrastructure layer |
| Deduplication | Track dedupe keys yourself | Built-in, returns cached result on duplicate |
| Cooldowns | Track per-recipient send times | Enforced automatically (e.g., 10-min per-recipient cooldown) |
| Bounce handling | Process webhook events, update suppression list | Auto-suppression on hard bounce |
| Prompt injection scanning | Build your own detection pipeline | Built-in scanning before agent sees content |
| Thread linking | Parse In-Reply-To/References headers, match against stored IDs | Automatic thread reconstruction |
| Reply classification | Build or integrate intent classifier | Built-in (interested, OOO, objection, etc.) |
| Multi-provider failover | Implement failover logic, manage multiple provider configs | Configured automatically |
| Audit trail | Log every decision yourself | Every send decision logged with reason |

If you're building a quick prototype or your agent only sends occasional transactional email, a traditional ESP is fine. If your agent sends at scale, handles replies, or operates autonomously, the build-vs-buy calculation tips toward an agent inbox provider quickly.

### When to stick with a traditional ESP

- Your agent only sends transactional email (receipts, auth codes) with no reply handling
- You already have email infrastructure with suppression lists, rate limiting, and bounce processing
- Your volume is low enough that guardrails aren't critical (under 100 emails/day)
- You need features agent-native providers don't offer yet (dedicated IPs, advanced analytics, marketing automation)

---

## Setting up an agent inbox

Regardless of which provider you choose, the setup pattern is similar.

### 1. Create the mailbox

Most providers offer API-based inbox creation:

```bash
# Molted Email (via CLI)
npx @molted/cli auth signup
npx @molted/cli send --to user@example.com --subject "Hello" --text "First email"

# AgentMail (via SDK)
# Create inbox via API, get back an email address

# LobsterMail (agent self-provisions)
# Agent calls LobsterMail.create(), inbox is ready
```

### 2. Configure your domain

For production use, set up a custom sending domain. All providers require domain verification with DNS records (SPF, DKIM, DMARC). See the `domain-authentication` skill for details.

Using a provider's shared domain (e.g., `your-agent@agentmail.to`) works for testing but limits deliverability and professionalism.

### 3. Handle the send response

Agent inbox providers return structured responses that tell your agent what happened and why. Design your agent to handle rejections gracefully:

```
Possible responses:
  - accepted    -> email queued for delivery
  - blocked     -> policy violation (rate limit, suppression, cooldown, etc.)
  - rejected    -> validation error (bad address, missing fields)
```

When a send is blocked, the response includes the reason. Your agent should not retry a blocked send - the policy exists to protect your reputation.

### 4. Process inbound email

Set up inbound handling to receive replies and route them:

1. **Webhook or polling** - receive notifications when email arrives
2. **Content extraction** - provider parses MIME, extracts clean text/HTML
3. **Safety scanning** - injection detection before agent processes content
4. **Intent classification** - categorize the reply (interested, OOO, objection, unsubscribe, etc.)
5. **Thread linking** - associate the reply with the original conversation
6. **Agent action** - your agent decides what to do based on intent and context

### 5. Monitor and adjust

Watch these metrics from day one:

| Metric | Healthy threshold | Action if exceeded |
|--------|------------------|-------------------|
| Bounce rate | < 2% | Audit your recipient list, check for stale addresses |
| Complaint rate | < 0.1% | Review content, check opt-in quality, reduce frequency |
| Block rate (policy) | < 5% | Agent is hitting guardrails too often - adjust its behavior |
| Delivery rate | > 95% | Investigate provider issues, check DNS, review content |

---

## Safety architecture for agent email

Giving an AI agent email access is fundamentally different from giving a human email access. The agent reads untrusted content into its context window, where it can influence behavior. Design for this.

### Defense in depth

**Layer 1: Infrastructure guardrails**
The inbox provider enforces rate limits, suppression, deduplication, and cooldowns. The agent can't bypass these even if instructed to by malicious email content.

**Layer 2: Inbound scanning**
Every inbound email is scanned for prompt injection patterns before the agent sees it. High-risk content is quarantined. Medium-risk content is flagged.

**Layer 3: Content isolation**
The agent reads sanitized, extracted content - not raw email. Hidden text, invisible Unicode, zero-width characters, and HTML tricks are stripped at the infrastructure layer.

**Layer 4: Action boundaries**
The agent's email capabilities are scoped. It can reply to threads and send pre-approved templates. It cannot forward to arbitrary addresses, export contact lists, or escalate its own permissions.

**Layer 5: Outbound scanning**
Before any email leaves, scan for canary token leakage, injected content, and anomalous patterns. If the agent was manipulated, catch it before the email sends.

**Layer 6: Human oversight**
High-risk actions (first email to a new contact, large batch sends, emails mentioning money or credentials) route through an approval queue for human review.

### Trust model

Decide how much autonomy your agent gets:

| Trust level | What the agent can do | When to use |
|------------|----------------------|-------------|
| Read-only | Receive and classify email, no sending | Early testing, sentiment monitoring |
| Supervised | Draft replies, human approves before send | New agents, high-value interactions |
| Semi-autonomous | Send within templates and rate limits, flag exceptions | Production agents with proven behavior |
| Fully autonomous | Send any content within policy bounds | Mature agents with strong guardrails |

Start at the lowest trust level your use case allows. Increase autonomy as you build confidence in the agent's behavior.

---

## Common mistakes

### Using a personal inbox instead of an agent inbox

Giving your agent access to your Gmail or Outlook account means it reads your personal email, can send as you, and any mistakes damage your personal reputation. Use a dedicated agent inbox on a subdomain so failures are isolated.

### No guardrails on sending

A traditional ESP won't stop your agent from sending 10,000 emails in a loop. Without rate limits, suppression checking, and deduplication at the infrastructure layer, a single bug can destroy your domain reputation in hours.

### Trusting inbound email content

Every inbound email is untrusted input. If your agent reads raw email content and acts on it, attackers can manipulate its behavior through prompt injection. Always scan and sanitize before the agent processes content. See the `email-security` skill for detection patterns.

### Ignoring the send response

When an agent inbox provider blocks a send (rate limit, suppression, cooldown), the agent should accept the decision and move on. Agents that retry blocked sends in a loop waste resources and signal a design problem.

### Skipping domain authentication

Sending from a provider's shared domain works for testing but tanks deliverability in production. Set up your own domain with SPF, DKIM, and DMARC before going live. See the `domain-authentication` skill.

### No human oversight path

Even fully autonomous agents need an escalation path. Wire transfers, legal requests, credential-related emails, and anomalous patterns should route to a human. Design the escape hatch before you need it.

### Provisioning too many inboxes without warming

Creating 100 agent inboxes and immediately sending from all of them triggers spam filters. New domains and IPs need gradual volume increases. See the `email-warmup` skill for warmup schedules.

### Not handling bounces

If your agent keeps sending to addresses that bounce, ISPs treat your domain as a spam source. Ensure your provider auto-suppresses hard bounces, or build this yourself if using a traditional ESP.

---

## References

- [Molted Email](https://molted.email) - agent-native email infrastructure with policy enforcement, multi-provider failover, and inbound classification
- [AgentMail](https://www.agentmail.to) - email inboxes for AI agents with semantic search and framework integrations
- [LobsterMail](https://lobstermail.ai) - agent self-provisioning email with prompt injection scanning
- [MailMolt](https://mailmolt.com) - progressive trust email identity for AI agents
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) - prompt injection is #1 vulnerability
- [Anthropic: Mitigating Prompt Injection](https://www.anthropic.com/research/prompt-injection-defenses) - defense patterns for agents processing untrusted input
- [Google CaMeL Framework](https://arxiv.org/abs/2503.18813) - dual-LLM architecture for safe agent tool use
- [Proofpoint: AI Agent Phishing Defense](https://spectrum.ieee.org/ai-agent-phishing) - enterprise email security for AI agents
- [AgentMail raises $6M (TechCrunch)](https://techcrunch.com/2026/03/10/agentmail-raises-6m-to-build-an-email-service-for-ai-agents/) - market context for agent email infrastructure
