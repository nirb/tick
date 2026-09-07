import { Hono } from 'hono';
import { Bindings, JWTPayload, UserRole } from '../types';
import { signJWT, authMiddleware, base64UrlDecode } from '../auth';
import { hashPassword, verifyPassword } from '../password';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserName,
  createGroup,
  getGroupByInviteCode,
  getGroupById,
  getUserGroups,
  addUserToGroup,
  setUserActiveGroup,
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
      return c.json({ error: 'Invalid invite code' }, 400);
    }
  } else {
    const groupName = body.groupName?.trim() || `${body.name.trim()}'s Group`;
    group = await createGroup(c.env.DB, groupName);
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
  const groups = await getUserGroups(c.env.DB, newUser.id);

  return c.json(
    {
      success: true,
      token,
      user: safeUser,
      group,
      groups,
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
    if (body.password.length >= 6) {
      const passwordHash = await hashPassword(body.password);
      await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(passwordHash, user.id)
        .run();
    } else {
      return c.json({ error: 'Please enter a password of at least 6 characters to set your account password.' }, 400);
    }
  } else {
    const isValid = await verifyPassword(body.password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
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
  const groups = await getUserGroups(c.env.DB, user.id);

  return c.json({
    success: true,
    token,
    user: safeUser,
    group,
    groups,
  });
});

// In-memory cache for Google public JWKS keys in Cloudflare Worker
let cachedGoogleJwks: { keys: any[]; fetchedAt: number } | null = null;

async function getGoogleJwks(): Promise<any[]> {
  const now = Date.now();
  if (cachedGoogleJwks && now - cachedGoogleJwks.fetchedAt < 1000 * 60 * 60) {
    return cachedGoogleJwks.keys;
  }
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      headers: { 'User-Agent': 'Tick-Worker-Auth' },
    });
    if (res.ok) {
      const data = (await res.json()) as { keys: any[] };
      if (Array.isArray(data?.keys) && data.keys.length > 0) {
        cachedGoogleJwks = { keys: data.keys, fetchedAt: now };
        return data.keys;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Google JWKS certificates:', err);
  }
  return cachedGoogleJwks?.keys || [];
}

interface GoogleTokenPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string | number;
}

// 3. Google / Gmail Sign-In (FR-AUTH-2) - Cryptographically verified with Google Identity Services
authRoutes.post('/google', async (c) => {
  const body = await c.req.json<{
    credential?: string;
    inviteCode?: string;
  }>();

  if (!body.credential || !body.credential.trim()) {
    return c.json({ error: 'Google credential token is required' }, 400);
  }

  const idToken = body.credential.trim();
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return c.json({ error: 'Malformed Google credential token' }, 400);
  }

  // 1. Decode Header & Payload
  let header: { alg?: string; kid?: string } | null = null;
  let payload: GoogleTokenPayload | null = null;
  try {
    const headerBytes = base64UrlDecode(parts[0]);
    header = JSON.parse(new TextDecoder().decode(headerBytes));
    const payloadBytes = base64UrlDecode(parts[1]);
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return c.json({ error: 'Invalid Google credential token encoding' }, 400);
  }

  if (!payload || !payload.email) {
    return c.json({ error: 'Google credential missing account email' }, 400);
  }

  // 2. Cryptographic signature check via Google JWKS or tokeninfo
  let signatureVerified = false;
  try {
    const jwks = await getGoogleJwks();
    const matchingKey = jwks.find((k) => k.kid === header?.kid);
    if (matchingKey) {
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        matchingKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
      const signature = base64UrlDecode(parts[2]);
      const dataToVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      signatureVerified = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        signature,
        dataToVerify
      );
    }
  } catch (jwksErr) {
    console.warn('JWKS verification error, falling back to tokeninfo:', jwksErr);
  }

  // Fallback to tokeninfo if local JWKS didn't verify
  if (!signatureVerified) {
    try {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      if (googleRes.ok) {
        const tokeninfoData = (await googleRes.json()) as GoogleTokenPayload;
        if (tokeninfoData?.email) {
          payload = tokeninfoData;
          signatureVerified = true;
        }
      } else {
        const errText = await googleRes.text();
        console.warn('Google tokeninfo verification failed:', errText);
      }
    } catch (err) {
      console.error('Failed to communicate with Google tokeninfo:', err);
    }
  }

  if (!signatureVerified) {
    return c.json({ error: 'Invalid or expired Google authentication credential' }, 401);
  }

  // 3. Verify standard claims
  const isEmailVerified = payload.email_verified === 'true' || payload.email_verified === true;
  if (!payload.email || !isEmailVerified) {
    return c.json({ error: 'Google account email is not verified' }, 400);
  }

  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss.trim())) {
    return c.json({ error: 'Invalid Google token issuer' }, 401);
  }

  // Verify audience if GOOGLE_CLIENT_ID is configured
  if (c.env.GOOGLE_CLIENT_ID) {
    const expected = c.env.GOOGLE_CLIENT_ID.trim();
    const tokenAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const matchesAud = tokenAud.some((a) => typeof a === 'string' && a.trim() === expected);
    const matchesAzp = typeof payload.azp === 'string' && payload.azp.trim() === expected;

    if (!matchesAud && !matchesAzp) {
      console.warn('Google client ID mismatch:', { expected, aud: payload.aud, azp: payload.azp });
      return c.json({ error: 'Google credential was issued for a different client ID' }, 401);
    }
  }

  // Verify expiration (with 60-second clock skew tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && Number(payload.exp) < now - 60) {
    return c.json({ error: 'Google credential has expired' }, 401);
  }

  const email = payload.email.toLowerCase().trim();
  const userName = payload.name?.trim() || email.split('@')[0];
  const avatarUrl = payload.picture || null;

  let user = await getUserByEmail(c.env.DB, email);
  let group = null;

  if (user) {
    group = await getGroupById(c.env.DB, user.group_id);
    if (!group) {
      const existingGroups = await getUserGroups(c.env.DB, user.id);
      if (existingGroups.length > 0) {
        group = await getGroupById(c.env.DB, existingGroups[0].group_id);
        if (group) {
          await setUserActiveGroup(c.env.DB, user.id, group.id, existingGroups[0].role);
          user.group_id = group.id;
          user.role = existingGroups[0].role;
        }
      }
      if (!group) {
        // Ensure user always has a valid group
        group = await createGroup(c.env.DB, `${userName}'s Group`);
        await addUserToGroup(c.env.DB, user.id, group.id, 'admin');
        await setUserActiveGroup(c.env.DB, user.id, group.id, 'admin');
        user.group_id = group.id;
        user.role = 'admin';
      }
    }

    if (body.inviteCode && body.inviteCode.trim()) {
      const inviteGroup = await getGroupByInviteCode(c.env.DB, body.inviteCode.trim().toUpperCase());
      if (inviteGroup && inviteGroup.id !== group?.id) {
        await addUserToGroup(c.env.DB, user.id, inviteGroup.id, 'member');
        await setUserActiveGroup(c.env.DB, user.id, inviteGroup.id, 'member');
        group = inviteGroup;
        user.group_id = inviteGroup.id;
        user.role = 'member';
      }
    }

    // Update avatar if provided and not yet set
    if (!user.avatar_url && avatarUrl) {
      await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
        .bind(avatarUrl, user.id)
        .run();
      user.avatar_url = avatarUrl;
    }

    // Update auth provider to google if needed
    if (user.auth_provider !== 'google') {
      await c.env.DB.prepare('UPDATE users SET auth_provider = ? WHERE id = ?')
        .bind('google', user.id)
        .run();
      user.auth_provider = 'google';
    }
  } else {
    // New registration via verified Google account
    let role: UserRole = 'member';

    if (body.inviteCode && body.inviteCode.trim()) {
      group = await getGroupByInviteCode(c.env.DB, body.inviteCode.trim().toUpperCase());
      if (!group) {
        return c.json({ error: 'Invalid invite code' }, 400);
      }
    } else {
      group = await createGroup(c.env.DB, `${userName}'s Group`);
      role = 'admin';
    }

    user = await createUser(c.env.DB, {
      groupId: group.id,
      name: userName,
      email,
      role,
      avatarUrl,
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
  const groups = await getUserGroups(c.env.DB, user.id);

  return c.json({
    success: true,
    token,
    user: safeUser,
    group,
    groups,
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
  const groups = await getUserGroups(c.env.DB, user.id);
  const { password_hash, ...safeUser } = user;

  return c.json({ user: safeUser, group, groups });
});

// 5. Update Current User Profile (e.g. name)
authRoutes.patch('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{ name?: string }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const updatedUser = await updateUserName(c.env.DB, jwtUser.sub, body.name.trim());
  if (!updatedUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Refreshed JWT with new name
  const token = await signJWT(
    {
      sub: updatedUser.id,
      groupId: updatedUser.group_id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    },
    c.env.JWT_SECRET
  );

  setAuthCookie(c, token);

  const { password_hash, ...safeUser } = updatedUser;
  return c.json({
    success: true,
    user: safeUser,
    token,
  });
});

// 6. Logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'tick_token=; HttpOnly; Path=/; Max-Age=0');
  return c.json({ success: true });
});
