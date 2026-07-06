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

function mk(url: string, title: string, host: string): DemoUrl {
  return { url, title, favIconUrl: fav(host) };
}

const U = {
  // ---------- Work / Productivity ----------
  gmail: mk("https://mail.google.com/mail/u/0/#inbox", "Inbox (12) — mersed@gmail.com", "gmail.com"),
  calendar: mk("https://calendar.google.com/calendar/u/0/r/week", "This week — Google Calendar", "calendar.google.com"),
  drive: mk("https://drive.google.com/drive/u/0/my-drive", "My Drive — Google Drive", "drive.google.com"),
  meet: mk("https://meet.google.com/xyz-abc-def", "Standup — Google Meet", "meet.google.com"),
  github: mk("https://github.com/mersedca/pawtabs/pull/42", "Add bulk group actions #42 — mersedca/pawtabs", "github.com"),
  githubIssues: mk("https://github.com/mersedca/pawtabs/issues", "Issues · mersedca/pawtabs", "github.com"),
  githubActions: mk("https://github.com/mersedca/pawtabs/actions", "Actions · mersedca/pawtabs", "github.com"),
  githubDiscussions: mk("https://github.com/anthropics/claude-code/discussions", "Discussions · anthropics/claude-code", "github.com"),
  linear: mk("https://linear.app/pawtabs/issue/PAW-128", "PAW-128: Snapshot compression", "linear.app"),
  linearMy: mk("https://linear.app/pawtabs/my-issues", "My issues — Linear", "linear.app"),
  notion: mk("https://www.notion.so/pawtabs/Q3-Roadmap-a7f2b8", "Q3 Roadmap — Notion", "notion.so"),
  notionMeeting: mk("https://www.notion.so/pawtabs/Team-1-1-2026-07-05", "1:1 notes 2026-07-05 — Notion", "notion.so"),
  figma: mk("https://www.figma.com/design/AbC123/PawTabs-2-2", "PawTabs 2.2 – Design specs — Figma", "figma.com"),
  figmaComments: mk("https://www.figma.com/file/XyZ456/Sprint-11-comments", "Sprint 11 comments — Figma", "figma.com"),
  vercel: mk("https://vercel.com/mersedca/pawtabs-web/deployments", "Deployments — pawtabs-web — Vercel", "vercel.com"),
  vercelLogs: mk("https://vercel.com/mersedca/pawtabs-web/logs", "Runtime logs — Vercel", "vercel.com"),
  slack: mk("https://pawtabs.slack.com/archives/C01ABC", "#general — PawTabs Slack", "slack.com"),
  slackDm: mk("https://pawtabs.slack.com/archives/D02DEF", "Anna Miller — direct message", "slack.com"),
  jira: mk("https://mersedca.atlassian.net/jira/software/projects/PAW/boards/1", "Sprint board — Jira", "atlassian.net"),
  clickup: mk("https://app.clickup.com/2/v/l/li/93kA", "Marketing tasks — ClickUp", "clickup.com"),
  trello: mk("https://trello.com/b/xyz/product", "Product roadmap — Trello", "trello.com"),

  // ---------- Research / Learning ----------
  arxiv: mk("https://arxiv.org/abs/2401.12345", "Attention as Memory: Long-context transformers — arXiv", "arxiv.org"),
  arxiv2: mk("https://arxiv.org/abs/2405.09876", "Mixture-of-Experts scaling laws — arXiv", "arxiv.org"),
  wikipedia: mk("https://en.wikipedia.org/wiki/Tab_(interface)", "Tab (interface) — Wikipedia", "en.wikipedia.org"),
  wikipediaBrowser: mk("https://en.wikipedia.org/wiki/Google_Chrome", "Google Chrome — Wikipedia", "en.wikipedia.org"),
  stackoverflow: mk("https://stackoverflow.com/questions/77123456/preact-lazy-loading", "Lazy loading with Preact 10 signals — Stack Overflow", "stackoverflow.com"),
  stackoverflow2: mk("https://stackoverflow.com/questions/78901234/tailwind-v4-source-inline", "Tailwind v4 @source inline dynamic classes — Stack Overflow", "stackoverflow.com"),
  mdn: mk("https://developer.mozilla.org/en-US/docs/Web/API/Storage", "Web Storage API — MDN", "developer.mozilla.org"),
  mdnEvents: mk("https://developer.mozilla.org/en-US/docs/Web/Events", "Events reference — MDN", "developer.mozilla.org"),
  mdnCss: mk("https://developer.mozilla.org/en-US/docs/Web/CSS/@container", "@container — MDN", "developer.mozilla.org"),
  hackerNews: mk("https://news.ycombinator.com/item?id=41234567", "Show HN: PawTabs — tab manager — Hacker News", "news.ycombinator.com"),
  hackerNewsFront: mk("https://news.ycombinator.com/", "Hacker News", "news.ycombinator.com"),
  medium: mk("https://medium.com/tech/the-hidden-cost-of-open-tabs-a1b2c3", "The hidden cost of 200 open tabs — Medium", "medium.com"),
  substack: mk("https://everything.substack.com/p/browser-productivity", "Browser productivity: 2026 edition — Substack", "substack.com"),
  chatgpt: mk("https://chatgpt.com/c/xyz", "Refactor idea — ChatGPT", "chatgpt.com"),
  claude: mk("https://claude.ai/chat/abc", "Design brainstorm — Claude", "claude.ai"),
  perplexity: mk("https://www.perplexity.ai/search/tab-management-tools", "tab management tools 2026 — Perplexity", "perplexity.ai"),
  coursera: mk("https://www.coursera.org/learn/algorithms-part1", "Algorithms Part I — Coursera", "coursera.org"),
  udemy: mk("https://www.udemy.com/course/react-the-complete-guide", "React The Complete Guide — Udemy", "udemy.com"),
  freecodecamp: mk("https://www.freecodecamp.org/learn/2022/responsive-web-design/", "Responsive Web Design — freeCodeCamp", "freecodecamp.org"),
  egghead: mk("https://egghead.io/courses/reactive-state", "Reactive state — egghead.io", "egghead.io"),

  // ---------- Weekend / Personal ----------
  amazon: mk("https://www.amazon.com/dp/B0BDHWDR12", "Kindle Paperwhite (2024) — Amazon", "amazon.com"),
  amazonCart: mk("https://www.amazon.com/gp/cart/view.html", "Your Shopping Cart — Amazon", "amazon.com"),
  amazonOrders: mk("https://www.amazon.com/gp/your-account/order-history", "Your Orders — Amazon", "amazon.com"),
  amazonWishlist: mk("https://www.amazon.com/hz/wishlist/ls/2E2A3", "Wishlist — Amazon", "amazon.com"),
  cnn: mk("https://www.cnn.com/2026/07/03/tech/ai-agents-market/index.html", "AI agents market crosses $50B — CNN", "cnn.com"),
  bbc: mk("https://www.bbc.com/news/technology-68931201", "Chrome's new tab groups explained — BBC", "bbc.com"),
  nyt: mk("https://www.nytimes.com/2026/06/28/technology/browsers-productivity.html", "The browser as a productivity tool — NYT", "nytimes.com"),
  guardian: mk("https://www.theguardian.com/technology/2026/jul/04/browser-wars", "The new browser wars — The Guardian", "theguardian.com"),
  reddit: mk("https://www.reddit.com/r/productivity/comments/xyz/tab_management", "How do you handle 100+ tabs? — r/productivity", "reddit.com"),
  redditFront: mk("https://www.reddit.com/", "Reddit — front page", "reddit.com"),
  youtube: mk("https://www.youtube.com/watch?v=demo-tab-management", "Manage 200+ tabs without losing focus — YouTube", "youtube.com"),
  youtubeMusic: mk("https://music.youtube.com/playlist?list=RDCLAK5uy", "Focus playlist — YouTube Music", "music.youtube.com"),
  youtubeVideo2: mk("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Never Gonna Give You Up — YouTube", "youtube.com"),
  netflix: mk("https://www.netflix.com/browse", "Netflix — Home", "netflix.com"),
  spotify: mk("https://open.spotify.com/playlist/37i9dQZF1DX", "Deep Focus — Spotify", "spotify.com"),
  spotifyLikes: mk("https://open.spotify.com/collection/tracks", "Liked Songs — Spotify", "spotify.com"),
  soundcloud: mk("https://soundcloud.com/discover", "Discover — SoundCloud", "soundcloud.com"),
  bandcamp: mk("https://bandcamp.com/discover", "Discover — Bandcamp", "bandcamp.com"),
  applemusic: mk("https://music.apple.com/us/browse", "Apple Music", "music.apple.com"),
  instagram: mk("https://www.instagram.com/", "Instagram", "instagram.com"),
  twitter: mk("https://x.com/home", "Home / X", "x.com"),
  linkedin: mk("https://www.linkedin.com/feed/", "LinkedIn Feed", "linkedin.com"),
  pinterest: mk("https://www.pinterest.com/", "Pinterest", "pinterest.com"),
  imdb: mk("https://www.imdb.com/", "IMDb — Movies", "imdb.com"),
  rottentomatoes: mk("https://www.rottentomatoes.com/", "Rotten Tomatoes", "rottentomatoes.com"),
  goodreads: mk("https://www.goodreads.com/", "Goodreads — Books", "goodreads.com"),
  strava: mk("https://www.strava.com/dashboard", "Dashboard — Strava", "strava.com"),
  maps: mk("https://www.google.com/maps/search/coffee+near+me", "coffee near me — Google Maps", "maps.google.com"),
  weather: mk("https://www.wunderground.com/forecast/us/ny/new-york-city", "New York, NY — Weather Underground", "wunderground.com"),
  airbnb: mk("https://www.airbnb.com/s/Portugal", "Portugal stays — Airbnb", "airbnb.com"),
  booking: mk("https://www.booking.com/searchresults.html?ss=Lisbon", "Lisbon hotels — Booking.com", "booking.com"),

  // ---------- Finance ----------
  chase: mk("https://www.chase.com/", "Chase — Personal Banking", "chase.com"),
  fidelity: mk("https://www.fidelity.com/", "Fidelity — Investments", "fidelity.com"),
  wsj: mk("https://www.wsj.com/finance/markets", "Markets — WSJ", "wsj.com"),
  bloomberg: mk("https://www.bloomberg.com/markets", "Markets — Bloomberg", "bloomberg.com"),
  coingecko: mk("https://www.coingecko.com/", "CoinGecko — Crypto prices", "coingecko.com"),
  mint: mk("https://mint.intuit.com/", "Mint — Budget tracker", "mint.intuit.com"),

  // ---------- Music / audible ----------
  spotifyPlaying: mk("https://open.spotify.com/track/current", "Now playing — Spotify", "spotify.com"),
};

const K = Object.keys(U) as (keyof typeof U)[];

export async function seedDemoData(): Promise<void> {
  // ---------- pawedUrls (persistent favorites) ----------
  const pawed: Record<string, PawedEntry> = {};
  const pawedKeys: (keyof typeof U)[] = [
    "github",
    "linear",
    "notion",
    "figma",
    "vercel",
    "calendar",
    "amazonCart",
    "arxiv",
    "chatgpt",
    "claude",
    "gmail",
    "slack",
    "trello",
    "notionMeeting",
    "spotify",
    "bloomberg",
    "youtube",
    "coursera",
  ];
  pawedKeys.forEach((k, i) => {
    const u = U[k];
    pawed[u.url] = {
      url: u.url,
      title: u.title,
      favIconUrl: u.favIconUrl,
      pawedAt: now - (i + 1) * 3 * HOUR,
      note:
        i === 0
          ? "Review before EOD Thursday"
          : i === 3
            ? "Design signoff needed"
            : undefined,
    };
  });

  // ---------- taggedUrls (custom lists) ----------
  const tagged: Record<string, TaggedUrlEntry> = {};
  const addTag = (
    key: keyof typeof U,
    tags: string[],
    ageDays: number,
  ) => {
    const u = U[key];
    const existing = tagged[u.url];
    tagged[u.url] = {
      url: u.url,
      title: u.title,
      favIconUrl: u.favIconUrl,
      tags: Array.from(new Set([...(existing?.tags ?? []), ...tags])),
      updatedAt: now - ageDays * DAY,
    };
  };

  // Reading list
  ["cnn", "bbc", "nyt", "guardian", "medium", "substack", "hackerNews"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Reading"], i),
  );
  // Research
  ["arxiv", "arxiv2", "wikipedia", "wikipediaBrowser", "chatgpt", "claude", "perplexity", "mdn", "mdnEvents", "mdnCss", "stackoverflow", "stackoverflow2"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Research"], i),
  );
  // Shopping
  ["amazon", "amazonCart", "amazonWishlist", "amazonOrders", "airbnb", "booking"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Shopping"], i),
  );
  // Work
  ["github", "githubIssues", "githubActions", "linear", "linearMy", "notion", "notionMeeting", "figma", "figmaComments", "vercel", "vercelLogs", "slack", "slackDm", "jira", "clickup", "trello", "gmail", "calendar", "meet", "drive"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Work"], i),
  );
  // Learning
  ["coursera", "udemy", "freecodecamp", "egghead", "mdn", "stackoverflow"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Learning"], i),
  );
  // Watch later
  ["youtube", "youtubeVideo2", "netflix", "youtubeMusic"].forEach((k, i) =>
    addTag(k as keyof typeof U, ["Watch later"], i),
  );
  // Music
  ["spotify", "spotifyLikes", "spotifyPlaying", "youtubeMusic", "soundcloud", "bandcamp", "applemusic"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Music"], i),
  );
  // Ensure every pawed URL carries at least one tag for demo coverage
  addTag("bloomberg", ["Finance", "Reading"], 0);
  addTag("youtube", ["Watch later"], 0);
  // Social
  ["twitter", "linkedin", "instagram", "pinterest", "reddit", "redditFront"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Social"], i),
  );
  // Finance
  ["chase", "fidelity", "wsj", "bloomberg", "coingecko", "mint"].forEach(
    (k, i) => addTag(k as keyof typeof U, ["Finance"], i),
  );
  // Travel
  ["airbnb", "booking", "maps", "weather"].forEach((k, i) =>
    addTag(k as keyof typeof U, ["Travel"], i),
  );
  // Coverage sweep — every URL that ships in the demo windows gets
  // at least one tag so no tab in demo mode appears bare.
  addTag("meet", ["Work"], 0);
  addTag("drive", ["Work"], 0);
  addTag("jira", ["Work"], 0);
  addTag("clickup", ["Work"], 0);
  addTag("githubDiscussions", ["Research"], 0);
  addTag("hackerNewsFront", ["Reading"], 0);
  addTag("imdb", ["Watch later"], 0);
  addTag("rottentomatoes", ["Watch later"], 0);
  addTag("goodreads", ["Reading"], 0);
  addTag("strava", ["Social"], 0);
  // Multi-tag overlays — real users often stack labels; show the UI
  // handles it (Tag N badge shows the count, chips wrap nicely).
  addTag("github", ["Work", "Learning", "Research"], 1);
  addTag("linear", ["Work", "Planning"], 2);
  addTag("notion", ["Work", "Reading", "Planning"], 1);
  addTag("figma", ["Work", "Design"], 1);
  addTag("chatgpt", ["Research", "Learning", "AI"], 0);
  addTag("claude", ["Research", "Learning", "AI"], 0);
  addTag("perplexity", ["Research", "AI"], 0);
  addTag("arxiv", ["Research", "Reading", "AI"], 2);
  addTag("hackerNews", ["Reading", "Tech", "Community"], 1);
  addTag("medium", ["Reading", "Tech"], 3);
  addTag("substack", ["Reading", "Tech"], 4);
  addTag("wsj", ["Finance", "Reading"], 1);
  addTag("bloomberg", ["Finance", "Reading", "Markets"], 0);
  addTag("coingecko", ["Finance", "Markets", "Crypto"], 0);
  addTag("stackoverflow", ["Research", "Learning", "Tech"], 0);
  addTag("mdn", ["Research", "Learning", "Tech"], 1);
  addTag("mdnCss", ["Learning", "Tech", "Design"], 2);
  addTag("figmaComments", ["Work", "Design"], 3);
  addTag("linkedin", ["Social", "Networking", "Work"], 1);
  addTag("twitter", ["Social", "News"], 2);
  addTag("reddit", ["Social", "Reading", "Community"], 0);
  addTag("amazon", ["Shopping", "Wishlist"], 3);
  addTag("amazonCart", ["Shopping", "Wishlist"], 0);
  addTag("amazonWishlist", ["Shopping", "Wishlist"], 4);
  addTag("airbnb", ["Travel", "Planning"], 1);
  addTag("booking", ["Travel", "Planning"], 2);
  addTag("maps", ["Travel", "Reference"], 3);
  addTag("coursera", ["Learning", "Career"], 1);
  addTag("udemy", ["Learning", "Career"], 2);
  addTag("freecodecamp", ["Learning", "Tech", "Career"], 3);
  addTag("egghead", ["Learning", "Tech"], 4);
  addTag("spotify", ["Music", "Focus"], 0);
  addTag("spotifyLikes", ["Music", "Favorites"], 1);
  addTag("youtube", ["Watch later", "Learning"], 0);
  addTag("netflix", ["Watch later", "Entertainment"], 2);

  // ---------- notesByUrl ----------
  const notesMap: Record<string, Note[]> = {};
  const mkNote = (text: string, ageHours = 3): Note => ({
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text,
    createdAt: now - ageHours * HOUR,
  });
  notesMap[U.github.url] = [
    mkNote("Waiting on review from Anna — pinged in Slack"),
    mkNote("Also need to update CHANGELOG before merging"),
  ];
  notesMap[U.linear.url] = [
    mkNote("Blocked by PAW-127; check migration next Monday"),
  ];
  notesMap[U.notion.url] = [
    mkNote("Legal signoff needed for Q3 launch (RFC-2026-14)"),
    mkNote("Add engineering estimate to the roadmap doc"),
  ];
  notesMap[U.notionMeeting.url] = [
    mkNote("Bring up the OKR misalignment — action item from last time"),
  ];
  notesMap[U.figma.url] = [
    mkNote("Prefer purple palette for the empty state"),
  ];
  notesMap[U.vercel.url] = [
    mkNote("Preview deployment failing on Node 22 — check runtime target"),
  ];
  notesMap[U.calendar.url] = [
    mkNote("Move Friday sync to 3pm — Alex is out until noon"),
  ];
  notesMap[U.gmail.url] = [
    mkNote("Reply to Q3 budget email by EOW"),
  ];
  notesMap[U.slack.url] = [
    mkNote("Design review scheduled Thursday 11am"),
  ];
  notesMap[U.trello.url] = [
    mkNote("Move Marketing Launch card to In Review"),
  ];
  notesMap[U.arxiv.url] = [
    mkNote("Skim intro + sec 4.2, cite in Q3 roadmap doc"),
  ];
  notesMap[U.chatgpt.url] = [
    mkNote("Refactor conversation — save code snippets before archiving"),
  ];
  notesMap[U.claude.url] = [
    mkNote("Follow up on the state management proposal"),
  ];
  notesMap[U.amazonCart.url] = [
    mkNote("Wait for Prime Day discount, don't check out yet"),
    mkNote("Compare Kindle Paperwhite vs Oasis before deciding"),
  ];
  notesMap[U.spotify.url] = [
    mkNote("Playlist for deep-focus mornings"),
  ];
  notesMap[U.bloomberg.url] = [
    mkNote("Check the mid-year outlook piece from June"),
  ];
  notesMap[U.youtube.url] = [
    mkNote("Watch the deep-dive later this week"),
  ];
  notesMap[U.coursera.url] = [
    mkNote("Assignment 3 due next Friday — start by Wed"),
    mkNote("Review Prof. Lin's optional readings before quiz"),
  ];
  // Broaden note coverage so more tabs in the demo windows show the
  // cyan note badge on the title line.
  notesMap[U.figmaComments.url] = [
    mkNote("Address the 4 unread comments before design review"),
  ];
  notesMap[U.vercelLogs.url] = [
    mkNote("Check the SSR crash pattern from yesterday's spike"),
  ];
  notesMap[U.jira.url] = [
    mkNote("Update sprint carryover before standup"),
  ];
  notesMap[U.clickup.url] = [
    mkNote("Move ML training tasks to next sprint"),
  ];
  notesMap[U.udemy.url] = [
    mkNote("Continue from lesson 42 — CI/CD basics"),
  ];
  notesMap[U.freecodecamp.url] = [
    mkNote("Finish responsive design section this weekend"),
  ];
  notesMap[U.mdnEvents.url] = [
    mkNote("Reference for the PointerEvent refactor"),
  ];
  notesMap[U.stackoverflow.url] = [
    mkNote("Bookmark the accepted answer — reused pattern"),
  ];
  notesMap[U.perplexity.url] = [
    mkNote("Compare with Claude's answer on the same query"),
  ];
  notesMap[U.medium.url] = [
    mkNote("Interesting take on browser productivity — save quote"),
  ];
  notesMap[U.hackerNews.url] = [
    mkNote("Follow-up on the 300+ comment thread later"),
  ];
  notesMap[U.reddit.url] = [
    mkNote("Reply to my comment thread"),
  ];
  notesMap[U.linkedin.url] = [
    mkNote("Message Priya about the DevRel role"),
  ];
  notesMap[U.twitter.url] = [
    mkNote("Save the AI benchmark thread for later"),
  ];
  notesMap[U.instagram.url] = [
    mkNote("Reply to Nadia's story tomorrow"),
  ];
  notesMap[U.imdb.url] = [
    mkNote("Check Denis Villeneuve's next project date"),
  ];
  notesMap[U.rottentomatoes.url] = [
    mkNote("Filter to 90%+ for weekend picks"),
  ];
  notesMap[U.goodreads.url] = [
    mkNote("Add 'Klara and the Sun' to want-to-read"),
  ];
  notesMap[U.netflix.url] = [
    mkNote("Season 2 drops Friday — clear evening"),
  ];
  notesMap[U.spotifyLikes.url] = [
    mkNote("Prune tracks older than 2022 quarter"),
  ];
  notesMap[U.soundcloud.url] = [
    mkNote("New producer to follow — link from Discord"),
  ];
  notesMap[U.bandcamp.url] = [
    mkNote("Support this artist before Bandcamp Friday"),
  ];
  notesMap[U.chase.url] = [
    mkNote("Reconcile card statement, transfer to savings"),
  ];
  notesMap[U.fidelity.url] = [
    mkNote("Rebalance target allocation quarterly"),
  ];
  notesMap[U.wsj.url] = [
    mkNote("Read the earnings recap piece"),
  ];
  notesMap[U.coingecko.url] = [
    mkNote("Watchlist alert set at $2400"),
  ];
  notesMap[U.mint.url] = [
    mkNote("Categorize last month's transactions"),
  ];
  notesMap[U.airbnb.url] = [
    mkNote("Compare 3 shortlisted stays before booking"),
  ];
  notesMap[U.booking.url] = [
    mkNote("Flexible dates give ~30% saving — worth juggling calendar"),
  ];
  notesMap[U.maps.url] = [
    mkNote("Save the good coffee spots as pins"),
  ];
  notesMap[U.weather.url] = [
    mkNote("Rain expected Sat afternoon — plan indoor backup"),
  ];
  notesMap[U.strava.url] = [
    mkNote("Log this week's long run"),
  ];
  notesMap[U.wikipedia.url] = [
    mkNote("Cite the interface history section in the design doc"),
  ];
  notesMap[U.drive.url] = [
    mkNote("Move Q3 planning doc to shared team folder"),
  ];
  notesMap[U.meet.url] = [
    mkNote("Add attendee list from Slack invite"),
  ];

  // ---------- savedSessions (snapshots) ----------
  const mkSessionTab = (key: keyof typeof U, i: number) => {
    const u = U[key];
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
    description: "Standup + inbox + open PRs",
    dateTime: iso(now - 2 * DAY),
    tabs: [
      "gmail",
      "calendar",
      "linear",
      "github",
      "githubIssues",
      "notion",
      "figma",
      "slack",
      "vercel",
    ].map((k, i) => mkSessionTab(k as keyof typeof U, i + 1)),
    windows: [{ id: 1000, title: "Work" }],
  };

  const researchAI: SavedSession = {
    id: `sess_${now}_b`,
    sessionName: "Research: AI agents",
    description: "Papers + benchmarks for Q3 roadmap prep",
    dateTime: iso(now - 5 * DAY),
    tabs: [
      "arxiv",
      "arxiv2",
      "hackerNews",
      "medium",
      "wikipedia",
      "chatgpt",
      "claude",
      "perplexity",
    ].map((k, i) => mkSessionTab(k as keyof typeof U, i + 20)),
    windows: [{ id: 1000, title: "Research" }],
  };

  const weekendShopping: SavedSession = {
    id: `sess_${now}_c`,
    sessionName: "Weekend shopping list",
    description: "Amazon prime day picks + gift ideas",
    dateTime: iso(now - 3 * DAY),
    tabs: [
      "amazon",
      "amazonCart",
      "amazonWishlist",
      "amazonOrders",
    ].map((k, i) => mkSessionTab(k as keyof typeof U, i + 30)),
    windows: [{ id: 1000, title: "Weekend" }],
  };

  const musicSession: SavedSession = {
    id: `sess_${now}_e`,
    sessionName: "Focus music",
    description: "Playlists that work",
    dateTime: iso(now - 1 * DAY),
    tabs: ["spotify", "youtubeMusic", "soundcloud", "bandcamp"].map((k, i) =>
      mkSessionTab(k as keyof typeof U, i + 40),
    ),
    windows: [{ id: 1000, title: "Weekend" }],
  };

  const learningSession: SavedSession = {
    id: `sess_${now}_f`,
    sessionName: "Weekly learning",
    description: "Courses + tutorials to catch up on",
    dateTime: iso(now - 4 * DAY),
    tabs: [
      "coursera",
      "udemy",
      "freecodecamp",
      "egghead",
      "mdn",
      "stackoverflow",
    ].map((k, i) => mkSessionTab(k as keyof typeof U, i + 50)),
    windows: [{ id: 1000, title: "Learning" }],
  };

  const autoBackup: SavedSession = {
    id: `sess_${now}_d`,
    sessionName: `Auto: ${new Date(now - 7 * DAY).toLocaleString()}`,
    description: "Automatic daily snapshot",
    dateTime: iso(now - 7 * DAY),
    auto: true,
    tabs: K.slice(0, 30).map((k, i) => mkSessionTab(k, 100 + i)),
    windows: [{ id: 1000 }],
  };

  const autoBackup2: SavedSession = {
    id: `sess_${now}_g`,
    sessionName: `Auto: ${new Date(now - 8 * DAY).toLocaleString()}`,
    description: "Automatic daily snapshot",
    dateTime: iso(now - 8 * DAY),
    auto: true,
    tabs: K.slice(0, 22).map((k, i) => mkSessionTab(k, 200 + i)),
    windows: [{ id: 1000 }],
  };

  const sessions: SavedSession[] = [
    workStart,
    researchAI,
    weekendShopping,
    musicSession,
    learningSession,
    autoBackup,
    autoBackup2,
  ];

  // ---------- backups (wizard) ----------
  const backups: Backup[] = [
    {
      id: `backup_${now}_a`,
      name: "Before closing 18 inactive tabs",
      createdAt: iso(now - 3 * HOUR),
      windowCount: 4,
      tabCount: 18,
      data: { savedSessions: [workStart] },
    },
    {
      id: `backup_${now}_b`,
      name: "Before closing 32 duplicates",
      createdAt: iso(now - 2 * DAY),
      windowCount: 5,
      tabCount: 32,
      data: { savedSessions: [autoBackup] },
    },
    {
      id: `backup_${now}_c`,
      name: "Manual full backup",
      createdAt: iso(now - 6 * DAY),
      windowCount: 6,
      tabCount: 47,
      data: { savedSessions: [autoBackup2] },
    },
  ];

  // ---------- windows metadata ----------
  const windows: Record<number, WindowMeta> = {
    1: { title: "Work", color: "blue" },
    2: { title: "Research", color: "green" },
    3: { title: "Weekend", color: "amber" },
    4: { title: "Learning", color: "purple" },
    5: { title: "Finance", color: "red" },
  };

  const savedPages: Record<number, SavedPage> = {};

  await Promise.all([
    storage.set("pawedUrls", pawed),
    storage.set("taggedUrls", tagged),
    storage.set("savedSessions", sessions),
    storage.set("backups", backups),
    storage.set("windows", windows),
    storage.set("savedPages", savedPages),
    storage.set("notesByUrl", notesMap),
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
    storage.set("notesByUrl", {}),
  ]);
}

export const SUGGESTED_TABS_TO_OPEN: {
  windowName: string;
  color: string;
  urls: string[];
}[] = [
  {
    windowName: "Work",
    color: "blue",
    urls: [
      U.gmail.url,
      U.calendar.url,
      U.drive.url,
      U.meet.url,
      U.github.url,
      U.githubIssues.url,
      U.githubActions.url,
      U.linear.url,
      U.linearMy.url,
      U.notion.url,
      U.notionMeeting.url,
      U.figma.url,
      U.figmaComments.url,
      U.vercel.url,
      U.vercelLogs.url,
      U.slack.url,
      U.slackDm.url,
      U.jira.url,
      U.trello.url,
      U.clickup.url,
    ],
  },
  {
    windowName: "Research",
    color: "green",
    urls: [
      U.arxiv.url,
      U.arxiv2.url,
      U.wikipedia.url,
      U.wikipediaBrowser.url,
      U.stackoverflow.url,
      U.stackoverflow2.url,
      U.mdn.url,
      U.mdnEvents.url,
      U.mdnCss.url,
      U.hackerNews.url,
      U.hackerNewsFront.url,
      U.medium.url,
      U.substack.url,
      U.chatgpt.url,
      U.claude.url,
      U.perplexity.url,
      U.githubDiscussions.url,
    ],
  },
  {
    windowName: "Weekend",
    color: "amber",
    urls: [
      U.amazon.url,
      U.amazonCart.url,
      U.amazonWishlist.url,
      U.amazonOrders.url,
      U.cnn.url,
      U.bbc.url,
      U.nyt.url,
      U.guardian.url,
      U.reddit.url,
      U.redditFront.url,
      U.youtube.url,
      U.youtubeVideo2.url,
      U.netflix.url,
      U.instagram.url,
      U.twitter.url,
      U.linkedin.url,
      U.pinterest.url,
      U.imdb.url,
      U.rottentomatoes.url,
      U.goodreads.url,
      U.strava.url,
      U.maps.url,
      U.weather.url,
      U.airbnb.url,
      U.booking.url,
    ],
  },
  {
    windowName: "Learning",
    color: "purple",
    urls: [
      U.coursera.url,
      U.udemy.url,
      U.freecodecamp.url,
      U.egghead.url,
      U.wikipedia.url,
      U.mdn.url,
      U.mdnCss.url,
      U.stackoverflow.url,
    ],
  },
  {
    windowName: "Finance",
    color: "red",
    urls: [
      U.chase.url,
      U.fidelity.url,
      U.wsj.url,
      U.bloomberg.url,
      U.coingecko.url,
      U.mint.url,
    ],
  },
  {
    windowName: "Music",
    color: "pink",
    urls: [
      U.spotify.url,
      U.spotifyLikes.url,
      U.spotifyPlaying.url,
      U.youtubeMusic.url,
      U.soundcloud.url,
      U.bandcamp.url,
      U.applemusic.url,
    ],
  },
];
