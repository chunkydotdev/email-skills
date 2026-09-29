---
description: Check Molted setup (API key, safe defaults) and show what's left to do
---

Walk the user through getting Molted working in this session. Do these steps in order.

## 1. Check whether `MOLTED_API_KEY` is set (without printing it)

Run:

```bash
test -n "$MOLTED_API_KEY" && echo set || echo missing
```

Never echo, cat, or otherwise print the value of `MOLTED_API_KEY` at any point. If it's already set, skip to step 4.

## 2. No account yet

If the user doesn't have a Molted account, Molted is waitlist-only right now. Send them to:

```
https://molted.email/signup?utm_source=claude-code-plugin
```

Tell them to come back and re-run `/setup` once they have a key.

## 3. Have an account, key not set

Tell the user, plainly:

- Get an API key from the Molted dashboard (API Keys) or the CLI: `molted auth keys create --label claude-code --mailbox mbx_... --permissions read`
- **Recommend a read-only, mailbox-scoped key as the default** (`--permissions read`). That makes sending impossible server-side, which is the safest thing to hand an agent that's just reading a test inbox or drafting.
- If they want the agent to be able to send, that's an explicit opt-in: create a key with `--permissions read,send` instead. Say this clearly as a choice, not a default.
- Put the key in their shell profile (`~/.zshrc`, `~/.bashrc`, or wherever they set env vars) as `export MOLTED_API_KEY=mm_live_...` (or `mm_test_...` for a test key), then open a new shell or `source` the profile.
- **Never paste the key into this chat.** If they start to paste one, stop them and point at the shell-profile approach instead - a key that lands in a chat transcript should be treated as compromised and rotated.
- Restart Claude Code (or start a new session) after setting the variable, since the MCP server's env is read at session start.

## 4. Key is set - confirm and explain the tool surface

Once `MOLTED_API_KEY` is set, the `molted` MCP server should connect automatically. Confirm with:

```bash
claude mcp list
```

Look for a `molted` entry showing Connected.

Explain what the user now has:

- With a **read-only** key: inbox reading, thread/context tools, classification, and `dry_run` simulation all work. Any send/reply/write tool will fail server-side (not a bug - that's the permission working as intended).
- With a **read,send** key: sending is possible. If the user wants dry-run/simulation without any chance of a real send, they can still use a read,send key but deny the specific send-capable tools client-side (see below), or just use a read-only key and rely on `dry_run`.

## 5. Optional: deny specific tools client-side

A plugin cannot enforce tool restrictions itself (Claude Code only lets a plugin *suggest* settings; enforcement lives in the user's own `settings.json`). If the user wants a belt-and-suspenders block on sending even with a read,send key, show them this snippet to add to their own (project or user) `settings.json`:

```json
{
  "permissions": {
    "deny": [
      "mcp__plugin_molted_molted__send_email",
      "mcp__plugin_molted_molted__reply",
      "mcp__plugin_molted_molted__batch_send"
    ]
  }
}
```

Note the tool name format: `mcp__plugin_<plugin-name>_<server-name>__<tool-name>`. For this plugin (`molted`) and its MCP server (also named `molted`), that's `mcp__plugin_molted_molted__<tool-name>`.

## 6. Done

Summarize: whether the key is set, which permission level it has (ask the user if unsure - there's no way to introspect it from here), and that they're ready to use the `molted` skill to wire email into their agent.
