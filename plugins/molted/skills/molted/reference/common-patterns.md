<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Common Patterns

### Pattern 1: Safe Send (Check → Send)

```
1. POST /v1/agent/simulate-send       → check if policy allows
2. POST /v1/agent/request-send         → send if simulation passed
```

### Pattern 2: Informed Send (Propose → Decide → Send)

```
1. POST /v1/agent/propose-email        → get templates + contact context
2. POST /v1/agent/simulate-send        → dry-run with chosen template
3. POST /v1/agent/request-send         → commit the send
```

### Pattern 3: Send with Followup

```
1. POST /v1/agent/request-send         → initial email
2. POST /v1/agent/schedule-followup    → auto followup in 3 days, cancel on reply
```

### Pattern 4: Multi-Agent Safe Send

```
1. POST /v1/agent/coordination/lease   → acquire exclusive access
2. GET  /v1/agent/thread-context       → understand contact history
3. POST /v1/agent/next-best-action     → get recommendation
4. POST /v1/agent/request-send         → send if recommended
5. DELETE /v1/agent/coordination/lease  → release when done
```

### Pattern 5: Inbound Triage

```
1. POST /v1/agent/classify-intent      → classify the reply
2. GET  /v1/agent/thread-context       → get full contact history
3. POST /v1/agent/next-best-action     → decide what to do
4. Branch on recommendation:
   - "reply"    → POST /v1/agent/outbound/reply
   - "wait"     → POST /v1/agent/schedule-followup
   - "escalate" → POST /v1/agent/override/:threadId/escalate
   - "stop"     → no action
```

### Pattern 6: Batch Outreach

```
1. GET  /v1/agent/budget               → check remaining quota
2. POST /v1/agent/simulate-batch       → pre-check all recipients
3. POST /v1/agent/batch/request-send   → send to allowed recipients
```

### Pattern 7: Fatigue-Aware Send

```
1. GET  /v1/agent/analytics/contact-fatigue  → check fatigue score
2. Branch on recommendation:
   - "safe_to_send"      → proceed to send
   - "reduce_frequency"  → delay or skip
   - "stop_sending"      → do not send
3. POST /v1/agent/request-send               → send if safe
```

### Pattern 8: Journey-Driven Onboarding

```
1. POST /v1/templates                  → create email templates
2. POST /v1/templates/:id/versions     → add content versions
3. POST /v1/journeys                   → create the journey
4. POST /v1/journeys/:id/steps         → add send/delay/branch steps
5. PATCH /v1/journeys/:id              → activate the journey
6. POST /v1/agent/events/ingest        → fire trigger event for a contact
```

### Pattern 9: Full Setup (New Agent)

```
1.  POST /api/auth/sign-up/email        → create account
2.  POST /v1/me/keys                    → generate API key
3.  GET  /v1/me/tenant                  → get tenant ID
4.  POST /v1/templates                  → create first template
5.  POST /v1/templates/:id/versions     → add template content
6.  POST /v1/agent/simulate-send        → dry-run to confirm setup
7.  POST /v1/agent/request-send         → send first email (uses default @agent.molted.email address)
--- optional: custom domain + mailbox ---
8.  POST /v1/agent/domains              → add custom sending domain
9.  GET  /v1/agent/domains/:id/domain-connect → check for one-click DNS setup
10. POST /v1/agent/domains/:id/verify   → verify DNS records
11. POST /v1/agent/mailboxes            → create mailbox for receiving
```

---
