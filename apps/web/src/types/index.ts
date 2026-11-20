export type Role =
  | 'SUPER_ADMIN'
  | 'HR_ADMIN'
  | 'RECRUITER'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'CANDIDATE';

export interface User {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantName?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  jobTitle?: string;
  twoFactorEnabled?: boolean;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  departmentId?: string;
  department?: { id: string; name: string };
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
  status: 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  joinDate: string;
  salary: number;
  skills: string[];
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentTitle?: string;
  experienceYears: number;
  expectedSalary?: number;
  stage: 'SOURCED' | 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  aiScore?: number;
  aiSummary?: string;
  skills: string[];
  resumeText?: string;
  applications?: any[];
  interviews?: any[];
}

export interface JobOpening {
  id: string;
  title: string;
  departmentId?: string;
  department?: { id: string; name: string };
  location: string;
  type: string;
  description: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
  createdAt: string;
  _count?: { applications: number; interviews: number };
}

export interface OnboardingPlan {
  id: string;
  title: string;
  role?: string;
  progress: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  employee?: Employee;
  tasks: OnboardingTask[];
}

export interface OnboardingTask {
  id: string;
  title: string;
  category: string;
  order: number;
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED';
  autoCompletable: boolean;
  dueDate?: string;
  completedAt?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  punchIn?: string;
  punchOut?: string;
  totalHours?: number;
  status: string;
  anomalyFlags: string[];
  agentReviewed: boolean;
  reviewNotes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewComment?: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'AUDITED' | 'APPROVED' | 'PROCESSED';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  auditedByAgent: boolean;
  anomalySummary?: string;
  payslips?: Payslip[];
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee?: Employee;
  grossSalary: number;
  netSalary: number;
  status: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
}

export interface Expense {
  id: string;
  employeeId: string;
  employee?: Employee;
  title: string;
  category: string;
  amount: number;
  currency: string;
  status: 'SUBMITTED' | 'AUDITING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  auditScore?: number;
  policyFlag?: string;
  auditedByAgent: boolean;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

export interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  toolsCount: number;
  status: string;
  executionMode?: 'MOCK' | 'PROVIDER';
}

export interface CustomModule {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  schemaSpec: {
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'number' | 'date' | 'select' | 'badge' | 'boolean';
      options?: string[];
      required?: boolean;
    }>;
    tableColumns: string[];
    charts?: Array<{
      type: 'pie' | 'bar' | 'line';
      title: string;
      field: string;
    }>;
    permissions: string[];
  };
  records?: Array<{ id: string; data: Record<string, any>; createdAt: string }>;
}
