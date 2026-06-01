import { definePluginSettings } from "@api/Settings";
import { get as dsGet, set as dsSet } from "@api/DataStore";
import definePlugin, { OptionType } from "@utils/types";

const KEY = "mention-saver-v1";
const CAT_AVATAR = "https://i.imgur.com/NXCUlgq.jpeg";

const settings = definePluginSettings({
    maxMentions: {
        type: OptionType.NUMBER,
        description: "Maximum number of mentions to store",
        default: 100,
    },
    clearOnStart: {
        type: OptionType.BOOLEAN,
        description: "Clear all saved mentions when Discord starts",
        default: false,
    },
    showTimestamps: {
        type: OptionType.BOOLEAN,
        description: "Show timestamps in the mentions panel",
        default: true,
    },
});

export default definePlugin({
    name: "Mention Saver",
    description: "Stores your mentions and shows them in a handy panel. Made by Mika Jonkovič 🐱",
    authors: [{ name: "Mika Jonkovič", id: 1507353053861384354n }],
    settings,

    start() {
        this.logs = [];
        this.panel = null;
        this.button = null;
        this._injectInterval = null;

        // Load logs in background
        this._loadLogs();

        // Patch messages
        this._patchMessages();

        // Keep trying to inject button into Discord's title bar
        this._injectInterval = setInterval(() => {
            if (!document.getElementById("mention-saver-btn")) {
                this._injectButton();
            }
        }, 500);

        // Also try immediately
        this._injectButton();
    },

    stop() {
        if (this._injectInterval) {
            clearInterval(this._injectInterval);
            this._injectInterval = null;
        }
        this._unpatch?.();
        document.getElementById("mention-saver-btn")?.remove();
        this.removePanel();
    },

    async _loadLogs() {
        try {
            if (settings.store.clearOnStart) {
                this.logs = [];
                await dsSet(KEY, []);
            } else {
                this.logs = (await dsGet(KEY)) ?? [];
            }
        } catch (e) {
            console.error("[MentionSaver] DataStore error:", e);
            this.logs = [];
        }
    },

    _patchMessages() {
        try {
            const FluxDispatcher = BdApi.Webpack.getModule((m: any) => m?.dispatch && m?.subscribe);
            if (!FluxDispatcher || typeof FluxDispatcher.subscribe !== "function") return;

            this._unpatch = FluxDispatcher.subscribe("MESSAGE_CREATE", async (event: any) => {
                const msg = event?.message;
                if (!msg) return;

                const myId = BdApi.UserStore.getCurrentUser?.()?.id;
                if (!myId) return;

                const isMentioned =
                    msg.mentions?.some?.((u: any) => u?.id === myId) ||
                    msg.content?.includes?.(`<@${myId}>`);
                if (!isMentioned) return;

                if (!Array.isArray(this.logs)) this.logs = [];

                this.logs.push({
                    content: msg.content,
                    author: msg.author?.username,
                    channelId: msg.channel_id,
                    guildId: msg.guild_id,
                    time: Date.now(),
                });

                const max = settings.store.maxMentions ?? 100;
                if (this.logs.length > max) this.logs = this.logs.slice(-max);

                try { await dsSet(KEY, this.logs); } catch { /* ignore */ }

                // Update badge count if panel is closed
                this._updateBadge();
            });
        } catch (e) {
            console.error("[MentionSaver] Patch error:", e);
        }
    },

    _updateBadge() {
        const badge = document.getElementById("mention-saver-badge");
        const btn = document.getElementById("mention-saver-btn");
        if (!badge || !btn) return;
        const count = Array.isArray(this.logs) ? this.logs.length : 0;
        if (count > 0) {
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    },

    _injectButton() {
        // Try to find Discord's title bar toolbar (the icon area top-right)
        const toolbar =
            document.querySelector('[class*="toolbar-"]') ||
            document.querySelector('[class*="titleBar"] [class*="children"]');

        if (!toolbar) return;
        if (document.getElementById("mention-saver-btn")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "mention-saver-btn";
        wrapper.title = "Mention Saver";
        wrapper.style.cssText = `
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            cursor: pointer;
            color: var(--interactive-normal, #b5bac1);
            transition: color 0.15s ease, background 0.15s ease;
            flex-shrink: 0;
        `;

        wrapper.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <div id="mention-saver-badge" style="
                display: none;
                position: absolute;
                top: 2px;
                right: 2px;
                background: #ed4245;
                color: white;
                font-size: 9px;
                font-weight: 700;
                min-width: 14px;
                height: 14px;
                border-radius: 7px;
                align-items: center;
                justify-content: center;
                padding: 0 3px;
                pointer-events: none;
                line-height: 1;
            "></div>
        `;

        wrapper.onmouseenter = () => {
            wrapper.style.color = "var(--interactive-hover, #dbdee1)";
            wrapper.style.background = "var(--background-modifier-hover, rgba(79,84,92,0.16))";
        };
        wrapper.onmouseleave = () => {
            wrapper.style.color = "var(--interactive-normal, #b5bac1)";
            wrapper.style.background = "transparent";
        };
        wrapper.onclick = (e) => {
            e.stopPropagation();
            this.togglePanel();
        };

        // Insert as first child (leftmost of the toolbar icons)
        toolbar.insertBefore(wrapper, toolbar.firstChild);
        this.button = wrapper;

        // Update badge with current count
        this._updateBadge();

        // Stop the interval once injected successfully
        if (this._injectInterval) {
            clearInterval(this._injectInterval);
            this._injectInterval = null;
        }
    },

    togglePanel() {
        if (this.panel) {
            this.removePanel();
            return;
        }

        const btn = document.getElementById("mention-saver-btn");
        const btnRect = btn?.getBoundingClientRect();

        this.panel = document.createElement("div");
        this.panel.id = "mention-saver-panel";
        this.panel.style.cssText = `
            position: fixed;
            top: ${btnRect ? btnRect.bottom + 8 : 48}px;
            right: ${btnRect ? window.innerWidth - btnRect.right : 20}px;
            width: 340px;
            max-height: 480px;
            background: #2b2d31;
            color: #dcddde;
            border-radius: 12px;
            z-index: 9999;
            font-size: 13px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.07);
            animation: mention-panel-in 0.15s ease;
        `;

        // Inject keyframe animation
        if (!document.getElementById("mention-saver-style")) {
            const style = document.createElement("style");
            style.id = "mention-saver-style";
            style.textContent = `
                @keyframes mention-panel-in {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        const logs = Array.isArray(this.logs) ? this.logs : [];

        const header = document.createElement("div");
        header.style.cssText = `
            padding: 12px 14px 10px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #8e9297;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <span>🔔 Saved Mentions <span style="opacity:0.5;font-size:10px;letter-spacing:0;">(${logs.length})</span></span>
            <span id="mention-clear-btn" title="Clear all" style="cursor:pointer;font-size:10px;color:#ed4245;letter-spacing:0;text-transform:none;font-weight:500;padding:2px 6px;border-radius:4px;transition:background 0.1s;">✕ Clear</span>
        `;

        const list = document.createElement("div");
        list.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px 10px;
            scrollbar-width: thin;
            scrollbar-color: #40444b transparent;
        `;

        if (logs.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:40px 0;opacity:0.35;">
                    <div style="font-size:28px;margin-bottom:8px;">🔕</div>
                    <div style="font-size:12px;">No mentions yet</div>
                </div>`;
        } else {
            list.innerHTML = logs
                .slice()
                .reverse()
                .map(m => `
                    <div style="margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;padding:9px 11px;border-left:3px solid #5865F2;">
                        <div style="font-weight:600;font-size:12px;color:#fff;margin-bottom:3px;">@${m.author ?? "unknown"}</div>
                        <div style="font-size:12px;line-height:1.4;color:#dcddde;word-break:break-word;">${m.content ?? ""}</div>
                        ${settings.store.showTimestamps
                            ? `<div style="opacity:0.35;font-size:10px;margin-top:5px;">${new Date(m.time).toLocaleString()}</div>`
                            : ""}
                    </div>
                `).join("");
        }

        const footer = document.createElement("div");
        footer.style.cssText = `
            padding: 7px 12px;
            display: flex;
            align-items: center;
            gap: 7px;
            border-top: 1px solid rgba(255,255,255,0.05);
            background: rgba(0,0,0,0.12);
            flex-shrink: 0;
        `;
        footer.innerHTML = `
            <img src="${CAT_AVATAR}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;opacity:0.6;" onerror="this.style.display='none'"/>
            <span style="font-size:10px;opacity:0.3;font-style:italic;letter-spacing:0.2px;">made by Mika Jonkovič</span>
        `;

        this.panel.appendChild(header);
        this.panel.appendChild(list);
        this.panel.appendChild(footer);
        document.body.appendChild(this.panel);

        // Clear button
        header.querySelector("#mention-clear-btn")?.addEventListener("click", async () => {
            this.logs = [];
            try { await dsSet(KEY, []); } catch { /* ignore */ }
            this.removePanel();
            this._updateBadge();
        });

        // Close on outside click
        this._outsideClick = (e: MouseEvent) => {
            if (!this.panel?.contains(e.target as Node) &&
                !(e.target as Element)?.closest?.("#mention-saver-btn")) {
                this.removePanel();
            }
        };
        setTimeout(() => document.addEventListener("click", this._outsideClick), 100);
    },

    removePanel() {
        this.panel?.remove();
        this.panel = null;
        if (this._outsideClick) {
            document.removeEventListener("click", this._outsideClick);
            this._outsideClick = null;
        }
    },
});
