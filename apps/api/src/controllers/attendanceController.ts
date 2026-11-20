import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { socketService } from '../services/socketService.js';
import { Role } from '@prisma/client';

export async function punch(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  let { employeeId, type, latitude, longitude, deviceMeta } = req.body;

  if (!employeeId || !type) {
    res.status(400).json({ error: 'employeeId and punch type (IN or OUT) are required.' });
    return;
  }
  const employee = req.user?.role === Role.EMPLOYEE
    ? await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } })
    : req.user?.role === Role.MANAGER
      ? await (async () => {
          const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user!.id }, select: { id: true } });
          return manager ? prisma.employee.findFirst({ where: { id: employeeId, tenantId, OR: [{ id: manager.id }, { managerId: manager.id }] }, select: { id: true } }) : null;
        })()
      : await prisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } });
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  employeeId = employee.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let record = await prisma.attendance.findFirst({
    where: {
      tenantId: tenantId!,
      employeeId,
      date: { gte: today },
    },
  });

  const now = new Date();
  const anomalyFlags: string[] = [];

  if (type === 'IN') {
    if (record && record.punchIn) {
      res.status(400).json({ error: 'Already punched in for today.' });
      return;
    }

    // Check if late (after 9:30 AM)
    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 30, 0, 0);
    if (now > lateThreshold) {
      anomalyFlags.push('LATE_ARRIVAL');
    }

    if (!record) {
      record = await prisma.attendance.create({
        data: {
          tenantId: tenantId!,
          employeeId,
          date: today,
          punchIn: now,
          inLatitude: latitude ? Number(latitude) : null,
          inLongitude: longitude ? Number(longitude) : null,
          deviceMeta: deviceMeta || {},
          status: anomalyFlags.includes('LATE_ARRIVAL') ? 'LATE' : 'PRESENT',
          anomalyFlags,
        },
      });
    } else {
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: {
          punchIn: now,
          inLatitude: latitude ? Number(latitude) : null,
          inLongitude: longitude ? Number(longitude) : null,
          status: anomalyFlags.includes('LATE_ARRIVAL') ? 'LATE' : 'PRESENT',
          anomalyFlags,
        },
      });
    }
  } else if (type === 'OUT') {
    if (!record || !record.punchIn) {
      anomalyFlags.push('MISSING_PUNCH_IN');
      record = await prisma.attendance.create({
        data: {
          tenantId: tenantId!,
          employeeId,
          date: today,
          punchOut: now,
          outLatitude: latitude ? Number(latitude) : null,
          outLongitude: longitude ? Number(longitude) : null,
          deviceMeta: deviceMeta || {},
          status: 'PRESENT',
          anomalyFlags,
        },
      });
    } else {
      const punchInTime = new Date(record.punchIn).getTime();
      const hoursWorked = parseFloat(((now.getTime() - punchInTime) / (1000 * 60 * 60)).toFixed(2));

      if (hoursWorked < 4.0) {
        anomalyFlags.push('SHORT_SHIFT');
      }

      record = await prisma.attendance.update({
        where: { id: record.id },
        data: {
          punchOut: now,
          outLatitude: latitude ? Number(latitude) : null,
          outLongitude: longitude ? Number(longitude) : null,
          totalHours: hoursWorked,
          anomalyFlags: Array.from(new Set([...record.anomalyFlags, ...anomalyFlags])),
        },
      });
    }
  }

  // Real-time broadcast
  socketService.emitToTenant(tenantId!, 'attendance:punched', {
    employeeId,
    type,
    timestamp: now,
    record,
  });

  res.json({
    message: `Successfully punched ${type}`,
    record,
  });
}

export async function getAttendances(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { employeeId, date, anomaliesOnly } = req.query;

  const whereClause: any = { tenantId };
  if (employeeId) whereClause.employeeId = String(employeeId);
  if (anomaliesOnly === 'true') {
    whereClause.anomalyFlags = { isEmpty: false };
  }
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

  const attendances = await prisma.attendance.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { date: 'desc' },
    take: 50,
  });

  res.json({ attendances });
}

export async function resolveAnomaly(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { id } = req.params;
  const { resolutionNotes, standardShiftHours = 8.0 } = req.body;

  if (req.user?.role === Role.MANAGER) {
    const manager = await prisma.employee.findFirst({ where: { tenantId, userId: req.user.id }, select: { id: true } });
    const record = manager && await prisma.attendance.findFirst({ where: { id, tenantId, employee: { managerId: manager.id } }, select: { id: true } });
    if (!record) { res.status(404).json({ error: 'Attendance record not found in manager reporting scope' }); return; }
  }

  const changed = await prisma.attendance.updateMany({
    where: { id, tenantId },
    data: {
      agentReviewed: true,
      reviewNotes: resolutionNotes || 'Manager approved standard 8.0-hour shift.',
      totalHours: Number(standardShiftHours),
      status: 'PRESENT',
    },
  });
  if (!changed.count) {
    res.status(404).json({ error: 'Attendance record not found' });
    return;
  }
  const attendance = await prisma.attendance.findFirst({ where: { id, tenantId }, include: { employee: true } });

  socketService.emitToTenant(tenantId!, 'attendance:anomaly_resolved', attendance);

  res.json({ message: 'Anomaly resolved successfully', attendance });
}
