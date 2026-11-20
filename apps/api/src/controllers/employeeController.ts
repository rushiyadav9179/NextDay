import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { EmployeeStatus } from '@prisma/client';
import { Role } from '@prisma/client';

export async function getEmployees(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { departmentId, status, search } = req.query;

  const whereClause: any = { tenantId };
  if (departmentId) whereClause.departmentId = String(departmentId);
  if (status) whereClause.status = status as EmployeeStatus;
  if (search) {
    whereClause.OR = [
      { firstName: { contains: String(search), mode: 'insensitive' } },
      { lastName: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { jobTitle: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }
    whereClause.id = ownEmployee.id;
  } else if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!manager) {
      res.json({ employees: [] });
      return;
    }
    whereClause.OR = [{ id: manager.id }, { managerId: manager.id }];
  }

  const employees = req.user?.role === Role.EMPLOYEE || req.user?.role === Role.MANAGER || req.user?.role === Role.RECRUITER
    ? await prisma.employee.findMany({
        where: whereClause,
        select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, jobTitle: true, status: true, joinDate: true, department: { select: { id: true, name: true } } },
        orderBy: { firstName: 'asc' },
      })
    : await prisma.employee.findMany({ where: whereClause, include: { department: true, manager: true }, orderBy: { firstName: 'asc' } });

  res.json({ employees });
}

export async function getEmployeeProfile(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  let { id } = req.params;
  let managerId: string | undefined;
  if (req.user?.role === Role.EMPLOYEE) {
    const ownEmployee = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!ownEmployee) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }
    id = ownEmployee.id;
  } else if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    if (!manager) {
      res.status(404).json({ error: 'Manager profile not found' });
      return;
    }
    managerId = manager.id;
  }

  const employee = managerId
    ? await prisma.employee.findFirst({
        where: { id, tenantId, OR: [{ id: managerId }, { managerId }] },
        select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, jobTitle: true, status: true, joinDate: true, managerId: true, department: { select: { id: true, name: true } } },
      })
    : req.user?.role === Role.RECRUITER
      ? await prisma.employee.findFirst({ where: { id, tenantId }, select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, jobTitle: true, status: true, joinDate: true, department: { select: { id: true, name: true } } } })
    : await prisma.employee.findFirst({
        where: { id, tenantId },
        include: {
          department: true,
          manager: true,
          subordinates: true,
          documents: true,
          attendances: { take: 10, orderBy: { date: 'desc' } },
          leaveRequests: { take: 10, orderBy: { startDate: 'desc' } },
          payslips: { take: 6, orderBy: { createdAt: 'desc' } },
        },
      });

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json({ employee });
}

export async function getOrgChart(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const employees = await prisma.employee.findMany({
    where: { tenantId, status: { in: ['ACTIVE', 'ONBOARDING'] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      managerId: true,
      profilePhotoUrl: true,
      department: { select: { id: true, name: true } },
    },
  });

  // Construct hierarchy nodes
  const nodes = employees.map((emp) => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    title: emp.jobTitle,
    department: emp.department?.name || 'Operations',
    managerId: emp.managerId,
    avatar: emp.profilePhotoUrl,
  }));

  // Build edges
  const edges = employees
    .filter((emp) => emp.managerId)
    .map((emp) => ({
      source: emp.managerId!,
      target: emp.id,
      relation: 'REPORTS_TO',
    }));

  res.json({ nodes, edges });
}

export async function updateEmployeeStatus(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { id } = req.params;
  const { status, jobTitle, departmentId, managerId } = req.body;

  const relatedIds = [departmentId, managerId].filter((value): value is string => typeof value === 'string');
  if (relatedIds.length) {
    const [department, manager] = await Promise.all([
      departmentId ? prisma.department.findFirst({ where: { id: departmentId, tenantId }, select: { id: true } }) : Promise.resolve(true),
      managerId ? prisma.employee.findFirst({ where: { id: managerId, tenantId }, select: { id: true } }) : Promise.resolve(true),
    ]);
    if (!department || !manager) {
      res.status(404).json({ error: 'Department or manager not found in this tenant' });
      return;
    }
  }

  const changed = await prisma.employee.updateMany({
    where: { id, tenantId },
    data: {
      status: status as EmployeeStatus,
      jobTitle,
      departmentId,
      managerId,
    },
  });

  if (!changed.count) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  const employee = await prisma.employee.findFirst({ where: { id, tenantId } });

  res.json(employee);
}
