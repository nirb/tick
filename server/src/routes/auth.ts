import { Hono } from 'hono';
import { Bindings, JWTPayload, UserRole } from '../types';
import { signJWT, authMiddleware } from '../auth';
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

// 1. Passwordless Magic Link / Quick Sign In
authRoutes.post('/magic-link', async (c) => {
  const body = await c.req.json<{
    email: string;
    name?: string;
    groupName?: string;
    inviteCode?: string;
  }>();

  if (!body.email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  let user = await getUserByEmail(c.env.DB, email);
  let group = null;

  if (user) {
    group = await getGroupById(c.env.DB, user.group_id);
  } else {
    // New user registration
    const userName = body.name || email.split('@')[0];

    if (body.inviteCode) {
      group = await getGroupByInviteCode(c.env.DB, body.inviteCode);
      if (!group) {
        return c.json({ error: 'Invalid invite code' }, 400);
      }
      user = await createUser(c.env.DB, {
        groupId: group.id,
        name: userName,
        email,
        role: 'member',
      });
    } else {
      // Create new Household
      const householdName = body.groupName || `${userName}'s Family`;
      group = await createGroup(c.env.DB, householdName);
      user = await createUser(c.env.DB, {
        groupId: group.id,
        name: userName,
        email,
        role: 'admin',
      });
    }
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

  return c.json({
    success: true,
    token,
    user,
    group,
  });
});

// 2. Demo Login (Instant switch between family members for testing)
authRoutes.post('/demo-login', async (c) => {
  const body = await c.req.json<{ persona?: 'mom' | 'dad' | 'teen' }>();
  const persona = body.persona || 'mom';

  const demoAccounts = {
    mom: { name: 'Sarah (Mom)', email: 'sarah.mom@tickfamily.app', role: 'admin' as UserRole, avatar: '👩' },
    dad: { name: 'Alex (Dad)', email: 'alex.dad@tickfamily.app', role: 'admin' as UserRole, avatar: '👨' },
    teen: { name: 'Leo (Teen)', email: 'leo.teen@tickfamily.app', role: 'member' as UserRole, avatar: '👦' },
  };

  const selected = demoAccounts[persona] || demoAccounts.mom;

  // Check if group exists or create demo group
  let group = await getGroupByInviteCode(c.env.DB, 'TICKFAM');
  if (!group) {
    group = await createGroup(c.env.DB, 'The Miller Household', 'TICKFAM');
  }

  // Ensure all demo users exist in the group
  for (const p of Object.values(demoAccounts)) {
    const existing = await getUserByEmail(c.env.DB, p.email);
    if (!existing) {
      await createUser(c.env.DB, {
        groupId: group.id,
        name: p.name,
        email: p.email,
        role: p.role,
        avatarUrl: p.avatar,
      });
    }
  }

  const currentUser = await getUserByEmail(c.env.DB, selected.email);
  if (!currentUser) {
    return c.json({ error: 'Failed to initialize demo persona' }, 500);
  }

  const token = await signJWT(
    {
      sub: currentUser.id,
      groupId: currentUser.group_id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
    },
    c.env.JWT_SECRET
  );

  setAuthCookie(c, token);

  return c.json({
    success: true,
    token,
    user: currentUser,
    group,
  });
});

// 3. Get Current User Profile
authRoutes.get('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user');
  const user = await getUserById(c.env.DB, jwtUser.sub);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const group = await getGroupById(c.env.DB, user.group_id);
  return c.json({ user, group });
});

// 4. Logout
authRoutes.post('/logout', (c) => {
  c.header('Set-Cookie', 'tick_token=; HttpOnly; Path=/; Max-Age=0');
  return c.json({ success: true });
});
