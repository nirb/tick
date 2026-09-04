import { Hono } from 'hono';
import { Bindings, JWTPayload } from '../types';
import { authMiddleware } from '../auth';
import {
  getGroupById,
  getGroupMembers,
  regenerateInviteCode,
  getGroupByInviteCode,
} from '../db/queries';

export const groupRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

groupRoutes.use('*', authMiddleware);

// GET /api/groups/me - Fetches active user group and members
groupRoutes.get('/me', async (c) => {
  const jwtUser = c.get('user');
  const group = await getGroupById(c.env.DB, jwtUser.groupId);
  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  const members = await getGroupMembers(c.env.DB, jwtUser.groupId);
  return c.json({
    group,
    members,
  });
});

// POST /api/groups/regenerate-invite - Admin regenerates invite code
groupRoutes.post('/regenerate-invite', async (c) => {
  const jwtUser = c.get('user');
  if (jwtUser.role !== 'admin') {
    return c.json({ error: 'Only admins can regenerate the invite code' }, 403);
  }

  const newCode = await regenerateInviteCode(c.env.DB, jwtUser.groupId);
  return c.json({ success: true, invite_code: newCode });
});

// POST /api/groups/join - Join a different group using invite code
groupRoutes.post('/join', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{ inviteCode: string }>();

  if (!body.inviteCode) {
    return c.json({ error: 'Invite code is required' }, 400);
  }

  const targetGroup = await getGroupByInviteCode(c.env.DB, body.inviteCode);
  if (!targetGroup) {
    return c.json({ error: 'Invalid invite code' }, 404);
  }

  // Update user's group_id
  await c.env.DB.prepare('UPDATE users SET group_id = ?, role = "member" WHERE id = ?')
    .bind(targetGroup.id, jwtUser.sub)
    .run();

  const members = await getGroupMembers(c.env.DB, targetGroup.id);
  return c.json({
    success: true,
    group: targetGroup,
    members,
  });
});
