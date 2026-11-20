import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const base = 'http://localhost:4000/api/v1';
const seed = readFileSync('prisma/seed.ts', 'utf8');
const password = seed.match(/const passwordHash = await bcrypt\.hash\('([^']+)'/)?.[1];
if (!password) throw new Error('Could not load the seeded test password.');

const ids: { jobId?: string; candidateId?: string; employeeId?: string; applicationId?: string; interviewId?: string; planId?: string; documentId?: string; leaveId?: string; expenseId?: string; payrollRunId?: string } = {};
const qaEmail = `workflow-qa-${Date.now()}@example.invalid`;

async function request<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}`);
  return json as T;
}

async function main() {
  try {
    const loginResponse = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@nextday.work', password }),
    });
    if (!loginResponse.ok) throw new Error(`HR login returned ${loginResponse.status}`);
    const { accessToken } = await loginResponse.json() as { accessToken: string };
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'acme-corp' }, select: { id: true } });
    if (!tenant) throw new Error('Demo tenant was not found.');

    const job = await request<{ id: string }>('/jobs', accessToken, 'POST', {
      title: `Temporary QA Engineer ${Date.now()}`,
      description: 'Temporary API workflow verification role; safe to delete.',
      location: 'Remote',
      type: 'FULL_TIME',
    });
    ids.jobId = job.id;

    const publicJobs = await fetch(`${base}/careers/acme-corp`).then(r => r.json()) as { jobs: Array<{ id: string }> };
    if (!publicJobs.jobs.some(item => item.id === job.id)) throw new Error('New open job missing from public careers.');
    const applyResponse = await fetch(`${base}/careers/${job.id}/apply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Temporary', lastName: 'WorkflowQA', email: qaEmail, currentTitle: 'QA Engineer', experienceYears: 4 }),
    });
    if (!applyResponse.ok) throw new Error(`Public application returned ${applyResponse.status}`);
    const { applicationId } = await applyResponse.json() as { applicationId: string };
    ids.applicationId = applicationId;
    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new Error('Public application was not persisted.');
    ids.candidateId = application.candidateId;
    const candidate = await prisma.candidate.findFirst({ where: { id: application.candidateId, tenantId: tenant.id } });
    if (!candidate) throw new Error('Public application candidate was not persisted.');
    console.log('JOB_POST_PUBLIC_CAREERS_APPLY PASS');

    const interview = await request<{ id: string; meetUrl: string | null }>('/candidates/interviews', accessToken, 'POST', {
      candidateId: candidate.id,
      jobOpeningId: job.id,
      scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      title: 'Temporary QA interview',
    });
    ids.interviewId = interview.id;
    if (interview.meetUrl !== null) throw new Error('Interview returned an unconfigured meeting URL.');

    const hired = await request<{ stage: string; employeeId: string; employeeCreated: boolean }>(`/candidates/${candidate.id}/stage`, accessToken, 'PATCH', { stage: 'HIRED' });
    ids.employeeId = hired.employeeId;
    if (hired.stage !== 'HIRED' || !hired.employeeCreated || !hired.employeeId) throw new Error('Hire did not create an onboarding employee.');
    const refreshedApplication = await prisma.application.findFirst({ where: { id: application.id, tenantId: tenant.id } });
    if (refreshedApplication?.stage !== 'HIRED' || refreshedApplication.status !== 'HIRED') throw new Error('Hire did not update the application stage.');
    console.log('CANDIDATE_INTERVIEW_HIRE PASS');

    const plan = await request<{ id: string; tasks: Array<{ id: string }> }>('/onboarding/plans', accessToken, 'POST', {
      employeeId: hired.employeeId,
      title: 'Temporary QA onboarding',
      role: 'QA Engineer',
    });
    ids.planId = plan.id;
    if (plan.tasks.length !== 5) throw new Error('Onboarding plan did not create its checklist.');
    const task = await request<{ progress: number }>(`/onboarding/tasks/${plan.tasks[0].id}/status`, accessToken, 'PATCH', { status: 'COMPLETED' });
    if (task.progress !== 20) throw new Error('Onboarding task did not update plan progress.');
    const acknowledgement = await request<{ message: string; document: { id: string; status: string; fileUrl: string } }>('/onboarding/sign-document', accessToken, 'POST', {
      employeeId: hired.employeeId,
      documentTitle: 'Temporary QA acknowledgment',
      type: 'NDA',
    });
    ids.documentId = acknowledgement.document.id;
    if (acknowledgement.document.status !== 'PENDING' || !acknowledgement.document.fileUrl.startsWith('urn:nextday:internal-acknowledgement:')) throw new Error('Internal acknowledgement was not accurately represented.');
    console.log('ONBOARDING_PLAN_TASK PASS');

    const status = await request<{ status: string }>(`/employees/${hired.employeeId}/status`, accessToken, 'PATCH', { status: 'ACTIVE' });
    if (status.status !== 'ACTIVE') throw new Error('Employee status update failed.');
    const terminated = await request<{ status: string }>(`/employees/${hired.employeeId}/status`, accessToken, 'PATCH', { status: 'TERMINATED' });
    if (terminated.status !== 'TERMINATED') throw new Error('Employee offboarding status update failed.');
    await request<{ status: string }>(`/employees/${hired.employeeId}/status`, accessToken, 'PATCH', { status: 'ACTIVE' });
    console.log('EMPLOYEE_STATUS PASS');

    const payrollRun = await request<{ id: string; totalGross: number; status: string; auditResult: { data?: { status?: string } } }>('/payroll/runs', accessToken, 'POST', { month: 12, year: 2099 });
    ids.payrollRunId = payrollRun.id;
    const auditedPayroll = await prisma.payrollRun.findFirst({ where: { id: payrollRun.id, tenantId: tenant.id }, select: { status: true, auditedByAgent: true } });
    if (!auditedPayroll || auditedPayroll.status !== 'DRAFT' || auditedPayroll.auditedByAgent || payrollRun.auditResult?.data?.status !== 'UNVERIFIED' || payrollRun.totalGross <= 0) throw new Error('Payroll draft or audit-review state was incorrect.');
    console.log('PAYROLL_DRAFT_REQUIRES_REVIEW PASS');

    const startDate = new Date(Date.now() + 14 * 86400000);
    const endDate = new Date(startDate.getTime() + 86400000);
    const leave = await request<{ id: string }>('/leave', accessToken, 'POST', {
      employeeId: hired.employeeId,
      leaveType: 'ANNUAL',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysCount: 1,
      reason: 'Temporary QA workflow fixture.',
    });
    ids.leaveId = leave.id;
    const review = await request<{ leave: { status: string } }>(`/leave/${leave.id}/review`, accessToken, 'PATCH', { status: 'APPROVED', reviewComment: 'Temporary QA approval.' });
    if (review.leave.status !== 'APPROVED') throw new Error('Leave approval failed.');
    console.log('LEAVE_REQUEST_APPROVAL PASS');

    const punchedIn = await request<{ record: { punchIn: string | null } }>('/attendance/punch', accessToken, 'POST', { employeeId: hired.employeeId, type: 'IN' });
    const punchedOut = await request<{ record: { punchOut: string | null } }>('/attendance/punch', accessToken, 'POST', { employeeId: hired.employeeId, type: 'OUT' });
    if (!punchedIn.record.punchIn || !punchedOut.record.punchOut) throw new Error('Attendance punch did not persist.');
    console.log('ATTENDANCE_PUNCH_IN_OUT PASS');

    const expense = await request<{ expense: { id: string } }>('/expenses', accessToken, 'POST', {
      employeeId: hired.employeeId,
      title: 'Temporary QA expense fixture',
      category: 'SOFTWARE',
      amount: 12.5,
      currency: 'USD',
    });
    ids.expenseId = expense.expense.id;
    console.log('EXPENSE_SUBMISSION_AGENT PASS');
  } finally {
    const cleanup: Array<[string, () => Promise<unknown>]> = [];
    if (ids.payrollRunId) cleanup.push(['payroll ledger', () => prisma.generalLedger.deleteMany({ where: { payrollRunId: ids.payrollRunId } })]);
    if (ids.payrollRunId) cleanup.push(['payslips', () => prisma.payslip.deleteMany({ where: { payrollRunId: ids.payrollRunId } })]);
    if (ids.payrollRunId) cleanup.push(['payroll run', () => prisma.payrollRun.deleteMany({ where: { id: ids.payrollRunId } })]);
    if (ids.expenseId) cleanup.push(['expense ledger', () => prisma.generalLedger.deleteMany({ where: { expenseId: ids.expenseId } })]);
    if (ids.expenseId) cleanup.push(['expense', () => prisma.expense.deleteMany({ where: { id: ids.expenseId } })]);
    if (ids.leaveId) cleanup.push(['leave request', () => prisma.leaveRequest.deleteMany({ where: { id: ids.leaveId } })]);
    if (ids.documentId) cleanup.push(['document acknowledgement', () => prisma.document.deleteMany({ where: { id: ids.documentId } })]);
    if (ids.planId) cleanup.push(['onboarding plan', () => prisma.onboardingPlan.deleteMany({ where: { id: ids.planId } })]);
    if (ids.interviewId) cleanup.push(['interview', () => prisma.interview.deleteMany({ where: { id: ids.interviewId } })]);
    if (ids.applicationId) cleanup.push(['application', () => prisma.application.deleteMany({ where: { id: ids.applicationId } })]);
    if (ids.candidateId) cleanup.push(['candidate', () => prisma.candidate.deleteMany({ where: { id: ids.candidateId } })]);
    if (ids.employeeId) cleanup.push(['employee', () => prisma.employee.deleteMany({ where: { id: ids.employeeId } })]);
    if (ids.jobId) cleanup.push(['job', () => prisma.jobOpening.deleteMany({ where: { id: ids.jobId } })]);
    for (const [label, action] of cleanup) {
      try { await action(); } catch { console.error(`QA_CLEANUP_FAILED ${label}`); }
    }
    const leftoverCandidates = await prisma.candidate.count({ where: { email: qaEmail } });
    const leftoverEmployees = await prisma.employee.count({ where: { email: qaEmail } });
    const leftover = leftoverCandidates + leftoverEmployees;
    if (leftover !== 0) throw new Error('Temporary candidate/employee QA fixtures remain in the database.');
    console.log('LIVE_WORKFLOW_CLEANUP PASS');
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(`LIVE_WORKFLOW_FAILED ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
