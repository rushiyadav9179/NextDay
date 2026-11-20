import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const RoleHierarchy: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.HR_ADMIN]: 80,
  [Role.RECRUITER]: 60,
  [Role.MANAGER]: 40,
  [Role.EMPLOYEE]: 20,
  [Role.CANDIDATE]: 10,
};

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized. Authentication required.' });
      return;
    }

    if (req.user.role === Role.SUPER_ADMIN) {
      return next(); // Super admin bypasses role checks
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      error: `Forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      userRole: req.user.role,
    });
  };
}

export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // If using API Key, enforce scopes
    if (req.user.apiKeyId && req.user.scopes) {
      const hasWildcard = req.user.scopes.includes('*');
      const hasSpecific = req.user.scopes.includes(requiredScope);
      const [requiredAction, requiredResource] = requiredScope.split(':');
      const hasResourceWildcard = req.user.scopes.includes(`*:${requiredResource}`) || req.user.scopes.includes(`${requiredAction}:*`);

      if (!hasWildcard && !hasSpecific && !hasResourceWildcard) {
        res.status(403).json({
          error: `API Key missing required scope: "${requiredScope}". Current scopes: ${req.user.scopes.join(', ')}`,
        });
        return;
      }
    }

    next();
  };
}
