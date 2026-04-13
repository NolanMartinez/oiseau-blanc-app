import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Accès réservé au super admin' });
    return;
  }
  next();
}
