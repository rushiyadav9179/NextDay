import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { agentRegistry } from '../ai/agentFramework.js';
import { ExpenseStatus, PayrollStatus, Role } from '@prisma/client';

export async function getPayrollRuns(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;

  const runs = await prisma.payrollRun.findMany({
    where: { tenantId },
    include: {
      payslips: { include: { employee: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  res.json({ runs });
}

export async function createPayrollRun(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { month, year } = req.body;

  const activeEmployees = await prisma.employee.findMany({
    where: { tenantId, status: { in: ['ACTIVE', 'ONBOARDING'] } },
  });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const run = await prisma.payrollRun.create({
    data: {
      tenantId: tenantId!,
      month: Number(month),
      year: Number(year),
      status: PayrollStatus.DRAFT,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
    },
  });

  // Generate payslips
  for (const emp of activeEmployees) {
    const gross = emp.salary ? emp.salary / 12 : 6500;
    const taxDeduction = gross * 0.18;
    const benefitsDeduction = gross * 0.05;
    const totalDeduct = taxDeduction + benefitsDeduction;
    const net = gross - totalDeduct;

    totalGross += gross;
    totalDeductions += totalDeduct;
    totalNet += net;

    await prisma.payslip.create({
      data: {
        tenantId: tenantId!,
        payrollRunId: run.id,
        employeeId: emp.id,
        grossSalary: parseFloat(gross.toFixed(2)),
        netSalary: parseFloat(net.toFixed(2)),
        allowances: { healthHsa: 150, internetStipend: 75 },
        deductions: { federalTax: parseFloat(taxDeduction.toFixed(2)), benefits: parseFloat(benefitsDeduction.toFixed(2)) },
        status: 'GENERATED',
      },
    });
  }

  // Update totals
  const updatedRun = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      totalGross: parseFloat(totalGross.toFixed(2)),
      totalDeductions: parseFloat(totalDeductions.toFixed(2)),
      totalNet: parseFloat(totalNet.toFixed(2)),
    },
  });

  // Record the audit attempt while leaving the payroll run in DRAFT until verified rules exist.
  const auditResult = await agentRegistry.runAgent('payroll-audit', {
    tenantId: tenantId!,
    userId: req.user?.id,
    params: { payrollRunId: run.id },
  });

  res.status(201).json({ ...updatedRun, auditResult, requiresReview: true });
}

export async function getPayslips(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { employeeId } = req.query;

  const whereClause: any = { tenantId };
  if (employeeId) whereClause.employeeId = String(employeeId);
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

  const payslips = await prisma.payslip.findMany({
    where: whereClause,
    include: {
      payrollRun: true,
      employee: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ payslips });
}

// Expenses
export async function getExpenses(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { employeeId, status } = req.query;

  const whereClause: any = { tenantId };
  if (employeeId) whereClause.employeeId = String(employeeId);
  if (status && status !== 'ALL') whereClause.status = status as ExpenseStatus;
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

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ expenses });
}

export async function submitExpense(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  let { employeeId, title, category, amount, currency = 'USD', receiptUrl } = req.body;

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

  const expense = await prisma.expense.create({
    data: {
      tenantId: tenantId!,
      employeeId,
      title: title || 'Business Expense',
      category: category || 'GENERAL',
      amount: Number(amount),
      currency,
      receiptUrl: receiptUrl || null,
      status: ExpenseStatus.SUBMITTED,
    },
  });

  const auditResult = await agentRegistry.runAgent('expense-auditor', {
    tenantId: tenantId!,
    userId: req.user?.id,
    params: { expenseId: expense.id, amount: Number(amount) },
  });

  const refreshedExpense = await prisma.expense.findFirst({
    where: { id: expense.id, tenantId },
    include: { employee: true },
  });

  res.status(201).json({
    expense: refreshedExpense,
    auditSummary: auditResult.summary,
  });
}
