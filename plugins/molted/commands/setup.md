---
description: Check Molted setup (API key, safe defaults) and show what's left to do
---

Walk the user through getting Molted working in this session. Do these steps in order.

The plugin stores the API key as a sensitive plugin option (`api_key`), in the system keychain. Claude Code puts it in the MCP server's `Authorization` header itself. You never see the key and don't need to: never ask for it, and never try to read it from the environment or any file.

## 1. Check whether the `molted` server connects

Run:

```bash
claude mcp list
```

Find the `plugin:molted:molted` entry. If it shows Connected, skip to step 4. If it's missing, failed, or unauthorized, the key is probably not set yet: go on.

## 2. No account yet

If the user doesn't have a Molted account, signup is self-serve. Send them to:

```
https://molted.email/signup?utm_source=claude-code-plugin
```

Tell them to come back and re-run `/molted:setup` once they have a key.

## 3. Have an account, key not set

Tell the user, plainly:

- Create an API key in the portal under Settings > Access (`https://molted.email/app/settings#access`), or with the CLI: `molted auth keys create --label claude-code --mailbox mbx_... --permissions read`
- **Recommend a read-only, mailbox-scoped key as the default** (`--permissions read`). That makes sending impossible server-side, which is the safest thing to hand an agent that's just reading a test inbox or drafting.
- If they want the agent to be able to send, that's an explicit opt-in: create a key with `--permissions read,send` instead. Say this clearly as a choice, not a default.
- Save the key by running `/plugin configure molted@email-skills` and pasting it into the masked **Molted API key** field. Claude Code stores it in the system keychain, not in `settings.json`, and Claude never sees it.
- From a shell instead: `claude plugin configure molted@email-skills --values-stdin` reads a JSON object (`{"api_key": "..."}`) on stdin. The user runs this themselves, in their own terminal. Don't run it for them.
- Older versions of this plugin read a `MOLTED_API_KEY` environment variable. That variable is no longer used; once the key is saved in the plugin, the user can remove the export from their shell profile.
- **Never paste the key into this chat.** If they start to paste one, stop them and point at `/plugin configure` instead. A key that lands in a chat transcript should be treated as compromised and rotated.
- After saving the key, run `/reload-plugins` (or start a new session) so the server reconnects with it.

## 4. Connected - explain the tool surface

Once `plugin:molted:molted` shows Connected, explain what the user now has:

- With a **read-only** key: inbox reading and thread/context tools work. Any send/reply/write tool fails server-side (not a bug: that's the permission working as intended). `dry_run` fails too, because simulating a send needs `send` permission.
- With a **read,send** key: sending and `dry_run` both work. To get dry-run without any chance of a real send, keep the read,send key and deny the send tools client-side (see below).

The server starts with the `core` toolset. More toolsets (`journeys`, `mailboxes`, `policy`, or `all`) are listed at https://molted.email/docs/mcp-server#toolsets.

## 5. Optional: deny specific tools client-side

A plugin cannot enforce tool restrictions itself (Claude Code only lets a plugin *suggest* settings; enforcement lives in the user's own `settings.json`). If the user wants a belt-and-suspenders block on sending even with a read,send key, show them this snippet to add to their own (project or user) `settings.json`:

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

Note the tool name format: `mcp__plugin_<plugin-name>_<server-name>__<tool-name>`. For this plugin (`molted`) and its MCP server (also named `molted`), that's `mcp__plugin_molted_molted__<tool-name>`.

## 6. Done

Summarize: whether the server is connected, which permission level the key has (ask the user if unsure - there's no way to introspect it from here), and that they're ready to use the `molted` skill to wire email into their agent.
