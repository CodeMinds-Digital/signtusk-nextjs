import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export interface JWTPayload {
  wallet_address: string;
  iat?: number;
  exp?: number;
}

export function signJWT(payload: { wallet_address: string }): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { 
      expiresIn: '24h',
      algorithm: 'HS256'
    }
  );
}

export function verifyJWT(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractWalletFromJWT(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    return payload.wallet_address;
  } catch {
    return null;
  }
}