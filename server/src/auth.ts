import { Context, Next } from 'hono';
import { Bindings, JWTPayload } from './types';
import { getApiKeyByHash, updateApiKeyLastUsed, getUserById } from './db/queries';

// Base64URL encoding/decoding utilities using standard Web APIs
function base64UrlEncode(buffer: Uint8Array | string): string {
  const bytes = typeof buffer === 'string' ? new TextEncoder().encode(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds: number = 60 * 60 * 24 * 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(dataToSign)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const signature = base64UrlDecode(encodedSignature);

    const key = await getHmacKey(secret);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isValid) return null;

    const decodedPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);

    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null; // Expired
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

export function extractToken(c: Context): string | null {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie: tick_token=<token>
  const cookieHeader = c.req.header('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(s => s.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('tick_token=')) {
        return cookie.substring('tick_token='.length);
      }
    }
  }

  // 3. Check Query parameter: apiKey or token (useful for SSE EventSource)
  const queryToken = c.req.query('apiKey') || c.req.query('token');
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  let randomHex = '';
  for (let i = 0; i < randomBytes.length; i++) {
    randomHex += randomBytes[i].toString(16).padStart(2, '0');
  }
  const key = `tick_live_${randomHex}`;
  const prefix = key.substring(0, 16) + '...';
  return { key, prefix };
}

export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: { user: JWTPayload } }>, next: Next) {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized: missing token' }, 401);
  }

  // 1. Support AI Agent API Keys (e.g., Bearer tick_live_...)
  if (token.startsWith('tick_live_')) {
    const keyHash = await hashApiKey(token);
    const apiKey = await getApiKeyByHash(c.env.DB, keyHash);
    if (!apiKey) {
      return c.json({ error: 'Unauthorized: invalid or revoked API key' }, 401);
    }

    const user = await getUserById(c.env.DB, apiKey.user_id);
    if (!user) {
      return c.json({ error: 'Unauthorized: user not found' }, 401);
    }

    // Update last_used_at timestamp
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(updateApiKeyLastUsed(c.env.DB, apiKey.id));
    } else {
      await updateApiKeyLastUsed(c.env.DB, apiKey.id);
    }

    const userPayload: JWTPayload = {
      sub: user.id,
      groupId: apiKey.group_id || user.group_id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365 * 10,
    };

    c.set('user', userPayload);
    return await next();
  }

  // 2. Support standard user JWT tokens
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Unauthorized: invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
}

export function setAuthCookie(c: Context, token: string) {
  const isSecure = c.req.url.startsWith('https://');
  c.header(
    'Set-Cookie',
    `tick_token=${token}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
}

