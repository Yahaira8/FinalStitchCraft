import {
  CommunityPost,
  PartProgressItem,
  Pattern,
  PostComment,
  ProjectStatus,
  RuntimeMode,
  User,
  UserProject,
} from '../types';
import { SEED_DEMO_USER, SEED_GALLERY_POSTS, SEED_PATTERNS } from './seedData';
import { calculateOverallProgress } from './amigurumiMath';
import { signInWithGooglePopup, signOutGoogle } from './googleAuth';

const KEYS = {
  users: 'stitchcraft_users',
  session: 'stitchcraft_session',
  projects: 'stitchcraft_projects',
  favorites: 'stitchcraft_favorites',
  gallery: 'stitchcraft_gallery_posts',
  postLikes: 'stitchcraft_post_likes',
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
  if (!localStorage.getItem(KEYS.postLikes)) {
    localStorage.setItem(KEYS.postLikes, JSON.stringify({}));
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

function getLocalSessionUser(): User | null {
  const sessionUserId = localStorage.getItem(KEYS.session);
  if (!sessionUserId) return null;
  const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
  const found = users.find((u) => u.id === sessionUserId);
  if (!found) return null;
  const { passwordHash: _ignored, ...safeUser } = found;
  return safeUser;
}

export interface CreateProjectInput {
  pattern_id: string | null;
  project_name: string;
  target_yarn: string;
  target_hook: string;
  target_eye_size: string;
  part_progress: Record<string, PartProgressItem>;
  status?: ProjectStatus;
  personal_notes?: string;
}

export interface UpdateProjectInput {
  part_progress?: Record<string, PartProgressItem>;
  overall_completion?: number;
  status?: ProjectStatus;
  personal_notes?: string;
}

export interface CreateGalleryPostInput {
  pattern_id: string | null;
  custom_pattern_name: string | null;
  photo_data_url: string;
  caption: string;
  yarn_used: string;
  hook_used: string;
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

  // --- AUTH ---

  async getCurrentUser(): Promise<User | null> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User | null }>('/api/auth/me');
      return res.user;
    }

    ensureLocalSeedData();
    return getLocalSessionUser();
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

  async loginWithGoogle(): Promise<User> {
    const googleUser = await signInWithGooglePopup();
    const mode = await this.init();

    if (mode === 'replit-pg') {
      const res = await apiFetch<{ user: User }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken: googleUser.idToken }),
      });
      return res.user;
    }

    ensureLocalSeedData();
    const users: LocalUserRecord[] = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    let record = users.find((u) => u.email === googleUser.email);

    if (!record) {
      record = {
        id: crypto.randomUUID(),
        email: googleUser.email,
        username: googleUser.username,
        passwordHash: '!google-oauth-only!',
        avatar_url: googleUser.avatarUrl,
        created_at: new Date().toISOString(),
      };
      users.push(record);
      localStorage.setItem(KEYS.users, JSON.stringify(users));
    } else if (googleUser.avatarUrl && !record.avatar_url) {
      record.avatar_url = googleUser.avatarUrl;
      localStorage.setItem(KEYS.users, JSON.stringify(users));
    }

    localStorage.setItem(KEYS.session, record.id);
    const { passwordHash: _ignored, ...safeUser } = record;
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
    const existingByEmail = users.find((u) => u.email === normalized);
    if (existingByEmail && existingByEmail.passwordHash.startsWith('!')) {
      throw new Error('Please sign in with Google for this account');
    }

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
    await signOutGoogle();
    if (mode === 'replit-pg') {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      return;
    }
    localStorage.removeItem(KEYS.session);
  },

  // --- PATTERNS ---

  async getPatterns(query = '', category = 'All'): Promise<Pattern[]> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category && category !== 'All') params.set('category', category);
      const qs = params.toString();
      return apiFetch<Pattern[]>(`/api/patterns${qs ? `?${qs}` : ''}`);
    }

    const q = query.trim().toLowerCase();
    return SEED_PATTERNS.filter((p) => {
      const matchesQ = !q || p.title.toLowerCase().includes(q);
      const matchesCat = !category || category === 'All' || p.category === category;
      return matchesQ && matchesCat;
    });
  },

  async getPatternById(id: string): Promise<Pattern | null> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      try {
        return await apiFetch<Pattern>(`/api/patterns/${encodeURIComponent(id)}`);
      } catch {
        return null;
      }
    }

    return SEED_PATTERNS.find((p) => p.id === id) ?? null;
  },

  // --- FAVORITES ---

  async getFavorites(): Promise<string[]> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<string[]>('/api/favorites');
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) return [];
    const map: Record<string, string[]> = JSON.parse(localStorage.getItem(KEYS.favorites) || '{}');
    return map[user.id] || [];
  },

  async toggleFavorite(patternId: string): Promise<{ favorited: boolean }> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<{ favorited: boolean }>('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ pattern_id: patternId }),
      });
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const map: Record<string, string[]> = JSON.parse(localStorage.getItem(KEYS.favorites) || '{}');
    const current = new Set(map[user.id] || []);
    let favorited = false;
    if (current.has(patternId)) {
      current.delete(patternId);
      favorited = false;
    } else {
      current.add(patternId);
      favorited = true;
    }
    map[user.id] = Array.from(current);
    localStorage.setItem(KEYS.favorites, JSON.stringify(map));
    return { favorited };
  },

  // --- PROJECTS ---

  async getProjects(): Promise<UserProject[]> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<UserProject[]>('/api/projects');
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) return [];
    const all: UserProject[] = JSON.parse(localStorage.getItem(KEYS.projects) || '[]');
    return all
      .filter((p) => p.user_id === user.id)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async createProject(input: CreateProjectInput): Promise<UserProject> {
    const overall = calculateOverallProgress(input.part_progress);
    const initialStatus: ProjectStatus =
      overall === 100 ? 'Completed' : input.status || 'In Progress';

    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<UserProject>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          overall_completion: overall,
          status: initialStatus,
        }),
      });
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const created: UserProject = {
      id: crypto.randomUUID(),
      user_id: user.id,
      pattern_id: input.pattern_id,
      project_name: input.project_name.trim(),
      target_yarn: input.target_yarn,
      target_hook: input.target_hook,
      target_eye_size: input.target_eye_size,
      part_progress: input.part_progress,
      overall_completion: overall,
      status: initialStatus,
      personal_notes: input.personal_notes || '',
      updated_at: new Date().toISOString(),
    };

    const all: UserProject[] = JSON.parse(localStorage.getItem(KEYS.projects) || '[]');
    all.unshift(created);
    localStorage.setItem(KEYS.projects, JSON.stringify(all));
    return created;
  },

  async updateProject(id: string, updates: UpdateProjectInput): Promise<UserProject> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<UserProject>(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const all: UserProject[] = JSON.parse(localStorage.getItem(KEYS.projects) || '[]');
    const idx = all.findIndex((p) => p.id === id && p.user_id === user.id);
    if (idx === -1) throw new Error('Project not found');

    const next: UserProject = {
      ...all[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    all[idx] = next;
    localStorage.setItem(KEYS.projects, JSON.stringify(all));
    return next;
  },

  async deleteProject(id: string): Promise<void> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      await apiFetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const all: UserProject[] = JSON.parse(localStorage.getItem(KEYS.projects) || '[]');
    const filtered = all.filter((p) => !(p.id === id && p.user_id === user.id));
    localStorage.setItem(KEYS.projects, JSON.stringify(filtered));
  },

  // --- COMMUNITY GALLERY ---

  async getGalleryPosts(options?: {
    patternId?: string;
    sort?: 'newest' | 'popular';
  }): Promise<CommunityPost[]> {
    const patternId = options?.patternId || 'all';
    const sort = options?.sort === 'popular' ? 'popular' : 'newest';

    const mode = await this.init();
    if (mode === 'replit-pg') {
      const params = new URLSearchParams();
      if (patternId && patternId !== 'all') params.set('pattern_id', patternId);
      params.set('sort', sort);
      return apiFetch<CommunityPost[]>(`/api/gallery?${params.toString()}`);
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    const likesMap: Record<string, string[]> = JSON.parse(
      localStorage.getItem(KEYS.postLikes) || '{}'
    );
    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');

    const hydrated = posts.map((post) => {
      const likers = likesMap[post.id] || [];
      const likedByMe = user ? likers.includes(user.id) : false;
      const pattern = post.pattern_id
        ? SEED_PATTERNS.find((p) => p.id === post.pattern_id)
        : undefined;
      return {
        ...post,
        pattern_title: post.pattern_title ?? pattern?.title ?? null,
        liked_by_me: likedByMe,
      };
    });

    const filtered = hydrated.filter((post) => {
      if (patternId === 'custom') return !post.pattern_id;
      if (patternId && patternId !== 'all') return post.pattern_id === patternId;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'popular') {
        if (b.like_count !== a.like_count) return b.like_count - a.like_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async createGalleryPost(input: CreateGalleryPostInput): Promise<CommunityPost> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<CommunityPost>('/api/gallery', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const pattern = input.pattern_id
      ? SEED_PATTERNS.find((p) => p.id === input.pattern_id)
      : undefined;

    const created: CommunityPost = {
      id: crypto.randomUUID(),
      user_id: user.id,
      username: user.username,
      pattern_id: input.pattern_id,
      pattern_title: pattern?.title ?? null,
      custom_pattern_name: input.custom_pattern_name,
      photo_data_url: input.photo_data_url,
      caption: input.caption,
      yarn_used: input.yarn_used,
      hook_used: input.hook_used,
      like_count: 0,
      liked_by_me: false,
      comments: [],
      created_at: new Date().toISOString(),
    };

    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');
    posts.unshift(created);
    localStorage.setItem(KEYS.gallery, JSON.stringify(posts));
    return created;
  },

  async deleteGalleryPost(postId: string): Promise<void> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      await apiFetch(`/api/gallery/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      return;
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');
    localStorage.setItem(
      KEYS.gallery,
      JSON.stringify(posts.filter((p) => !(p.id === postId && p.user_id === user.id)))
    );
  },

  async togglePostLike(postId: string): Promise<{ liked: boolean; like_count: number }> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<{ liked: boolean; like_count: number }>(
        `/api/gallery/${encodeURIComponent(postId)}/like`,
        { method: 'POST' }
      );
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');
    const likesMap: Record<string, string[]> = JSON.parse(
      localStorage.getItem(KEYS.postLikes) || '{}'
    );

    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) throw new Error('Post not found');

    const likers = new Set(likesMap[postId] || []);
    let liked = false;
    if (likers.has(user.id)) {
      likers.delete(user.id);
      posts[postIdx].like_count = Math.max(0, posts[postIdx].like_count - 1);
      liked = false;
    } else {
      likers.add(user.id);
      posts[postIdx].like_count += 1;
      liked = true;
    }

    likesMap[postId] = Array.from(likers);
    localStorage.setItem(KEYS.postLikes, JSON.stringify(likesMap));
    localStorage.setItem(KEYS.gallery, JSON.stringify(posts));
    return { liked, like_count: posts[postIdx].like_count };
  },

  async addPostComment(postId: string, body: string): Promise<PostComment> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      return apiFetch<PostComment>(`/api/gallery/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) throw new Error('Post not found');

    const comment: PostComment = {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      username: user.username,
      body: body.trim(),
      created_at: new Date().toISOString(),
    };

    posts[postIdx].comments = [...(posts[postIdx].comments || []), comment];
    localStorage.setItem(KEYS.gallery, JSON.stringify(posts));
    return comment;
  },

  async deletePostComment(postId: string, commentId: string): Promise<void> {
    const mode = await this.init();
    if (mode === 'replit-pg') {
      await apiFetch(
        `/api/gallery/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE' }
      );
      return;
    }

    ensureLocalSeedData();
    const user = getLocalSessionUser();
    if (!user) throw new Error('Authentication required');

    const posts: CommunityPost[] = JSON.parse(localStorage.getItem(KEYS.gallery) || '[]');
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) return;

    posts[postIdx].comments = (posts[postIdx].comments || []).filter(
      (c) => !(c.id === commentId && c.user_id === user.id)
    );
    localStorage.setItem(KEYS.gallery, JSON.stringify(posts));
  },
};
