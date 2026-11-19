# Molted (Claude Code and Codex plugin)

Wire [Molted](https://molted.email) (agent-native email infrastructure) into an agent you're
building: send, reply, read-inbox, and classify-inbound as MCP tools, a REST reference for
anything that isn't MCP-capable, and safe-default setup guidance.

## Install

**Claude Code:**

```
/plugin marketplace add chunkydotdev/email-skills
/plugin install molted@email-skills
```

Then run `/mcp`, pick the Molted plugin's server, and choose **Authenticate** to sign in. Run
`/molted:setup` any time for a guided check.

**Codex** (Codex CLI or the ChatGPT desktop app):

```bash
codex plugin marketplace add chunkydotdev/email-skills
```

Then install **Molted** from the plugin browser (`/plugins` in Codex CLI, or the **Plugins** tab in
the ChatGPT desktop app) and sign in when it asks.

## Setup

1. Get a Molted account. Signup is self-serve:
   `https://molted.email/signup?utm_source=claude-code-plugin`.
2. Sign in from your client (see Install). A browser opens on molted.email.
3. On the approval page, pick the workspace, choose **Specific mailboxes**, and give each one
   **read** only, unless you want the agent to send. Approving creates an API key labelled
   `<app name> (connected app)` in Settings > Access; revoke it to disconnect the plugin.

The plugin never sees a key: your client stores the OAuth token itself. **Never paste a Molted API
key into a chat.**

Non-interactive runs (`claude -p`, the Agent SDK, CI) can't open a browser. Sign in once from an
interactive session first, or connect the server outside the plugin with an API key in your own
config ([MCP server docs](https://molted.email/docs/mcp-server)).

### Upgrading from 0.2.x

0.3.0 drops the API key option. Claude Code connects with OAuth now, so after the update run
`/mcp` and **Authenticate** once. The key you saved with `/plugin configure` is no longer used; if
nothing else uses it, revoke it in Settings > Access.

## Safe defaults

- **Read-only by default.** Give the plugin **read** on specific mailboxes. That makes sending
  impossible server-side, which is the recommended default for anything that's just reading a test
  inbox, classifying replies, or drafting.
- **Sending is an explicit opt-in.** Tick **send** for a mailbox only once you actually want the
  agent to send mail.
- **Dry-run needs `send` permission**, even though it never sends - it runs the real policy engine
  (rate limits, suppressions, consent) and reports what would happen, which requires the `send`
  scope server-side.
- **Client-side belt-and-suspenders.** A plugin can't enforce tool restrictions itself; that lives
  in your own config. To keep send permission but still block sending in Claude Code, add this to
  your own (project or user) `settings.json`:

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

  In Codex, set `default_tools_approval_mode = "prompt"` under
  `[plugins."molted".mcp_servers.molted]` in `~/.codex/config.toml` to approve each call.

## What the tools do

The `molted` MCP server (`https://mcp.molted.email/mcp`) starts with its `core` toolset: sending
and replying, reading, searching and classifying inbound mail, thread context, contacts, lists,
consent and suppression management, budget checks, and more. Journeys, segments and the rest are
opt-in [toolsets](https://molted.email/docs/mcp-server#toolsets). Full list and REST equivalents in the
[`molted` skill](skills/molted/SKILL.md) and its `reference/` (generated from the live
[`molted.email/skill.md`](https://molted.email/skill.md)).

In Claude Code, tool names are namespaced as `mcp__plugin_molted_molted__<tool-name>` (e.g.
`mcp__plugin_molted_molted__send_email`) - useful for permission rules or hook matchers.

## Layout

One directory serves both clients:

| File | Read by |
| --- | --- |
| `.claude-plugin/plugin.json`, `.mcp.json` | Claude Code |
| `plugin.json`, `mcp.json` ([Agent Plugins](https://agent-plugins.org/specification) format, OpenAI settings under `extensions.com.openai`) | Codex |
| `skills/molted`, `skills/setup` | both |

The marketplaces live at the repo root: `.claude-plugin/marketplace.json` (Claude Code) and
`.agents/plugins/marketplace.json` (Codex). **Bump `version` in both `plugin.json` files together.**

## License

MIT, matching the rest of this repository.
