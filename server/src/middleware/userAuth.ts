import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface SubscriberRequest extends Request {
  subscriberId: string;
}

export function requireSubscriber(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Authentification requise' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      subscriberId: string;
      type: string;
    };
    if (payload.type !== 'subscriber') throw new Error('Invalid token type');
    (req as SubscriberRequest).subscriberId = payload.subscriberId;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
