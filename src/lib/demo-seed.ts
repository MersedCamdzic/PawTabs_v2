import { storage } from "./storage";
import type {
  PawedEntry,
  TaggedUrlEntry,
  SavedSession,
  Backup,
  SavedPage,
  Note,
  WindowMeta,
} from "@/types";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

interface DemoUrl {
  url: string;
  title: string;
  favIconUrl: string;
}

function fav(host: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
}

const DEMO_URLS: Record<string, DemoUrl> = {
  amazon: {
    url: "https://www.amazon.com/dp/B0BDHWDR12",
    title: "Kindle Paperwhite (2024) — Amazon",
    favIconUrl: fav("amazon.com"),
  },
  amazonCart: {
    url: "https://www.amazon.com/gp/cart/view.html",
    title: "Your Shopping Cart — Amazon",
    favIconUrl: fav("amazon.com"),
  },
  google: {
    url: "https://www.google.com/search?q=react+server+components+2026",
    title: "react server components 2026 — Google Search",
    favIconUrl: fav("google.com"),
  },
  gmail: {
    url: "https://mail.google.com/mail/u/0/#inbox",
    title: "Inbox (12) — mersed@gmail.com",
    favIconUrl: fav("gmail.com"),
  },
  calendar: {
    url: "https://calendar.google.com/calendar/u/0/r/week",
    title: "This week — Google Calendar",
    favIconUrl: fav("calendar.google.com"),
  },
  cnn: {
    url: "https://www.cnn.com/2026/07/03/tech/ai-agents-market/index.html",
    title: "AI agents market crosses $50B — CNN",
    favIconUrl: fav("cnn.com"),
  },
  bbc: {
    url: "https://www.bbc.com/news/technology-68931201",
    title: "Chrome's new tab groups explained — BBC",
    favIconUrl: fav("bbc.com"),
  },
  nyt: {
    url: "https://www.nytimes.com/2026/06/28/technology/browsers-productivity.html",
    title: "The browser as a productivity tool — NYT",
    favIconUrl: fav("nytimes.com"),
  },
  github: {
    url: "https://github.com/mersedca/pawtabs/pull/42",
    title: "Add bulk group actions #42 — mersedca/pawtabs",
    favIconUrl: fav("github.com"),
  },
  githubIssues: {
    url: "https://github.com/mersedca/pawtabs/issues",
    title: "Issues · mersedca/pawtabs",
    favIconUrl: fav("github.com"),
  },
  linear: {
    url: "https://linear.app/pawtabs/issue/PAW-128",
    title: "PAW-128: Snapshot compression",
    favIconUrl: fav("linear.app"),
  },
  notion: {
    url: "https://www.notion.so/pawtabs/Q3-Roadmap-a7f2b8",
    title: "Q3 Roadmap — Notion",
    favIconUrl: fav("notion.so"),
  },
  figma: {
    url: "https://www.figma.com/design/AbC123/PawTabs-2-2",
    title: "PawTabs 2.2 – Design specs — Figma",
    favIconUrl: fav("figma.com"),
  },
  vercel: {
    url: "https://vercel.com/mersedca/pawtabs-web/deployments",
    title: "Deployments — pawtabs-web — Vercel",
    favIconUrl: fav("vercel.com"),
  },
  youtube: {
    url: "https://www.youtube.com/watch?v=demo-tab-management",
    title: "Manage 200+ tabs without losing focus — YouTube",
    favIconUrl: fav("youtube.com"),
  },
  youtubeMusic: {
    url: "https://music.youtube.com/playlist?list=RDCLAK5uy",
    title: "Focus playlist — YouTube Music",
    favIconUrl: fav("music.youtube.com"),
  },
  stackoverflow: {
    url: "https://stackoverflow.com/questions/77123456/preact-lazy-loading",
    title: "Lazy loading with Preact 10 signals — Stack Overflow",
    favIconUrl: fav("stackoverflow.com"),
  },
  mdn: {
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Storage",
    title: "Web Storage API — MDN",
    favIconUrl: fav("developer.mozilla.org"),
  },
  reddit: {
    url: "https://www.reddit.com/r/productivity/comments/xyz/tab_management",
    title: "How do you handle 100+ tabs? — r/productivity",
    favIconUrl: fav("reddit.com"),
  },
  hackerNews: {
    url: "https://news.ycombinator.com/item?id=41234567",
    title: "Show HN: PawTabs — tab manager — Hacker News",
    favIconUrl: fav("news.ycombinator.com"),
  },
  wikipedia: {
    url: "https://en.wikipedia.org/wiki/Tab_(interface)",
    title: "Tab (interface) — Wikipedia",
    favIconUrl: fav("en.wikipedia.org"),
  },
  slack: {
    url: "https://pawtabs.slack.com/archives/C01ABC",
    title: "#general — PawTabs Slack",
    favIconUrl: fav("slack.com"),
  },
  arxiv: {
    url: "https://arxiv.org/abs/2401.12345",
    title: "Attention as Memory: Long-context transformers — arXiv",
    favIconUrl: fav("arxiv.org"),
  },
  medium: {
    url: "https://medium.com/tech/the-hidden-cost-of-open-tabs-a1b2c3",
    title: "The hidden cost of 200 open tabs — Medium",
    favIconUrl: fav("medium.com"),
  },
  netflix: {
    url: "https://www.netflix.com/browse",
    title: "Netflix — Home",
    favIconUrl: fav("netflix.com"),
  },
  spotify: {
    url: "https://open.spotify.com/playlist/37i9dQZF1DX",
    title: "Deep Focus — Spotify",
    favIconUrl: fav("spotify.com"),
  },
};

const url = (k: keyof typeof DEMO_URLS): DemoUrl => DEMO_URLS[k];

export async function seedDemoData(): Promise<void> {
  // ---------- pawedUrls (persistent favorites, mix of "open + closed") ----------
  const pawed: Record<string, PawedEntry> = {};
  const pawedKeys: Array<keyof typeof DEMO_URLS> = [
    "github",
    "linear",
    "notion",
    "figma",
    "vercel",
    "calendar",
    "amazonCart",
    "arxiv",
  ];
  pawedKeys.forEach((k, i) => {
    const u = url(k);
    pawed[u.url] = {
      url: u.url,
      title: u.title,
      favIconUrl: u.favIconUrl,
      pawedAt: now - (i + 1) * 6 * HOUR,
      note: i === 0 ? "Review before EOD Thursday" : undefined,
    };
  });

  // ---------- taggedUrls (custom lists) ----------
  const tagged: Record<string, TaggedUrlEntry> = {};
  const addTag = (
    key: keyof typeof DEMO_URLS,
    tags: string[],
    ageDays: number,
  ) => {
    const u = url(key);
    const existing = tagged[u.url];
    tagged[u.url] = {
      url: u.url,
      title: u.title,
      favIconUrl: u.favIconUrl,
      tags: Array.from(new Set([...(existing?.tags ?? []), ...tags])),
      updatedAt: now - ageDays * DAY,
    };
  };

  addTag("cnn", ["Reading"], 1);
  addTag("bbc", ["Reading"], 2);
  addTag("nyt", ["Reading"], 3);
  addTag("medium", ["Reading"], 4);
  addTag("hackerNews", ["Reading", "Research"], 1);

  addTag("amazon", ["Shopping"], 0);
  addTag("amazonCart", ["Shopping"], 0);

  addTag("github", ["Work"], 0);
  addTag("githubIssues", ["Work"], 1);
  addTag("linear", ["Work"], 0);
  addTag("notion", ["Work"], 2);
  addTag("figma", ["Work"], 3);
  addTag("vercel", ["Work"], 1);
  addTag("slack", ["Work"], 0);

  addTag("arxiv", ["Research"], 5);
  addTag("wikipedia", ["Research"], 6);
  addTag("stackoverflow", ["Research", "Learning"], 3);
  addTag("mdn", ["Learning"], 4);
  addTag("google", ["Research"], 0);
  addTag("reddit", ["Research"], 2);

  addTag("youtube", ["Watch later"], 1);
  addTag("youtubeMusic", ["Watch later"], 2);
  addTag("netflix", ["Watch later"], 5);

  // ---------- savedSessions (snapshots) ----------
  const mkSessionTab = (key: keyof typeof DEMO_URLS, i: number) => {
    const u = url(key);
    return {
      id: i,
      windowId: 1000,
      title: u.title,
      url: u.url,
      favIconUrl: u.favIconUrl,
      pinned: false,
    };
  };

  const iso = (ms: number) => new Date(ms).toISOString();

  const workStart: SavedSession = {
    id: `sess_${now}_a`,
    sessionName: "Monday work start",
    description: "Standup + morning inbox + 3 open PRs",
    dateTime: iso(now - 2 * DAY),
    tabs: [
      mkSessionTab("gmail", 1),
      mkSessionTab("calendar", 2),
      mkSessionTab("linear", 3),
      mkSessionTab("github", 4),
      mkSessionTab("notion", 5),
      mkSessionTab("slack", 6),
    ],
    windows: [{ id: 1000, title: "Posao" }],
  };

  const research: SavedSession = {
    id: `sess_${now}_b`,
    sessionName: "Research: AI agents",
    description: "Papers + benchmarks for Q3 roadmap prep",
    dateTime: iso(now - 5 * DAY),
    tabs: [
      mkSessionTab("arxiv", 10),
      mkSessionTab("hackerNews", 11),
      mkSessionTab("medium", 12),
      mkSessionTab("wikipedia", 13),
      mkSessionTab("google", 14),
    ],
    windows: [{ id: 1000, title: "Research" }],
  };

  const shopping: SavedSession = {
    id: `sess_${now}_c`,
    sessionName: "Weekend shopping list",
    description: "Amazon prime day picks",
    dateTime: iso(now - 3 * DAY),
    tabs: [mkSessionTab("amazon", 20), mkSessionTab("amazonCart", 21)],
    windows: [{ id: 1000, title: "Vikend" }],
  };

  const autoBackup: SavedSession = {
    id: `sess_${now}_d`,
    sessionName: "Auto: pre-cleanup 2026-06-28",
    description: "Automatic backup before Cleanup Wizard run",
    dateTime: iso(now - 7 * DAY),
    auto: true,
    tabs: Array.from({ length: 32 }, (_, i) => mkSessionTab("google", 100 + i)),
    windows: [{ id: 1000 }],
  };

  const sessions: SavedSession[] = [workStart, research, shopping, autoBackup];

  // ---------- backups (wizard-created safety nets) ----------
  const backups: Backup[] = [
    {
      id: `backup_${now}_a`,
      name: "Before closing 8 inactive tabs",
      createdAt: iso(now - 3 * HOUR),
      windowCount: 3,
      tabCount: 12,
      data: {
        savedSessions: [workStart],
      },
    },
    {
      id: `backup_${now}_b`,
      name: "Before closing 24 duplicates",
      createdAt: iso(now - 2 * DAY),
      windowCount: 4,
      tabCount: 24,
      data: {
        savedSessions: [autoBackup],
      },
    },
  ];

  // ---------- windows metadata (named + colored) ----------
  // Uses real Chrome window IDs won't match — but seeding these lets the
  // demo show OFF the color feature in Windows view AFTER user renames
  // their real windows to match. We seed common ID ranges as a fallback.
  const windows: Record<number, WindowMeta> = {
    1: { title: "Posao", color: "blue" },
    2: { title: "Research", color: "green" },
    3: { title: "Vikend", color: "amber" },
    4: { title: "Learning", color: "purple" },
  };

  // ---------- savedPages (notes attached to open tabs — cleared when tab id changes) ----------
  // We seed a couple of notes that will apply IF the user has tabs open at these ids.
  // Otherwise harmless — cleaned up automatically by the tab-removed listener.
  const savedPages: Record<number, SavedPage> = {};
  const seedNote = (tabId: number, text: string): Note => ({
    id: `note_${tabId}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    createdAt: now - 4 * HOUR,
  });
  savedPages[999001] = {
    notes: [seedNote(999001, "Design review needed before merge — ping Anja")],
  };
  savedPages[999002] = {
    notes: [seedNote(999002, "Wait for legal signoff (RFC-2026-14)")],
  };

  // ---------- write everything ----------
  await Promise.all([
    storage.set("pawedUrls", pawed),
    storage.set("taggedUrls", tagged),
    storage.set("savedSessions", sessions),
    storage.set("backups", backups),
    storage.set("windows", windows),
    storage.set("savedPages", savedPages),
  ]);
}

export async function clearDemoData(): Promise<void> {
  await Promise.all([
    storage.set("pawedUrls", {}),
    storage.set("taggedUrls", {}),
    storage.set("savedSessions", []),
    storage.set("backups", []),
    storage.set("windows", {}),
    storage.set("savedPages", {}),
  ]);
}

export const SUGGESTED_TABS_TO_OPEN: {
  windowName: string;
  color: string;
  urls: string[];
}[] = [
  {
    windowName: "Posao",
    color: "blue",
    urls: [
      DEMO_URLS.gmail!.url,
      DEMO_URLS.calendar!.url,
      DEMO_URLS.github!.url,
      DEMO_URLS.linear!.url,
      DEMO_URLS.notion!.url,
      DEMO_URLS.figma!.url,
      DEMO_URLS.vercel!.url,
      DEMO_URLS.slack!.url,
    ],
  },
  {
    windowName: "Research",
    color: "green",
    urls: [
      DEMO_URLS.arxiv!.url,
      DEMO_URLS.wikipedia!.url,
      DEMO_URLS.stackoverflow!.url,
      DEMO_URLS.mdn!.url,
      DEMO_URLS.hackerNews!.url,
      DEMO_URLS.medium!.url,
    ],
  },
  {
    windowName: "Vikend",
    color: "amber",
    urls: [
      DEMO_URLS.amazon!.url,
      DEMO_URLS.amazonCart!.url,
      DEMO_URLS.cnn!.url,
      DEMO_URLS.bbc!.url,
      DEMO_URLS.nyt!.url,
      DEMO_URLS.youtube!.url,
      DEMO_URLS.netflix!.url,
      DEMO_URLS.spotify!.url,
    ],
  },
];
