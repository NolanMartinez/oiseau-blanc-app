import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminPayload } from './auth';

export function requireDelivery(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;
    if (!['SUPER_ADMIN', 'ADMIN', 'LIVREUR'].includes(payload.role)) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
