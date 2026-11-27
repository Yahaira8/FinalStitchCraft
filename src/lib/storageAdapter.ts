import { RuntimeMode, User } from '../types';
import { SEED_DEMO_USER, SEED_GALLERY_POSTS } from './seedData';

const KEYS = {
  users: 'stitchcraft_users',
  session: 'stitchcraft_session',
  projects: 'stitchcraft_projects',
  favorites: 'stitchcraft_favorites',
  gallery: 'stitchcraft_gallery_posts',
} as const;

interface LocalUserRecord extends User {
  passwordHash: string;
}

let modePromise: Promise<RuntimeMode> | null = null;
let cachedMode: RuntimeMode = 'aistudio-local';

async function hashLocalPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(`stitchcraft:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(password);
}

function ensureLocalSeedData(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(KEYS.users)) {
    const demoRecord: LocalUserRecord = {
      ...SEED_DEMO_USER,
      passwordHash: 'demo-account',
    };
    localStorage.setItem(KEYS.users, JSON.stringify([demoRecord]));
  }
  if (!localStorage.getItem(KEYS.projects)) {
    localStorage.setItem(KEYS.projects, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.favorites)) {
    localStorage.setItem(KEYS.favorites, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.gallery)) {
    localStorage.setItem(KEYS.gallery, JSON.stringify(SEED_GALLERY_POSTS));
  }
}

async function detectMode(): Promise<RuntimeMode> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const payload = (await res.json()) as { ok?: boolean; mode?: string };
      if (payload?.ok === true) {
        cachedMode = 'replit-pg';
        return 'replit-pg';
      }
    }
  } catch {
    // Health endpoint unavailable in Google AI Studio client sandbox
  } finally {
    window.clearTimeout(timer);
  }

  ensureLocalSeedData();
  cachedMode = 'aistudio-local';
  return 'aistudio-local';
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Request failed');
  }
  return data as T;
}

export const storageAdapter = {
  async init(): Promise<RuntimeMode> {
    if (!modePromise) {
      modePromise = detectMode();
    }
    return modePromise;
  },

  getCachedMode(): RuntimeMode {
    return cachedMode;
  },

  async getCurrentUser(): Promise<User | null> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User | null }>('/api/auth/me');
      return res.user;
    }

    ensureLocalSeedData();
    const sessionUserId = localStorage.getItem(KEYS.session);
    if (!sessionUserId) return null;

    const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    const found = users.find((u) => u.id === sessionUserId);
    if (!found) return null;
    const { passwordHash: _ignored, ...safeUser } = found;
    return safeUser;
  },

  async loginWithDemo(): Promise<User> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ demo: true }),
      });
      return res.user;
    }

    ensureLocalSeedData();
    const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    let demo = users.find((u) => u.email === SEED_DEMO_USER.email);
    if (!demo) {
      demo = { ...SEED_DEMO_USER, passwordHash: 'demo-account' };
      users.push(demo);
      localStorage.setItem(KEYS.users, JSON.stringify(users));
    }
    localStorage.setItem(KEYS.session, demo.id);
    const { passwordHash: _ignored, ...safeUser } = demo;
    return safeUser;
  },

  async login(email: string, password: string): Promise<User> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return res.user;
    }

    ensureLocalSeedData();
    const normalized = email.trim().toLowerCase();
    const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    const passwordHash = await hashLocalPassword(password);
    const found = users.find(
      (u) => u.email === normalized && u.passwordHash === passwordHash
    );
    if (!found) {
      throw new Error('Invalid email or password');
    }
    localStorage.setItem(KEYS.session, found.id);
    const { passwordHash: _ignored, ...safeUser } = found;
    return safeUser;
  },

  async register(email: string, username: string, password: string): Promise<User> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
      return res.user;
    }

    ensureLocalSeedData();
    const normalized = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    if (!normalized.includes('@') || cleanUsername.length < 2 || password.length < 6) {
      throw new Error('Valid email, username (2+ chars), and password (6+ chars) required');
    }

    const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    if (users.some((u) => u.email === normalized)) {
      throw new Error('An account with that email already exists');
    }

    const newUser: LocalUserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      username: cleanUsername,
      passwordHash: await hashLocalPassword(password),
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    localStorage.setItem(KEYS.session, newUser.id);
    const { passwordHash: _ignored, ...safeUser } = newUser;
    return safeUser;
  },

  async logout(): Promise<void> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      return;
    }
    localStorage.removeItem(KEYS.session);
  },
};
