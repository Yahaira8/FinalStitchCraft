import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { SignJWT, decodeProtectedHeader, importX509, jwtVerify } from 'jose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, isDatabaseConfigured, pool } from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SESSION_COOKIE = 'stitchcraft_session';
const fallbackSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = new TextEncoder().encode(process.env.SESSION_SECRET || fallbackSecret);

app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const VALID_STATUSES = new Set(['Planning', 'In Progress', 'Completed', 'Frogged']);

async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret);
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    partitioned: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function verifyMutationOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const hasCustomHeader = req.headers['x-requested-with'] === 'XMLHttpRequest';

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      res.status(403).json({ error: 'Invalid request origin' });
      return;
    }
  }

  if (hasCustomHeader && !origin) {
    next();
    return;
  }

  if (!origin && !hasCustomHeader) {
    next();
    return;
  }

  res.status(403).json({ error: 'Origin mismatch' });
}

app.use('/api', verifyMutationOrigin);

function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (!isDatabaseConfigured || !pool) {
    res.status(503).json({ ok: false, error: 'Database not configured' });
    return;
  }
  next();
}

async function optionalUserId(req: Request): Promise<string | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  return verifySessionToken(token);
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const userId = await verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  req.userId = userId;
  next();
}

app.get('/api/health', async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured || !pool) {
    res.json({ ok: false, mode: 'aistudio-local' });
    return;
  }
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, mode: 'replit-pg' });
  } catch {
    res.json({ ok: false, mode: 'aistudio-local' });
  }
});

// --- AUTH ROUTES ---

app.post('/api/auth/register', requireDb, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !email.includes('@') || username.length < 2 || username.length > 50 || password.length < 6) {
    res.status(400).json({ error: 'Valid email, username (2-50 chars), and password (6+ chars) required' });
    return;
  }

  try {
    const existing = await pool!.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool!.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, avatar_url, created_at`,
      [email, username, passwordHash]
    );

    const user = rows[0];
    const token = await signSessionToken(user.id);
    setSessionCookie(req, res, token);
    res.status(201).json({ user });
  } catch (err) {
    console.error('[Auth Register]', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

interface GoogleVerifiedIdentity {
  email: string;
  username: string;
  avatarUrl: string | null;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedGoogleCerts: Record<string, string> | null = null;
let googleCertsExpiresAt = 0;

function getFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  try {
    const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { projectId?: string };
      if (typeof parsed.projectId === 'string' && parsed.projectId.trim()) {
        return parsed.projectId.trim();
      }
    }
  } catch {
    // Ignore missing or unreadable firebase-applet-config.json
  }
  return null;
}

async function getGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedGoogleCerts && now < googleCertsExpiresAt) {
    return cachedGoogleCerts;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Google public certificates');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  const certs = (await response.json()) as Record<string, string>;
  cachedGoogleCerts = certs;
  googleCertsExpiresAt = now + Math.max(60, maxAgeSeconds) * 1000;
  return certs;
}

async function verifyFirebaseIdToken(idToken: string): Promise<GoogleVerifiedIdentity> {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project ID is not configured on the server');
  }

  const header = decodeProtectedHeader(idToken);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Invalid token header');
  }

  let certs = await getGooglePublicCerts(false);
  let pem = certs[header.kid];
  if (!pem) {
    certs = await getGooglePublicCerts(true);
    pem = certs[header.kid];
  }
  if (!pem) {
    throw new Error('Unknown signing certificate');
  }

  const publicKey = await importX509(pem, 'RS256');
  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Invalid token subject');
  }
  if (typeof payload.email !== 'string' || !payload.email.includes('@')) {
    throw new Error('Google account email is missing');
  }
  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  const email = payload.email.trim().toLowerCase();
  const rawName = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name.trim()
    : email.split('@')[0] || 'Crafter';

  return {
    email,
    username: rawName.slice(0, 50),
    avatarUrl: typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null,
  };
}

app.post('/api/auth/login', requireDb, async (req: Request, res: Response) => {
  const isDemo = req.body?.demo === true;

  try {
    if (isDemo) {
      let { rows } = await pool!.query(
        'SELECT id, email, username, avatar_url, created_at FROM users WHERE email = $1',
        ['demo@stitchcraft.local']
      );
      if (rows.length === 0) {
        const inserted = await pool!.query(
          `INSERT INTO users (email, username, password_hash)
           VALUES ('demo@stitchcraft.local', 'CozyCrafter', '$2a$10$demoHashPlaceholderForLocalSelfContainedAuth000000000000')
           RETURNING id, email, username, avatar_url, created_at`
        );
        rows = inserted.rows;
      }
      const user = rows[0];
      const token = await signSessionToken(user.id);
      setSessionCookie(req, res, token);
      res.json({ user });
      return;
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { rows } = await pool!.query(
      'SELECT id, email, username, password_hash, avatar_url, created_at FROM users WHERE email = $1',
      [email]
    );

    const found = rows[0];
    if (!found) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!found.password_hash || found.password_hash.startsWith('!')) {
      res.status(401).json({ error: 'Please sign in with Google for this account' });
      return;
    }

    const valid = await bcrypt.compare(password, found.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = {
      id: found.id,
      email: found.email,
      username: found.username,
      avatar_url: found.avatar_url,
      created_at: found.created_at,
    };

    const token = await signSessionToken(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (err) {
    console.error('[Auth Login]', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/google', requireDb, async (req: Request, res: Response) => {
  const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
  if (!idToken || idToken.length < 20) {
    res.status(400).json({ error: 'Valid Google ID token is required' });
    return;
  }

  let verified: GoogleVerifiedIdentity;
  try {
    verified = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    console.error('[Auth Google Verify]', err);
    res.status(401).json({ error: 'Invalid or expired Google sign-in token' });
    return;
  }

  try {
    const existing = await pool!.query(
      'SELECT id, email, username, avatar_url, created_at FROM users WHERE email = $1',
      [verified.email]
    );

    let user = existing.rows[0];
    if (!user) {
      const inserted = await pool!.query(
        `INSERT INTO users (email, username, password_hash, avatar_url)
         VALUES ($1, $2, '!google-oauth-only!', $3)
         RETURNING id, email, username, avatar_url, created_at`,
        [verified.email, verified.username, verified.avatarUrl]
      );
      user = inserted.rows[0];
    } else if (verified.avatarUrl && !user.avatar_url) {
      const updated = await pool!.query(
        `UPDATE users
         SET avatar_url = $2
         WHERE id = $1
         RETURNING id, email, username, avatar_url, created_at`,
        [user.id, verified.avatarUrl]
      );
      user = updated.rows[0];
    }

    const token = await signSessionToken(user.id);
    setSessionCookie(req, res, token);
    res.json({ user });
  } catch (err) {
    console.error('[Auth Google]', err);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    partitioned: isHttps,
    path: '/',
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireDb, async (req: Request, res: Response) => {
  const userId = await optionalUserId(req);
  if (!userId) {
    res.json({ user: null });
    return;
  }

  try {
    const { rows } = await pool!.query(
      'SELECT id, email, username, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    );
    res.json({ user: rows[0] ?? null });
  } catch {
    res.json({ user: null });
  }
});

// --- PATTERNS ROUTES ---

app.get('/api/patterns', requireDb, async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

  const conditions: string[] = [];
  const params: string[] = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }
  if (category && category !== 'All') {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool!.query(
      `SELECT id, title, difficulty, yarn_weight, recommended_hook, recommended_eye_size, category, instructions, video_url, image_urls, created_at
       FROM patterns
       ${whereClause}
       ORDER BY created_at ASC, title ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/patterns]', err);
    res.status(500).json({ error: 'Failed to load patterns' });
  }
});

app.get('/api/patterns/:id', requireDb, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool!.query(
      `SELECT id, title, difficulty, yarn_weight, recommended_hook, recommended_eye_size, category, instructions, video_url, image_urls, created_at
       FROM patterns WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Pattern not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/patterns/:id]', err);
    res.status(400).json({ error: 'Invalid pattern ID' });
  }
});

// --- FAVORITES ROUTES ---

app.get('/api/favorites', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await pool!.query<{ pattern_id: string }>(
      'SELECT pattern_id FROM user_favorites WHERE user_id = $1',
      [req.userId]
    );
    res.json(rows.map((r) => r.pattern_id));
  } catch (err) {
    console.error('[GET /api/favorites]', err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

app.post('/api/favorites', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const patternId = typeof req.body?.pattern_id === 'string' ? req.body.pattern_id : '';
  if (!patternId) {
    res.status(400).json({ error: 'pattern_id is required' });
    return;
  }

  try {
    const existing = await pool!.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND pattern_id = $2',
      [req.userId, patternId]
    );

    if (existing.rows.length > 0) {
      await pool!.query('DELETE FROM user_favorites WHERE user_id = $1 AND pattern_id = $2', [
        req.userId,
        patternId,
      ]);
      res.json({ favorited: false });
      return;
    }

    await pool!.query(
      'INSERT INTO user_favorites (user_id, pattern_id) VALUES ($1, $2) ON CONFLICT (user_id, pattern_id) DO NOTHING',
      [req.userId, patternId]
    );
    res.json({ favorited: true });
  } catch (err) {
    console.error('[POST /api/favorites]', err);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

// --- PROJECTS CRUD ROUTES ---

app.get('/api/projects', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await pool!.query(
      `SELECT id, user_id, pattern_id, project_name, target_yarn, target_hook, target_eye_size, part_progress, overall_completion, status, personal_notes, updated_at
       FROM user_projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/projects]', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

app.post('/api/projects', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const patternId = typeof req.body?.pattern_id === 'string' && req.body.pattern_id ? req.body.pattern_id : null;
  const projectName = typeof req.body?.project_name === 'string' ? req.body.project_name.trim() : '';
  const targetYarn = typeof req.body?.target_yarn === 'string' ? req.body.target_yarn.trim() : 'Worsted (#4)';
  const targetHook = typeof req.body?.target_hook === 'string' ? req.body.target_hook.trim() : '3.5mm';
  const targetEyeSize = typeof req.body?.target_eye_size === 'string' ? req.body.target_eye_size.trim() : '8mm';
  const partProgress = req.body?.part_progress && typeof req.body.part_progress === 'object' ? req.body.part_progress : {};
  const status = VALID_STATUSES.has(req.body?.status) ? req.body.status : 'In Progress';
  const personalNotes = typeof req.body?.personal_notes === 'string' ? req.body.personal_notes : '';
  const overallCompletion = Number.isFinite(req.body?.overall_completion)
    ? Math.max(0, Math.min(100, Math.round(req.body.overall_completion)))
    : 0;

  if (!projectName || projectName.length > 150) {
    res.status(400).json({ error: 'Project name (1-150 chars) is required' });
    return;
  }

  try {
    const { rows } = await pool!.query(
      `INSERT INTO user_projects (user_id, pattern_id, project_name, target_yarn, target_hook, target_eye_size, part_progress, overall_completion, status, personal_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
       RETURNING *`,
      [
        req.userId,
        patternId,
        projectName,
        targetYarn,
        targetHook,
        targetEyeSize,
        JSON.stringify(partProgress),
        overallCompletion,
        status,
        personalNotes,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/projects]', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const partProgress = req.body?.part_progress;
  const overallCompletion = req.body?.overall_completion;
  const status = req.body?.status;
  const personalNotes = req.body?.personal_notes;

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: 'Invalid project status' });
    return;
  }

  try {
    const existing = await pool!.query(
      'SELECT * FROM user_projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const current = existing.rows[0];
    const nextProgress = partProgress && typeof partProgress === 'object' ? partProgress : current.part_progress;
    const nextCompletion = Number.isFinite(overallCompletion)
      ? Math.max(0, Math.min(100, Math.round(overallCompletion)))
      : current.overall_completion;
    const nextStatus = status ?? current.status;
    const nextNotes = typeof personalNotes === 'string' ? personalNotes : current.personal_notes;

    const { rows } = await pool!.query(
      `UPDATE user_projects
       SET part_progress = $1::jsonb,
           overall_completion = $2,
           status = $3,
           personal_notes = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [JSON.stringify(nextProgress), nextCompletion, nextStatus, nextNotes, req.params.id, req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/projects/:id]', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool!.query(
      'DELETE FROM user_projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/projects/:id]', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// --- COMMUNITY GALLERY ROUTES ---

app.get('/api/gallery', requireDb, async (req: Request, res: Response) => {
  const viewerId = await optionalUserId(req);
  const patternId = typeof req.query.pattern_id === 'string' ? req.query.pattern_id.trim() : '';
  const sort = req.query.sort === 'popular' ? 'popular' : 'newest';

  const conditions: string[] = [];
  const params: string[] = [];

  if (patternId === 'custom') {
    conditions.push('cp.pattern_id IS NULL');
  } else if (patternId && patternId !== 'all') {
    params.push(patternId);
    conditions.push(`cp.pattern_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause =
    sort === 'popular'
      ? 'ORDER BY like_count DESC, cp.created_at DESC'
      : 'ORDER BY cp.created_at DESC';

  try {
    const viewerParamIdx = params.length + 1;
    const queryParams = [...params, viewerId || '00000000-0000-0000-0000-000000000000'];

    const { rows: posts } = await pool!.query(
      `SELECT
        cp.id,
        cp.user_id,
        u.username,
        cp.pattern_id,
        p.title AS pattern_title,
        cp.custom_pattern_name,
        cp.photo_data_url,
        cp.caption,
        cp.yarn_used,
        cp.hook_used,
        cp.created_at,
        COALESCE(l.like_count, 0)::int AS like_count,
        EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = cp.id AND pl2.user_id = $${viewerParamIdx}::uuid) AS liked_by_me
      FROM community_posts cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN patterns p ON p.id = cp.pattern_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS like_count FROM post_likes GROUP BY post_id
      ) l ON l.post_id = cp.id
      ${whereClause}
      ${orderClause}`,
      queryParams
    );

    const postIds = posts.map((p) => p.id);
    const commentsByPost = new Map<string, unknown[]>();
    if (postIds.length > 0) {
      const { rows: commentRows } = await pool!.query(
        `SELECT c.id, c.post_id, c.user_id, u.username, c.body, c.created_at
         FROM post_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ANY($1::uuid[])
         ORDER BY c.created_at ASC`,
        [postIds]
      );
      for (const c of commentRows) {
        const list = commentsByPost.get(c.post_id) || [];
        list.push(c);
        commentsByPost.set(c.post_id, list);
      }
    }

    res.json(
      posts.map((post) => ({
        ...post,
        comments: commentsByPost.get(post.id) || [],
      }))
    );
  } catch (err) {
    console.error('[GET /api/gallery]', err);
    res.status(500).json({ error: 'Failed to load community gallery' });
  }
});

app.post('/api/gallery', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const patternId = typeof req.body?.pattern_id === 'string' && req.body.pattern_id ? req.body.pattern_id : null;
  const customPatternName =
    typeof req.body?.custom_pattern_name === 'string' && req.body.custom_pattern_name.trim()
      ? req.body.custom_pattern_name.trim().slice(0, 150)
      : null;
  const photoDataUrl = typeof req.body?.photo_data_url === 'string' ? req.body.photo_data_url.trim() : '';
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
  const yarnUsed = typeof req.body?.yarn_used === 'string' && req.body.yarn_used.trim()
    ? req.body.yarn_used.trim().slice(0, 80)
    : 'Worsted (#4)';
  const hookUsed = typeof req.body?.hook_used === 'string' && req.body.hook_used.trim()
    ? req.body.hook_used.trim().slice(0, 20)
    : '3.5mm';

  const isSafePhoto =
    photoDataUrl.startsWith('data:image/') || photoDataUrl.startsWith('https://img.youtube.com/');

  if (!isSafePhoto || !caption) {
    res.status(400).json({ error: 'A valid photo and caption are required' });
    return;
  }

  try {
    const { rows } = await pool!.query(
      `INSERT INTO community_posts (user_id, pattern_id, custom_pattern_name, photo_data_url, caption, yarn_used, hook_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, patternId, customPatternName, photoDataUrl, caption, yarnUsed, hookUsed]
    );
    const created = rows[0];
    const userRes = await pool!.query('SELECT username FROM users WHERE id = $1', [req.userId]);
    let patternTitle: string | null = null;
    if (created.pattern_id) {
      const pRes = await pool!.query('SELECT title FROM patterns WHERE id = $1', [created.pattern_id]);
      patternTitle = pRes.rows[0]?.title ?? null;
    }

    res.status(201).json({
      ...created,
      username: userRes.rows[0]?.username || 'Crafter',
      pattern_title: patternTitle,
      like_count: 0,
      liked_by_me: false,
      comments: [],
    });
  } catch (err) {
    console.error('[POST /api/gallery]', err);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

app.delete('/api/gallery/:id', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool!.query(
      'DELETE FROM community_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Post not found or unauthorized' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/gallery/:id]', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

app.post('/api/gallery/:id/like', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const postId = req.params.id;
  try {
    const existing = await pool!.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, req.userId]
    );

    let liked = false;
    if (existing.rows.length > 0) {
      await pool!.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [
        postId,
        req.userId,
      ]);
      liked = false;
    } else {
      await pool!.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING',
        [postId, req.userId]
      );
      liked = true;
    }

    const { rows } = await pool!.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM post_likes WHERE post_id = $1',
      [postId]
    );
    res.json({ liked, like_count: parseInt(rows[0]?.count ?? '0', 10) });
  } catch (err) {
    console.error('[POST /api/gallery/:id/like]', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

app.post('/api/gallery/:id/comments', requireDb, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 500) {
    res.status(400).json({ error: 'Comment text (1-500 chars) is required' });
    return;
  }

  try {
    const { rows } = await pool!.query(
      `INSERT INTO post_comments (post_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, body, created_at`,
      [req.params.id, req.userId, body]
    );
    const userRes = await pool!.query('SELECT username FROM users WHERE id = $1', [req.userId]);
    res.status(201).json({
      ...rows[0],
      username: userRes.rows[0]?.username || 'Crafter',
    });
  } catch (err) {
    console.error('[POST /api/gallery/:id/comments]', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete(
  '/api/gallery/:id/comments/:commentId',
  requireDb,
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool!.query(
        'DELETE FROM post_comments WHERE id = $1 AND post_id = $2 AND user_id = $3 RETURNING id',
        [req.params.commentId, req.params.id, req.userId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Comment not found or unauthorized' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('[DELETE /api/gallery/:id/comments/:commentId]', err);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API route not found' });
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === 'production' ? 5000 : 3001);

initDatabase()
  .catch((err) => {
    console.warn('[StitchCraft] Database initialization skipped or failed:', err.message);
  })
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[StitchCraft] Express server listening on http://0.0.0.0:${PORT}`);
    });
  });
