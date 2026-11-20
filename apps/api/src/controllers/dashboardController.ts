import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export async function getDashboardData(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context missing' });
    return;
  }

  // Headcount & Status counts
  const totalEmployees = await prisma.employee.count({ where: { tenantId } });
  const activeEmployees = await prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } });
  const onboardingEmployees = await prisma.employee.count({ where: { tenantId, status: 'ONBOARDING' } });
  const openRolesCount = await prisma.jobOpening.count({ where: { tenantId, status: 'OPEN' } });

  // Pending Approvals
  const pendingLeaves = await prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } });
  const pendingExpenses = await prisma.expense.count({ where: { tenantId, status: 'SUBMITTED' } });
  const unreviewedAnomalies = await prisma.attendance.count({
    where: {
      tenantId,
      agentReviewed: false,
      anomalyFlags: { isEmpty: false },
    },
  });

  // Hiring Funnel Data
  const candidatesByStage = await prisma.candidate.groupBy({
    by: ['stage'],
    where: { tenantId },
    _count: { id: true },
  });

  const funnelStages = ['SOURCED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
  const stageMap = Object.fromEntries(candidatesByStage.map((c) => [c.stage, c._count.id]));
  const hiringFunnel = funnelStages.map((stage) => ({
    stage,
    count: stageMap[stage] || 0,
  }));

  // Headcount by Department
  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: { _count: { select: { employees: true } } },
  });

  const headcountByDept = departments.map((d) => ({
    department: d.name,
    count: d._count.employees,
  }));

  // Aggregate only observed attendance and payroll records; never synthesize demo metrics.
  const attendanceFrom = new Date();
  attendanceFrom.setDate(attendanceFrom.getDate() - 6);
  attendanceFrom.setHours(0, 0, 0, 0);
  const recentAttendance = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: attendanceFrom } },
    select: { date: true, status: true },
  });
  const attendanceBuckets = new Map<string, { day: string; present: number; late: number; absent: number }>();
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(attendanceFrom);
    day.setDate(day.getDate() + offset);
    attendanceBuckets.set(day.toISOString().slice(0, 10), { day: day.toLocaleDateString('en-US', { weekday: 'short' }), present: 0, late: 0, absent: 0 });
  }
  for (const record of recentAttendance) {
    const bucket = attendanceBuckets.get(new Date(record.date).toISOString().slice(0, 10));
    if (!bucket) continue;
    if (record.status === 'ABSENT') bucket.absent++;
    else if (record.status === 'LATE') bucket.late++;
    else bucket.present++;
  }
  const attendanceTrend = Array.from(attendanceBuckets.values());

  const payrollRuns = await prisma.payrollRun.findMany({
    where: { tenantId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
    select: { month: true, year: true, totalGross: true },
  });
  const payrollTrend = payrollRuns.reverse().map((run) => ({
    month: new Date(run.year, run.month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
    amount: run.totalGross,
  }));
  const onboardingPlans = await prisma.onboardingPlan.findMany({ where: { tenantId, isTemplate: false }, select: { progress: true } });
  const onboardingProgress = onboardingPlans.length
    ? Math.round(onboardingPlans.reduce((sum, plan) => sum + plan.progress, 0) / onboardingPlans.length)
    : null;
  const expiringDocs = await prisma.document.findMany({
    where: { tenantId, expiryDate: { gte: new Date(), lte: new Date(Date.now() + 60 * 86400000) } },
    select: { id: true, title: true, expiryDate: true },
    orderBy: { expiryDate: 'asc' },
    take: 5,
  });

  // Recent Activity Feed
  const recentAudit = await prisma.aiAuditTrail.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const aiInsights = expiringDocs.map((document) => ({
    id: document.id,
    title: 'Document expiry approaching',
    message: `${document.title} expires ${document.expiryDate?.toLocaleDateString('en-US')}.`,
    type: 'WARNING',
    timestamp: 'Upcoming',
  }));

  res.json({
    kpis: {
      totalEmployees,
      activeEmployees,
      onboardingEmployees,
      openRoles: openRolesCount,
      timeToHireDays: null,
      attritionRate: null,
      pendingApprovals: pendingLeaves + pendingExpenses + unreviewedAnomalies,
      onboardingProgress,
    },
    charts: {
      hiringFunnel,
      headcountByDept,
      attendanceTrend,
      payrollTrend,
    },
    activityFeed: recentAudit.map((a) => ({
      id: a.id,
      agentName: a.agentName,
      summary: a.promptInput.slice(0, 80),
      status: a.status,
      timestamp: a.createdAt,
    })),
    aiInsights,
  });
}
