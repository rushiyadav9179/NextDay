import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { Role } from '@prisma/client';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../controllers/authController.js';
import { z } from 'zod';
import { bodySchemas } from './schemas.js';

import * as authCtrl from '../controllers/authController.js';
import * as dashCtrl from '../controllers/dashboardController.js';
import * as candCtrl from '../controllers/candidateController.js';
import * as jobCtrl from '../controllers/jobController.js';
import * as empCtrl from '../controllers/employeeController.js';
import * as onbCtrl from '../controllers/onboardingController.js';
import * as attCtrl from '../controllers/attendanceController.js';
import * as leaveCtrl from '../controllers/leaveController.js';
import * as payCtrl from '../controllers/payrollExpenseController.js';
import * as compCtrl from '../controllers/complianceController.js';
import * as emailCtrl from '../controllers/emailController.js';
import * as agentCtrl from '../controllers/agentController.js';
import * as modCtrl from '../controllers/customModuleController.js';
import * as adminCtrl from '../controllers/adminController.js';

const router = Router();

// ==================== AUTH ====================
router.post('/auth/register', authLimiter, validate(registerSchema), authCtrl.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authCtrl.login);
router.post('/auth/refresh', authLimiter, validate(bodySchemas.empty), authCtrl.refresh);
router.post('/auth/logout', validate(bodySchemas.empty), authCtrl.logout);
router.get('/auth/me', authenticate, authCtrl.getMe);
router.post('/auth/2fa/setup', authenticate, validate(bodySchemas.empty), authCtrl.setup2FA);
router.post('/auth/2fa/verify', authenticate, validate(bodySchemas.twoFactor), authCtrl.verify2FA);
router.post('/auth/forgot-password', authLimiter, validate(z.object({ email: z.string().email() }).strict()), authCtrl.requestPasswordReset);
router.post('/auth/reset-password', authLimiter, validate(z.object({ token: z.string().min(32), newPassword: z.string().min(12) }).strict()), authCtrl.resetPassword);

// ==================== PUBLIC CAREERS & APPLICANT PORTAL ====================
router.get('/careers', jobCtrl.getPublicJobs);
router.get('/careers/:tenantSlug', jobCtrl.getPublicJobs);
router.post('/careers/:jobId/apply', validate(bodySchemas.apply), jobCtrl.applyToPublicJob);

// Below this line, all routes require authentication and tenant isolation
router.use(authenticate, enforceTenantIsolation);

// ==================== DASHBOARD ====================
router.get('/dashboard', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER, Role.EMPLOYEE), dashCtrl.getDashboardData);

// ==================== CANDIDATES / ATS ====================
router.get('/candidates', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER), candCtrl.getCandidates);
router.post('/candidates', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER), validate(bodySchemas.candidate), candCtrl.createCandidate);
router.patch('/candidates/:id/stage', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER), validate(bodySchemas.candidateStage), candCtrl.updateCandidateStage);
router.post('/candidates/semantic-search', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER), validate(bodySchemas.semanticSearch), candCtrl.semanticCandidateSearch);
router.post('/candidates/interviews', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER), validate(bodySchemas.interview), candCtrl.scheduleInterview);

// ==================== JOBS ====================
router.get('/jobs', jobCtrl.getJobs);
router.post('/jobs', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER), validate(bodySchemas.job), jobCtrl.createJob);

// ==================== EMPLOYEES & ORG CHART ====================
router.get('/employees', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER, Role.EMPLOYEE), empCtrl.getEmployees);
router.get('/employees/org-chart', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), empCtrl.getOrgChart);
router.get('/employees/:id', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER, Role.EMPLOYEE), empCtrl.getEmployeeProfile);
router.patch('/employees/:id/status', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.employeeStatus), empCtrl.updateEmployeeStatus);

// ==================== ONBOARDING ====================
router.get('/onboarding/plans', onbCtrl.getOnboardingPlans);
router.post('/onboarding/plans', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER), validate(bodySchemas.onboardingPlan), onbCtrl.createOnboardingPlan);
router.patch('/onboarding/tasks/:taskId/status', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.taskStatus), onbCtrl.updateTaskStatus);
router.post('/onboarding/sign-document', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.signDocument), onbCtrl.signDocument);
router.post('/onboarding/concierge-chat', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.concierge), onbCtrl.conciergeChat);

// ==================== ATTENDANCE & PUNCH ====================
router.post('/attendance/punch', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.punch), attCtrl.punch);
router.get('/attendance', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), attCtrl.getAttendances);
router.post('/attendance/anomalies/:id/resolve', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER), validate(bodySchemas.anomaly), attCtrl.resolveAnomaly);

// ==================== LEAVE ====================
router.get('/leave', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), leaveCtrl.getLeaveRequests);
router.post('/leave', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.leave), leaveCtrl.requestLeave);
router.patch('/leave/:id/review', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER), validate(bodySchemas.leaveReview), leaveCtrl.reviewLeave);

// ==================== PAYROLL & EXPENSES ====================
router.get('/payroll/runs', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), payCtrl.getPayrollRuns);
router.post('/payroll/runs', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.payroll), payCtrl.createPayrollRun);
router.get('/payroll/payslips', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), payCtrl.getPayslips);
router.get('/expenses', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), payCtrl.getExpenses);
router.post('/expenses', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE), validate(bodySchemas.expense), payCtrl.submitExpense);

// ==================== COMPLIANCE ====================
router.get('/compliance/documents', compCtrl.getComplianceDocuments);

// ==================== EMAILS ====================
router.get('/emails/templates', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER), emailCtrl.getEmailTemplates);
router.post('/emails/templates', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.emailTemplate), emailCtrl.createEmailTemplate);
router.post('/emails/preview', validate(bodySchemas.emailPreview), emailCtrl.previewTemplate);
router.post('/emails/ai-draft', validate(bodySchemas.emailDraft), emailCtrl.aiDraftEmail);
router.post('/emails/send', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER), validate(bodySchemas.emailSend), emailCtrl.sendEmail);
router.post('/emails/bulk-send', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.bulkEmail), emailCtrl.bulkSendEmail);
router.get('/emails/logs', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), emailCtrl.getEmailLogs);

// ==================== AI AGENTS & ZERO-UI ROUTER ====================
router.get('/agents', agentCtrl.listAgents);
router.post('/agents/:id/run', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER), validate(bodySchemas.agentParams), agentCtrl.runAgentManual);
router.post('/agents/command', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER), validate(bodySchemas.command), agentCtrl.executeCommand);
router.get('/agents/runs', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.RECRUITER, Role.MANAGER), agentCtrl.getAgentRuns);
router.get('/agents/audit-trail', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), agentCtrl.getAiAuditTrail);

// ==================== CUSTOM MODULES / AUTOCODING ====================
router.get('/custom-modules', modCtrl.getCustomModules);
router.get('/custom-modules/:slug', modCtrl.getCustomModuleBySlug);
router.post('/custom-modules/generate', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.modulePrompt), modCtrl.generateModuleSpec);
router.post('/custom-modules/publish', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.moduleSpec), modCtrl.publishCustomModule);
router.get('/custom-modules/:moduleId/records', modCtrl.getCustomRecords);
router.post('/custom-modules/:moduleId/records', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER), validate(bodySchemas.customRecord), modCtrl.createCustomRecord);
router.delete('/custom-modules/records/:recordId', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), modCtrl.deleteCustomRecord);

// ==================== ADMIN ====================
router.get('/admin/users', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), adminCtrl.getUsers);
router.patch('/admin/users/:userId/role', requireRole(Role.SUPER_ADMIN), validate(bodySchemas.userRole), adminCtrl.updateUserRole);
router.get('/admin/tenant', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), adminCtrl.getTenantSettings);
router.put('/admin/tenant', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.tenantSettings), adminCtrl.updateTenantSettings);
router.get('/admin/api-keys', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), adminCtrl.getApiKeys);
router.post('/admin/api-keys', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.apiKey), adminCtrl.createApiKey);
router.delete('/admin/api-keys/:keyId', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), adminCtrl.revokeApiKey);
router.get('/admin/webhooks', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), adminCtrl.getWebhooks);
router.post('/admin/webhooks', requireRole(Role.SUPER_ADMIN, Role.HR_ADMIN), validate(bodySchemas.webhook), adminCtrl.createWebhook);

export default router;
