import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
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
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

interface AuthenticatedRequest extends Request {
  userId?: string;
}

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

async function requireDb(_req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isDatabaseConfigured || !pool) {
    res.status(503).json({ ok: false, error: 'Database not configured' });
    return;
  }
  next();
}

export async function requireAuth(
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
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.json({ user: null });
    return;
  }

  const userId = await verifySessionToken(token);
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
