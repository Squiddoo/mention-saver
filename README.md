# 🔔 Mention Saver — Vencord Plugin

> A Vencord plugin that saves all your Discord mentions and lets you view them anytime from a panel in the title bar.

**Made by Mika Jonkovič**

---

## What does it do?

Discord normally only shows you mentions in the inbox, and they disappear once you've seen them. **Mention Saver** automatically catches every message that mentions you and stores it locally — so you can always look back at who mentioned you and what they said, even if you've already dismissed the notification.

### Features

- 🔔 **Bell icon in the title bar** — always one click away, right next to Discord's built-in icons
- 🗂️ **Persistent storage** — mentions are saved even after closing Discord
- 🔴 **Badge counter** — shows how many mentions you've stored at a glance
- ✕ **Clear button** — wipe all stored mentions with one click
- ⚙️ **Settings panel** — customize max stored mentions, timestamps, and auto-clear on start
- 🐱 *Made with love by Mika Jonkovič*

---

## How to install

This plugin requires Vencord to be **built from source**.

### Prerequisites
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/) — install with `npm install -g pnpm`

### Steps

1. **Clone Vencord**
   ```bash
   git clone https://github.com/Vendicated/Vencord
   cd Vencord
   pnpm install --frozen-lockfile
   ```

2. **Add this plugin**
   ```bash
   # Inside the Vencord folder:
   mkdir -p src/userplugins/mentionSaver
   ```
   Then copy `index.ts` into `src/userplugins/mentionSaver/`.

   Or clone directly:
   ```bash
   cd src/userplugins
   git clone https://github.com/MikaJonkovic/mention-saver mentionSaver
   ```

3. **Build and inject**
   ```bash
   pnpm build
   pnpm inject
   ```
   Close Discord before running `pnpm inject`.

4. **Enable the plugin**
   Open Discord → Settings → Vencord → Plugins → search **"Mention Saver"** → toggle on ✅

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Max Mentions | 100 | Maximum number of mentions to keep stored |
| Clear on Start | Off | Automatically clear all mentions when Discord launches |
| Show Timestamps | On | Show date/time on each mention in the panel |

---

## After updating the plugin

```bash
pnpm build
```
Then press `Ctrl+R` in Discord — no need to run inject again.

---

## License

MIT — feel free to use, modify and share.
