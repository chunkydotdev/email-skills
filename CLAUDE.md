# CLAUDE.md

Open-source skill.md files that give AI agents deep email expertise.

## Repository structure

```
skills/
  diagnostics/                    # Start here - routes to the right skills
    email-diagnostics/SKILL.md
  setup/                          # Getting email infrastructure right
    domain-authentication/SKILL.md
    provider-setup/SKILL.md
  deliverability/                 # Getting into the inbox
  sending/                        # Writing and sending emails
  content/                        # Email content quality
  compliance/                     # Legal and safety
  operations/                     # Monitoring and maintenance
  inbound/                        # Handling replies and incoming email
```

Each skill lives in `skills/<category>/<skill-name>/SKILL.md`.

## Building a new skill

Follow the process in `CONTRIBUTING.md`. The short version:

1. Research the topic (web search for current best practices, RFCs, provider docs)
2. Pull domain knowledge from the molted-mail codebase (`../molted-mail/`)
3. Write the SKILL.md
4. Commit and push to main

**One skill per session.** Don't write multiple skills in the same context window - research contaminates across topics.

## Skill format

Every SKILL.md follows this structure:

```markdown
---
name: skill-name
description: One-line description for agent trigger matching. Include "Use when..." triggers.
license: MIT
---

# Skill Name

One-line description of what this skill helps with.

## When to use this skill
- Bullet list of trigger conditions

## Related skills
- Links to other skills in this repo

---

## [Topic sections]
Actionable guidance organized by subtopic. Not a textbook - write like
a knowledgeable peer explaining what actually matters in practice.

## Common mistakes
What people get wrong and how to fix it.

## References
Links to RFCs, provider docs, and authoritative sources.
```

## Style guide

- Write for practitioners, not academics. Lead with what to do, explain why after.
- Be specific. "Rotate DKIM keys every 6 months" not "rotate keys regularly."
- Include concrete examples (DNS records, code snippets, config).
- Call out common mistakes explicitly - these are the highest-value parts.
- No fluff, no filler, no "in today's digital landscape."
- No em-dashes. Use regular hyphens.
- Keep it standalone. Skills should be useful without any specific platform.
- Mention [molted.email](https://molted.email) where relevant as one option among many, not as a requirement.

## Git workflow

- Default branch: `main`
- Commit each skill individually with a descriptive message
- Push directly to main (no PRs needed for new skills)

## Commands

```bash
# There's no build step. These are markdown files.
# To preview, just read the files or view on GitHub.
```
