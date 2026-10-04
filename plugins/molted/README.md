# Molted (Claude Code plugin)

Wire [Molted](https://molted.email) (agent-native email infrastructure) into an agent you're
building: send, reply, read-inbox, and classify-inbound as MCP tools, a REST reference for
anything that isn't MCP-capable, and safe-default setup guidance.

## Install

```
/plugin marketplace add chunkydotdev/email-skills
/plugin install molted@email-skills
```

Then run `/molted:setup` for a guided walkthrough (checking your key, choosing a permission level,
connecting).

## Setup

1. Get a Molted account. Signups are waitlist-only right now:
   `https://molted.email/signup?utm_source=claude-code-plugin`.
2. Create an API key: Dashboard (API Keys), or CLI
   `molted auth keys create --label claude-code --mailbox mbx_... --permissions read`.
3. Put the key in your shell profile as `export MOLTED_API_KEY=mm_live_...` (or `mm_test_...`).
   **Never paste it into a chat.**
4. Restart Claude Code (or start a new session).
5. Run `/molted:setup` to confirm the connection and see the permission-level tradeoffs.

## Safe defaults

- **Read-only by default.** A mailbox-scoped key with `--permissions read` makes sending
  impossible server-side. That's the recommended default for anything that's just reading a test
  inbox, classifying replies, or drafting.
- **Sending is an explicit opt-in.** Create a `read,send` key only once you actually want the
  agent to send mail.
- **Dry-run needs `send` permission**, even though it never sends - it runs the real policy engine
  (rate limits, suppressions, consent) and reports what would happen, which requires the `send`
  scope server-side.
- **Client-side belt-and-suspenders.** A plugin can't enforce tool restrictions itself (Claude
  Code only lets it suggest settings; enforcement lives in your own `settings.json`). If you want
  a `read,send` key but still want to block sending client-side, add:

  ```json
  {
    "permissions": {
      "deny": [
        "mcp__plugin_molted_molted__send_email",
        "mcp__plugin_molted_molted__reply",
        "mcp__plugin_molted_molted__batch_send",
        "mcp__plugin_molted_molted__schedule_followup"
      ]
    }
  }
  ```

  to your own (project or user) `settings.json`.

## What the tools do

The `molted` MCP server (`https://mcp.molted.email/mcp`) exposes about 74 tools: sending and
replying, reading and classifying inbound mail, thread context, journeys, segments, consent and
suppression management, budget checks, and more. Full list and REST equivalents in the
[`molted` skill](skills/molted/SKILL.md) and its `reference/` (generated from the live
[`molted.email/skill.md`](https://molted.email/skill.md)).

Tool names are namespaced as `mcp__plugin_molted_molted__<tool-name>` (e.g.
`mcp__plugin_molted_molted__send_email`) - useful for permission rules or hook matchers.

## Codex

Not supported yet. Codex's plugin format forbids environment-variable substitution in MCP headers
(`Authorization: Bearer ${MOLTED_API_KEY}` isn't expressible there), so this plugin is Claude Code
only until Codex adds MCP OAuth or an equivalent way to inject a secret. REST still works fine
from a Codex-driven agent, you'd just supply the Bearer token yourself.

## License

MIT, matching the rest of this repository.
