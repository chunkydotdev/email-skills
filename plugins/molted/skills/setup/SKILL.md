---
name: setup
description: Check the Molted plugin's connection (sign-in, mailbox access, safe defaults) and show what's left to do. Use when the user asks to set up, connect, sign in to, or check Molted, or when a Molted tool fails with an authorization error.
license: MIT
---

# Molted setup

Walk the user through getting Molted working in this session. Do these steps in order.

The plugin connects to Molted's hosted MCP server (`https://mcp.molted.email/mcp`) with OAuth. The user signs in to Molted in their browser and approves the connection there, and their client (Claude Code or Codex) stores the token itself. You never see a key or a token and don't need one: never ask for one, and never try to read one from the environment or any file.

## 1. Check whether the `molted` server is connected

**Claude Code:** run

```bash
claude mcp list
```

and find the Molted plugin's entry (`plugin:molted:molted`). Connected: skip to step 4. Needs authentication, or failed: go on.

**Codex:** check the Molted plugin in the plugin browser (`/plugins` in Codex CLI, or the **Plugins** tab in the ChatGPT desktop app). If it isn't connected, go on.

If you can't tell, call a read-only Molted tool such as `setup_status`. An authorization error means the user hasn't signed in yet.

## 2. No account yet

Signup is self-serve. Send the user to:

```
https://molted.email/signup?utm_source=claude-code-plugin
```

Tell them to come back once they're signed up.

## 3. Sign in and approve

Tell the user, plainly:

- **Claude Code:** run `/mcp`, pick the Molted plugin's server, and choose **Authenticate**. From a shell instead, `claude mcp login` with the server name `claude mcp list` shows. A browser opens on molted.email.
- **Codex:** sign in when the plugin asks during install, or reconnect it from the plugin browser.
- On the Molted approval page, check that the app asking is the one they're using and pick the workspace. Then choose **Specific mailboxes** and give each one **read** only. That's the safe default: sending is impossible server-side, which is right for an agent that's reading a test inbox, classifying replies, or drafting.
- If they want the agent to send, that's an explicit opt-in: tick **send** for that mailbox too. Say this clearly as a choice, not a default. **All mailboxes** is admin-grade access; steer them away from it unless they mean it.
- Approving needs a recent password sign-in, so the page may ask them to sign in again. That's expected.
- Approving creates an API key labelled `<app name> (connected app)` in their workspace (Settings > Access). Revoking that key disconnects the plugin. To change mailboxes or permissions later, revoke it and sign in again.
- They should never paste a Molted API key into the chat. If they start to, stop them: a key that lands in a transcript should be treated as compromised and rotated.

Non-interactive runs (`claude -p`, the Agent SDK, CI) can't open a browser. Sign in once from an interactive session first. For a fully headless setup, connect the server outside the plugin with an API key in the user's own config: https://molted.email/docs/mcp-server has the steps.

Upgrading from plugin 0.2.x (Claude Code): the plugin no longer uses the API key saved with `/plugin configure`. Sign in as above. The old key keeps working anywhere else it's used; if nothing else uses it, the user can revoke it in Settings > Access.

## 4. Connected: explain the tool surface

Once the server is connected, explain what the user now has:

- With **read** on a mailbox: inbox reading, search, and thread/context tools work. Send, reply, and other write tools fail server-side (not a bug: that's the permission working as intended). `dry_run` fails too, because simulating a send needs `send` permission.
- With **read** and **send**: sending and `dry_run` both work. To get dry-run without any chance of a real send, keep send permission and block the send tools client-side (step 5).

The server starts with the `core` toolset. More toolsets (`journeys`, `mailboxes`, `policy`, or `all`) are listed at https://molted.email/docs/mcp-server#toolsets.

## 5. Optional: block specific tools client-side

A plugin can't enforce tool restrictions itself; enforcement lives in the user's own config.

**Claude Code:** add this to their own (project or user) `settings.json`:

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

Tool names there are `mcp__plugin_<plugin-name>_<server-name>__<tool-name>`; for this plugin and its `molted` server, `mcp__plugin_molted_molted__<tool-name>`.

**Codex:** in `~/.codex/config.toml`, make Codex ask before every Molted tool call:

```toml
[plugins."molted".mcp_servers.molted]
default_tools_approval_mode = "prompt"
```

## 6. Done

Summarize: whether the server is connected, which mailboxes and permissions the user approved (ask if unsure; you can't introspect it from here), and that they're ready to use the `molted` skill to wire email into their agent.
