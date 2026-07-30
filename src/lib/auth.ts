import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // App session expires in 24h, though the DB expiry_date is the real source of truth
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  (await cookies()).set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function getSession() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function clearSession() {
  (await cookies()).delete('auth-token');
}
