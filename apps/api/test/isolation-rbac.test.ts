import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma, withTenantContext } from '../src/db/prisma.js';
import { requireRole } from '../src/middleware/rbac.js';
import { enforceTenantIsolation } from '../src/middleware/tenant.js';
import { getEmployees, getEmployeeProfile, updateEmployeeStatus } from '../src/controllers/employeeController.js';
import { updateCandidateStage } from '../src/controllers/candidateController.js';
import { getLeaveRequests, reviewLeave } from '../src/controllers/leaveController.js';
import { submitExpense } from '../src/controllers/payrollExpenseController.js';
import { deleteCustomRecord } from '../src/controllers/customModuleController.js';
import { logSecurityEvent } from '../src/services/auditService.js';

afterEach(() => vi.restoreAllMocks());

function harness(role = Role.HR_ADMIN) {
  const payload: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) { payload.status = code; return this; },
    json(body: unknown) { payload.body = body; return this; },
  } as unknown as Response;
  const req = {
    params: { id: 'resource-b', taskId: 'resource-b', recordId: 'resource-b' },
    query: {},
    body: { status: 'ACTIVE', stage: 'HIRED', reviewComment: 'approved', employeeId: 'employee-b', amount: 50 },
    tenantId: 'tenant-a',
    user: { id: 'user-a', tenantId: 'tenant-a', role },
  } as unknown as Request;
  return { req, res, payload };
}

describe('RBAC and tenant boundary regressions', () => {
  it('ignores client tenant headers and requires authenticated tenant context', () => {
    const payload: { status?: number; body?: unknown } = {};
    const res = {
      status(code: number) { payload.status = code; return this; },
      json(body: unknown) { payload.body = body; return this; },
    } as unknown as Response;
    const req = { headers: { 'x-tenant-id': 'tenant-b' }, user: undefined } as unknown as Request;
    const next = vi.fn();
    enforceTenantIsolation(req, res, next);
    expect(payload.status).toBe(401);
    expect(req.tenantId).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('records the login actor from event details before request auth is attached', async () => {
    const create = vi.spyOn(prisma.aiAuditTrail, 'create').mockResolvedValue({} as any);
    const req = { ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } } as unknown as Request;
    await logSecurityEvent(req, 'LOGIN_SUCCESS', { tenantId: 'tenant-a', userId: 'user-a', email: 'hr@example.test' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        promptInput: expect.stringContaining('User: hr@example.test | User ID: user-a'),
      }),
    }));
  });

  it('sets tenant context in the transaction and fails closed when that step fails', async () => {
    const fn = vi.fn().mockResolvedValue('ran');
    const queryRaw = vi.fn().mockResolvedValue([]);
    vi.spyOn(prisma, '$transaction').mockImplementation((async (callback: (tx: unknown) => unknown) =>
      callback({ $queryRaw: queryRaw })) as any);
    await expect(withTenantContext('tenant-a', fn)).resolves.toBe('ran');
    expect(queryRaw).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledOnce();

    fn.mockClear();
    queryRaw.mockRejectedValueOnce(new Error('context unavailable'));
    await expect(withTenantContext('tenant-a', fn)).rejects.toThrow('context unavailable');
    expect(fn).not.toHaveBeenCalled();
  });

  it('denies an EMPLOYEE access to an HR-only operation', () => {
    const { req, res, payload } = harness(Role.EMPLOYEE);
    const next = vi.fn();
    requireRole(Role.HR_ADMIN)(req, res, next);
    expect(payload.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('scopes employee status changes to the authenticated tenant', async () => {
    const change = vi.spyOn(prisma.employee, 'updateMany').mockResolvedValue({ count: 0 });
    const { req, res, payload } = harness();
    await updateEmployeeStatus(req, res);
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'resource-b', tenantId: 'tenant-a' } }));
    expect(payload.status).toBe(404);
  });

  it('limits employee directory access to the authenticated employee and safe fields', async () => {
    const ownLookup = vi.spyOn(prisma.employee, 'findFirst').mockResolvedValue({ id: 'employee-a' } as any);
    const list = vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([] as any);
    const { req, res } = harness(Role.EMPLOYEE);
    await getEmployees(req, res);
    expect(ownLookup).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', userId: 'user-a' }, select: { id: true } });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'employee-a', tenantId: 'tenant-a' }), select: expect.not.objectContaining({ salary: true, address: true }) }));
  });

  it('ignores a requested employee profile ID for EMPLOYEE users', async () => {
    const lookup = vi.spyOn(prisma.employee, 'findFirst').mockResolvedValueOnce({ id: 'employee-a' } as any).mockResolvedValueOnce(null);
    const { req, res, payload } = harness(Role.EMPLOYEE);
    req.params.id = 'employee-b';
    await getEmployeeProfile(req, res);
    expect(lookup).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: 'employee-a', tenantId: 'tenant-a' } }));
    expect(payload.status).toBe(404);
  });

  it('limits manager leave list to direct reports even when a query requests another employee', async () => {
    const employeeLookup = vi.spyOn(prisma.employee, 'findFirst').mockResolvedValue({ id: 'manager-a' } as any);
    const reports = vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([{ id: 'report-a' }] as any);
    const list = vi.spyOn(prisma.leaveRequest, 'findMany').mockResolvedValue([] as any);
    const { req, res } = harness(Role.MANAGER);
    req.query.employeeId = 'employee-b';
    await getLeaveRequests(req, res);
    expect(employeeLookup).toHaveBeenCalledOnce();
    expect(reports).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', managerId: 'manager-a' }, select: { id: true } });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', employeeId: { in: ['report-a'] } }) }));
  });

  it('scopes candidate stage changes to the authenticated tenant', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const tx = { candidate: { findFirst, update: vi.fn() }, application: { updateMany: vi.fn() }, employee: { findFirst: vi.fn(), create: vi.fn() } };
    vi.spyOn(prisma, '$transaction').mockImplementation((async (callback: (client: unknown) => unknown) => callback(tx)) as any);
    const { req, res, payload } = harness();
    await updateCandidateStage(req, res);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'resource-b', tenantId: 'tenant-a' } });
    expect(payload.status).toBe(404);
  });

  it('moves applications with the candidate and creates an onboarding employee on hire', async () => {
    const candidate = { id: 'candidate-a', firstName: 'Test', lastName: 'Hire', email: 'hire@example.test', currentTitle: 'Engineer', expectedSalary: 90000, stage: 'OFFER' };
    const tx = {
      candidate: { findFirst: vi.fn().mockResolvedValue(candidate), update: vi.fn().mockResolvedValue({ ...candidate, stage: 'HIRED' }) },
      application: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ jobOpening: { title: 'Platform Engineer', departmentId: 'dept-a' } }),
      },
      employee: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'employee-new' }) },
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((async (callback: (client: unknown) => unknown) => callback(tx)) as any);
    const { req, res, payload } = harness(Role.HR_ADMIN);
    req.params.id = candidate.id;
    req.body.stage = 'HIRED';
    await updateCandidateStage(req, res);
    expect(tx.application.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { candidateId: candidate.id, tenantId: 'tenant-a' }, data: { stage: 'HIRED', status: 'HIRED' } }));
    expect(tx.employee.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-a', email: candidate.email, jobTitle: 'Platform Engineer', status: 'ONBOARDING' }) }));
    expect((payload.body as any).employeeCreated).toBe(true);
  });

  it('scopes leave approvals to the authenticated tenant', async () => {
    const change = vi.spyOn(prisma.leaveRequest, 'updateMany').mockResolvedValue({ count: 0 });
    const { req, res, payload } = harness();
    await reviewLeave(req, res);
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'resource-b', tenantId: 'tenant-a' } }));
    expect(payload.status).toBe(404);
  });

  it('rejects expenses referencing an employee outside the authenticated tenant', async () => {
    const lookup = vi.spyOn(prisma.employee, 'findFirst').mockResolvedValue(null);
    const create = vi.spyOn(prisma.expense, 'create');
    const { req, res, payload } = harness();
    await submitExpense(req, res);
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'employee-b', tenantId: 'tenant-a' } }));
    expect(create).not.toHaveBeenCalled();
    expect(payload.status).toBe(404);
  });

  it('cannot delete a custom record owned by another tenant', async () => {
    const remove = vi.spyOn(prisma.customRecord, 'deleteMany').mockResolvedValue({ count: 0 });
    const { req, res, payload } = harness();
    await deleteCustomRecord(req, res);
    expect(remove).toHaveBeenCalledWith({ where: { id: 'resource-b', tenantId: 'tenant-a' } });
    expect(payload.status).toBe(404);
  });
});
