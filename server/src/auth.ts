import { Context, Next } from 'hono';
import { Bindings, JWTPayload } from './types';

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

function base64UrlDecode(str: string): Uint8Array {
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

  return null;
}

export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: { user: JWTPayload } }>, next: Next) {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized: missing token' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Unauthorized: invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
}
