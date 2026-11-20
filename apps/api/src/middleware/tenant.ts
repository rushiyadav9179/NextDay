import { Request, Response, NextFunction } from 'express';

export function enforceTenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Tenant ID must come from authenticated context. Never trust a client header.
  const userTenant = req.user?.tenantId;

  if (userTenant) {
    req.tenantId = userTenant;
  } else {
    res.status(401).json({ error: 'Authenticated tenant context is required.' });
    return;
  }

  next();
}
