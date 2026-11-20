import { z } from 'zod';
import { moduleSpecSchema } from '../controllers/customModuleController.js';

const object = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const json = z.record(z.unknown());

export const bodySchemas = {
  empty: object({}),
  twoFactor: object({ code: z.string().length(6) }),
  apply: object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), phone: z.string().optional(), currentCompany: z.string().optional(), currentTitle: z.string().optional(), resumeText: z.string().max(100_000).optional(), experienceYears: z.coerce.number().min(0).max(80).optional() }),
  candidate: object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), phone: z.string().optional(), currentCompany: z.string().optional(), currentTitle: z.string().optional(), experienceYears: z.coerce.number().min(0).max(80).optional(), expectedSalary: z.coerce.number().nonnegative().optional(), resumeText: z.string().max(100_000).optional(), jobOpeningId: z.string().uuid().optional() }),
  candidateStage: object({ stage: z.enum(['SOURCED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']) }),
  semanticSearch: object({ query: z.string().min(1).max(1000), limit: z.coerce.number().int().min(1).max(50).optional() }),
  interview: object({ candidateId: z.string().uuid(), jobOpeningId: z.string().uuid(), scheduledAt: z.string().datetime(), title: z.string().max(200).optional(), durationMinutes: z.coerce.number().int().min(15).max(240).optional() }),
  job: object({ title: z.string().min(2).max(200), departmentId: z.string().uuid().optional(), location: z.string().max(200).optional(), type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(), description: z.string().min(1).max(20_000), requirements: z.string().max(20_000).optional(), salaryMin: z.coerce.number().nonnegative().optional(), salaryMax: z.coerce.number().nonnegative().optional() }),
  employeeStatus: object({ status: z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']), jobTitle: z.string().max(200).optional(), departmentId: z.string().uuid().nullable().optional(), managerId: z.string().uuid().nullable().optional() }),
  onboardingPlan: object({ employeeId: z.string().uuid().optional(), title: z.string().max(200).optional(), role: z.string().max(200).optional(), isTemplate: z.boolean().optional() }),
  taskStatus: object({ status: z.enum(['PENDING', 'SUBMITTED', 'COMPLETED', 'REJECTED']) }),
  signDocument: object({ documentTitle: z.string().max(200).optional(), type: z.string().max(80).optional(), employeeId: z.string().uuid() }),
  concierge: object({ message: z.string().min(1).max(4000), employeeId: z.string().uuid().optional() }),
  punch: object({ employeeId: z.string().uuid(), type: z.enum(['IN', 'OUT']), latitude: z.coerce.number().min(-90).max(90).optional(), longitude: z.coerce.number().min(-180).max(180).optional(), deviceMeta: json.optional() }),
  anomaly: object({ resolutionNotes: z.string().max(1000).optional(), standardShiftHours: z.coerce.number().min(0).max(24).optional() }),
  leave: object({ employeeId: z.string().uuid(), leaveType: z.string().max(80).optional(), startDate: z.string().datetime(), endDate: z.string().datetime(), daysCount: z.coerce.number().positive().max(366).optional(), reason: z.string().max(2000).optional() }),
  leaveReview: object({ status: z.enum(['APPROVED', 'REJECTED']), reviewComment: z.string().max(2000).optional() }),
  payroll: object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2100) }),
  expense: object({ employeeId: z.string().uuid(), title: z.string().max(200).optional(), category: z.string().max(80).optional(), amount: z.coerce.number().positive(), currency: z.string().length(3).optional(), receiptUrl: z.string().url().optional() }),
  emailTemplate: object({ name: z.string().min(2).max(200), subject: z.string().max(500), bodyHtml: z.string().max(50_000), category: z.string().max(80).optional(), variables: z.array(z.string().max(100)).max(100).optional() }),
  emailPreview: object({ bodyHtml: z.string().max(50_000).optional(), subject: z.string().max(500).optional(), variables: json.optional() }),
  emailDraft: object({ instruction: z.string().min(1).max(4000), tone: z.string().max(80).optional(), recipientType: z.string().max(80).optional() }),
  emailSend: object({ to: z.string().email(), recipientName: z.string().max(200).optional(), subject: z.string().max(500), bodyHtml: z.string().max(50_000), templateId: z.string().uuid().optional(), variables: json.optional() }),
  bulkEmail: object({ recipients: z.array(object({ to: z.string().email(), recipientName: z.string().max(200).optional(), variables: json.optional() })).min(1).max(500), subject: z.string().max(500), bodyHtml: z.string().max(50_000), templateId: z.string().uuid().optional() }),
  agentParams: object({ params: json.optional() }),
  command: object({ command: z.string().min(1).max(4000), confirmed: z.boolean().optional() }),
  modulePrompt: object({ prompt: z.string().min(4).max(4000) }),
  moduleSpec: moduleSpecSchema,
  customRecord: object({ data: json }),
  userRole: object({ role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'RECRUITER', 'MANAGER', 'EMPLOYEE', 'CANDIDATE']) }),
  tenantSettings: object({ name: z.string().min(2).max(200).optional(), settings: json.optional() }),
  apiKey: object({ name: z.string().max(200).optional(), scopes: z.array(z.string().max(100)).max(50).optional(), expiresInDays: z.coerce.number().int().min(1).max(3650).optional() }),
  webhook: object({ url: z.string().url(), events: z.array(z.string().max(200)).max(100).optional() }),
} as const;
