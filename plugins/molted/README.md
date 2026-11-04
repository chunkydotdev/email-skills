# Molted (Claude Code plugin)

Wire [Molted](https://molted.email) (agent-native email infrastructure) into an agent you're
building: send, reply, read-inbox, and classify-inbound as MCP tools, a REST reference for
anything that isn't MCP-capable, and safe-default setup guidance.

## Install

```
/plugin marketplace add chunkydotdev/email-skills
/plugin install molted@email-skills
```

Installing from `/plugin` asks for your Molted API key in a masked field. Then run
`/molted:setup` for a guided walkthrough (checking the connection, choosing a permission level).

## Setup

1. Get a Molted account. Signup is self-serve:
   `https://molted.email/signup?utm_source=claude-code-plugin`.
2. Create an API key: portal (Settings > Access), or CLI
   `molted auth keys create --label claude-code --mailbox mbx_... --permissions read`.
3. Save it in the plugin: the install dialog asks for it, or run
   `/plugin configure molted@email-skills` at any time. The key is a sensitive option, so Claude
   Code stores it in your system keychain (not `settings.json`) and sends it only as the
   `Authorization: Bearer` header to `https://mcp.molted.email/mcp`. **Never paste it into a chat.**
4. Run `/reload-plugins` (or start a new session).
5. Run `/molted:setup` to confirm the connection and see the permission-level tradeoffs.

Upgrading from 0.1.x: the plugin no longer reads a `MOLTED_API_KEY` environment variable. Save the
key with `/plugin configure molted@email-skills`, then you can drop the export.

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
        "mcp__plugin_molted_molted__send_to_list",
        "mcp__plugin_molted_molted__schedule_followup"
      ]
    }
  }
  ```

  to your own (project or user) `settings.json`.

## What the tools do

The `molted` MCP server (`https://mcp.molted.email/mcp`) starts with its `core` toolset: sending
and replying, reading, searching and classifying inbound mail, thread context, contacts, lists,
consent and suppression management, budget checks, and more. Journeys, segments and the rest are
opt-in [toolsets](https://molted.email/docs/mcp-server#toolsets). Full list and REST equivalents in the
[`molted` skill](skills/molted/SKILL.md) and its `reference/` (generated from the live
[`molted.email/skill.md`](https://molted.email/skill.md)).

Tool names are namespaced as `mcp__plugin_molted_molted__<tool-name>` (e.g.
`mcp__plugin_molted_molted__send_email`) - useful for permission rules or hook matchers.

## Codex

Not supported yet. Codex's plugin format forbids secrets and variable substitution in MCP headers
(auth is the client's job, through OAuth), so this plugin is Claude Code only until Molted's MCP
server offers OAuth sign-in. Codex can still connect to the server from your own Codex config; see
[the MCP server docs](https://molted.email/docs/mcp-server).

## License

MIT, matching the rest of this repository.
