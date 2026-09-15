import { Hono } from 'hono';
import { Bindings, JWTPayload, User } from '../types';
import { authMiddleware, signJWT, setAuthCookie } from '../auth';
import {
  createGroup,
  getGroupById,
  getGroupMembers,
  regenerateInviteCode,
  getGroupByInviteCode,
  updateGroupName,
  getUserGroups,
  getAllUserGroupsMembers,
  addUserToGroup,
  getUserGroupMembership,
  setUserActiveGroup,
  leaveGroup,
} from '../db/queries';

export const groupRoutes = new Hono<{
  Bindings: Bindings;
  Variables: { user: JWTPayload };
}>();

groupRoutes.use('*', authMiddleware);

// GET /api/groups - List all groups user belongs to
groupRoutes.get('/', async (c) => {
  const jwtUser = c.get('user');
  const groups = await getUserGroups(c.env.DB, jwtUser.sub);
  return c.json({ groups });
});

// GET /api/groups/all-members - Lists members across all user groups
groupRoutes.get('/all-members', async (c) => {
  const jwtUser = c.get('user');
  const members = await getAllUserGroupsMembers(c.env.DB, jwtUser.sub);
  return c.json({ members });
});

// GET /api/groups/me - Fetches active user group, members, and all user groups
groupRoutes.get('/me', async (c) => {
  const jwtUser = c.get('user');
  const group = await getGroupById(c.env.DB, jwtUser.groupId);
  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  const members = await getGroupMembers(c.env.DB, jwtUser.groupId);
  const groups = await getUserGroups(c.env.DB, jwtUser.sub);
  return c.json({
    group,
    members,
    groups,
  });
});

// POST /api/groups - Create a new group & make user Admin
groupRoutes.post('/', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{ name: string }>();

  if (!body.name || !body.name.trim()) {
    return c.json({ error: 'Group name is required' }, 400);
  }

  const newGroup = await createGroup(c.env.DB, body.name.trim());
  await addUserToGroup(c.env.DB, jwtUser.sub, newGroup.id, 'admin');
  await setUserActiveGroup(c.env.DB, jwtUser.sub, newGroup.id, 'admin');

  const newToken = await signJWT(
    {
      sub: jwtUser.sub,
      groupId: newGroup.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role: 'admin',
    },
    c.env.JWT_SECRET
  );
  setAuthCookie(c, newToken);

  const members = await getGroupMembers(c.env.DB, newGroup.id);
  const groups = await getUserGroups(c.env.DB, jwtUser.sub);

  return c.json(
    {
      success: true,
      token: newToken,
      group: newGroup,
      members,
      groups,
    },
    201
  );
});

// POST /api/groups/switch - Switch active group
groupRoutes.post('/switch', async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json<{ groupId: string }>();

  if (!body.groupId) {
    return c.json({ error: 'groupId is required' }, 400);
  }

  const membership = await getUserGroupMembership(c.env.DB, jwtUser.sub, body.groupId);
  if (!membership) {
    return c.json({ error: 'You are not a member of this group' }, 403);
  }

  const targetGroup = await getGroupById(c.env.DB, body.groupId);
  if (!targetGroup) {
    return c.json({ error: 'Group not found' }, 404);
  }

  await setUserActiveGroup(c.env.DB, jwtUser.sub, targetGroup.id, membership.role);

  const newToken = await signJWT(
    {
      sub: jwtUser.sub,
      groupId: targetGroup.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role: membership.role,
    },
    c.env.JWT_SECRET
  );
  setAuthCookie(c, newToken);

  const members = await getGroupMembers(c.env.DB, targetGroup.id);
  const groups = await getUserGroups(c.env.DB, jwtUser.sub);

  return c.json({
    success: true,
    token: newToken,
    group: targetGroup,
    members,
    groups,
  });
});

// POST /api/groups/join - Join a different group using invite code & switch to it
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

  const existing = await getUserGroupMembership(c.env.DB, jwtUser.sub, targetGroup.id);
  const role = existing ? existing.role : 'member';

  await addUserToGroup(c.env.DB, jwtUser.sub, targetGroup.id, role);
  await setUserActiveGroup(c.env.DB, jwtUser.sub, targetGroup.id, role);

  const newToken = await signJWT(
    {
      sub: jwtUser.sub,
      groupId: targetGroup.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role,
    },
    c.env.JWT_SECRET
  );
  setAuthCookie(c, newToken);

  const members = await getGroupMembers(c.env.DB, targetGroup.id);
  const groups = await getUserGroups(c.env.DB, jwtUser.sub);

  return c.json({
    success: true,
    token: newToken,
    group: targetGroup,
    members,
    groups,
  });
});

// POST /api/groups/:id/leave - Leave a group
groupRoutes.post('/:id/leave', async (c) => {
  const jwtUser = c.get('user');
  const groupId = c.req.param('id');

  const groups = await getUserGroups(c.env.DB, jwtUser.sub);
  if (groups.length <= 1) {
    return c.json({ error: 'You cannot leave your only group. Create or join another group first.' }, 400);
  }

  const res = await leaveGroup(c.env.DB, jwtUser.sub, groupId);

  let newToken = null;
  let members: User[] = [];
  if (res.newActiveGroup) {
    const newRole = res.remainingGroups[0]?.role || 'member';
    newToken = await signJWT(
      {
        sub: jwtUser.sub,
        groupId: res.newActiveGroup.id,
        email: jwtUser.email,
        name: jwtUser.name,
        role: newRole,
      },
      c.env.JWT_SECRET
    );
    setAuthCookie(c, newToken);
    members = await getGroupMembers(c.env.DB, res.newActiveGroup.id);
  }

  return c.json({
    success: true,
    token: newToken,
    group: res.newActiveGroup,
    groups: res.remainingGroups,
    members,
  });
});

// PATCH /api/groups/me - Admin renames the active group
groupRoutes.patch('/me', async (c) => {
  const jwtUser = c.get('user');
  if (jwtUser.role !== 'admin') {
    return c.json({ error: 'Only admins can rename the group' }, 403);
  }

  const body = await c.req.json<{ name: string }>();
  if (!body.name || !body.name.trim()) {
    return c.json({ error: 'Group name is required' }, 400);
  }

  const updatedGroup = await updateGroupName(c.env.DB, jwtUser.groupId, body.name.trim());
  if (!updatedGroup) {
    return c.json({ error: 'Group not found' }, 404);
  }

  return c.json({ success: true, group: updatedGroup });
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

