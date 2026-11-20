import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { socketService } from '../services/socketService.js';
import { LeaveStatus, Role } from '@prisma/client';

export async function getLeaveRequests(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { employeeId, status } = req.query;

  const whereClause: any = { tenantId };
  if (employeeId) whereClause.employeeId = String(employeeId);
  if (status && status !== 'ALL') whereClause.status = status as LeaveStatus;
  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }
    whereClause.employeeId = ownEmployee.id;
  } else if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!manager) { res.status(404).json({ error: 'Manager profile not found' }); return; }
    const reports = await prisma.employee.findMany({ where: { tenantId, managerId: manager.id }, select: { id: true } });
    whereClause.employeeId = { in: reports.map((report) => report.id) };
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ leaves });
}

export async function requestLeave(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  let { employeeId, leaveType, startDate, endDate, daysCount, reason } = req.body;
  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }
    employeeId = ownEmployee.id;
  }

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    const report = manager && await prisma.employee.findFirst({ where: { id: employeeId, tenantId, OR: [{ id: manager.id }, { managerId: manager.id }] }, select: { id: true } });
    if (!report) { res.status(404).json({ error: 'Employee is outside the manager reporting scope' }); return; }
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      tenantId: tenantId!,
      employeeId,
      leaveType: leaveType || 'ANNUAL',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      daysCount: Number(daysCount || 1),
      reason: reason || 'Personal time off',
      status: LeaveStatus.PENDING,
    },
    include: { employee: true },
  });

  // Emit real-time notification
  socketService.emitToRole(tenantId!, 'HR_ADMIN', 'leave:requested', leave);
  socketService.emitToRole(tenantId!, 'MANAGER', 'leave:requested', leave);

  res.status(201).json(leave);
}

export async function reviewLeave(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { id } = req.params;
  const { status, reviewComment } = req.body;

  if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    const request = manager && await prisma.leaveRequest.findFirst({ where: { id, tenantId, employee: { managerId: manager.id } }, select: { id: true } });
    if (!request) { res.status(404).json({ error: 'Leave request not found in manager reporting scope' }); return; }
  }

  const changed = await prisma.leaveRequest.updateMany({
    where: { id, tenantId },
    data: {
      status: status as LeaveStatus,
      approvedById: req.user?.id,
      reviewComment,
    },
  });
  if (!changed.count) {
    res.status(404).json({ error: 'Leave request not found' });
    return;
  }
  const leave = await prisma.leaveRequest.findFirst({ where: { id, tenantId }, include: { employee: true } });

  // Notify employee & tenant
  socketService.emitToTenant(tenantId!, 'leave:updated', leave);

  res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
}
