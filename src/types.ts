export interface Note {
  id: string;
  text: string;
  createdAt: number;
}

export interface SavedPage {
  tags?: string[];
  notes?: Note[];
  starred?: boolean;
  pinned?: boolean;
  saved?: boolean;
  tabGroups?: { id: string; title: string; color: string };
}

export interface SessionTab {
  id: number;
  url: string;
  title: string;
  pinned?: boolean;
  windowId?: number;
  favIconUrl?: string;
}

export interface SavedSession {
  id: string;
  sessionName: string;
  dateTime: string;
  tabs: SessionTab[];
  windows: { id: number; title?: string }[];
}

export interface SavedGroup {
  id: string;
  title: string;
  color: string;
  tabs: SessionTab[];
}

export interface Backup {
  id: string;
  name: string;
  createdAt: string;
  windowCount: number;
  tabCount: number;
  data: {
    savedPages?: Record<number, SavedPage>;
    savedSessions?: SavedSession[];
    savedGroups?: SavedGroup[];
  };
}

export interface WindowMeta {
  title?: string;
}

export interface StorageSchema {
  savedPages: Record<number, SavedPage>;
  savedSessions: SavedSession[];
  savedGroups: SavedGroup[];
  windows: Record<number, WindowMeta>;
  backups: Backup[];
}

export interface PawTab {
  id: number;
  windowId: number;
  url: string;
  title: string;
  favIconUrl: string;
  audible: boolean;
  muted: boolean;
  discarded: boolean;
  pinned: boolean;
  lastAccessed?: number;
  saved: boolean;
  starred: boolean;
}

export interface TabSnapshot {
  windowCount: number;
  tabCount: number;
  inactiveCount: number;
  tabs: PawTab[];
}
