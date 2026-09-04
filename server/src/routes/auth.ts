import { Hono } from 'hono';
import { Bindings, JWTPayload, UserRole } from '../types';
import { signJWT, authMiddleware } from '../auth';
import { hashPassword, verifyPassword } from '../password';
import {
  createUser,
  getUserByEmail,
  getUserById,
  createGroup,
  getGroupByInviteCode,
  getGroupById,
} from '../db/queries';

export const authRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

// Helper to set session cookie
function setAuthCookie(c: any, token: string) {
  const isSecure = c.req.url.startsWith('https://');
  c.header(
    'Set-Cookie',
    `tick_token=${token}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
}

// Helper to parse Google ID token (JWT) safely
function decodeGoogleIdToken(token: string): { email: string; name?: string; picture?: string; sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// 1. Email & Password Registration (FR-AUTH-1)
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{
    email: string;
    password: string;
    name: string;
    groupName?: string;
    inviteCode?: string;
  }>();

  if (!body.email || !body.password || !body.name) {
    return c.json({ error: 'Name, email, and password are required' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  if (!email.includes('@') || !email.includes('.')) {
    return c.json({ error: 'Please provide a valid email address' }, 400);
  }

  if (body.password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters long' }, 400);
  }

  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 400);
  }

  const passwordHash = await hashPassword(body.password);
  let group = null;
  let role: UserRole = 'member';

  if (body.inviteCode && body.inviteCode.trim()) {
    group = await getGroupByInviteCode(c.env.DB, body.inviteCode.trim().toUpperCase());
    if (!group) {
      return c.json({ error: 'Invalid family invite code' }, 400);
    }
  } else {
    const householdName = body.groupName?.trim() || `${body.name.trim()}'s Family`;
    group = await createGroup(c.env.DB, householdName);
    role = 'admin';
  }

  const newUser = await createUser(c.env.DB, {
    groupId: group.id,
    name: body.name.trim(),
    email,
    role,
    passwordHash,
    authProvider: 'email',
  });

  const token = await signJWT(
    {
      sub: newUser.id,
      groupId: newUser.group_id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    c.env.JWT_SECRET
  );

  setAuthCookie(c, token);

  // Return user without password_hash
  const { password_hash, ...safeUser } = newUser;

  return c.json(
    {
      success: true,
      token,
      user: safeUser,
      group,
    },
    201
  );
});

// 2. Email & Password Login (FR-AUTH-1)
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{
    email: string;
    password: string;
  }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const user = await getUserByEmail(c.env.DB, email);

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  if (!user.password_hash) {
    if (user.auth_provider === 'google') {
      return c.json({ error: 'This account is linked to Google Sign-In. Please sign in with Google.' }, 400);
    }
    return c.json({ error: 'No password set for this account.' }, 400);
  }

  const isValid = await verifyPassword(body.password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const group = await getGroupById(c.env.DB, user.group_id);

  const token = await signJWT(
    {
      sub: user.id,
      groupId: user.group_id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    c.env.JWT_SECRET
  );

  setAuthCookie(c, token);

  const { password_hash, ...safeUser } = user;

  return c.json({
    success: true,
    token,
    user: safeUser,
    group,
  });
});

// 3. Google / Gmail Sign-In (FR-AUTH-2)
authRoutes.post('/google', async (c) => {
  const body = await c.req.json<{
    credential?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    inviteCode?: string;
  }>();

  let email = body.email;
  let name = body.name;
  let avatarUrl = body.avatarUrl;

  // If client provided a Google JWT credential (from Google Identity Services)
  if (body.credential) {
    const payload = decodeGoogleIdToken(body.credential);
    if (!payload || !payload.email) {
      return c.json({ error: 'Invalid Google credential token' }, 400);
    }
    email = payload.email;
    name = payload.name || name;
    avatarUrl = payload.picture || avatarUrl;
  }

  if (!email) {
    return c.json({ error: 'Google email is required' }, 400);
  }

  email = email.toLowerCase().trim();
  let user = await getUserByEmail(c.env.DB, email);
  let group = null;

  if (user) {
    group = await getGroupById(c.env.DB, user.group_id);
  } else {
    // New registration via Google
    const userName = name?.trim() || email.split('@')[0];
    let role: UserRole = 'member';

    if (body.inviteCode && body.inviteCode.trim()) {
      group = await getGroupByInviteCode(c.env.DB, body.inviteCode.trim().toUpperCase());
      if (!group) {
        return c.json({ error: 'Invalid family invite code' }, 400);
      }
    } else {
      group = await createGroup(c.env.DB, `${userName}'s Family`);
      role = 'admin';
    }

    user = await createUser(c.env.DB, {
      groupId: group.id,
      name: userName,
      email,
      role,
      avatarUrl: avatarUrl || null,
      authProvider: 'google',
    });
  }

  const token = await signJWT(
    {
      sub: user.id,
      groupId: user.group_id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    c.env.JWT_SECRET
  );

  setAuthCookie(c, token);

  const { password_hash, ...safeUser } = user;

  return c.json({
    success: true,
    token,
    user: safeUser,
    group,
  });
});

// 4. Get Current User Profile
authRoutes.get('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user');
  const user = await getUserById(c.env.DB, jwtUser.sub);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const group = await getGroupById(c.env.DB, user.group_id);
  const { password_hash, ...safeUser } = user;

  return c.json({ user: safeUser, group });
});

// 5. Logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'tick_token=; HttpOnly; Path=/; Max-Age=0');
  return c.json({ success: true });
});
