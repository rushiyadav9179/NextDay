import { PrismaClient, Role, EmployeeStatus, CandidateStage, JobType, JobStatus, LeaveStatus, ExpenseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting NextDay seed generation...');

  // 1. Create Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'ENTERPRISE',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        workWeekDays: [1, 2, 3, 4, 5],
        standardShiftHours: 8.0,
      },
    },
  });

  console.log(`🏢 Created Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create Departments
  const departmentsData = [
    { name: 'Engineering', code: 'ENG', budget: 1200000 },
    { name: 'Product & Design', code: 'PROD', budget: 650000 },
    { name: 'People & HR', code: 'HR', budget: 400000 },
    { name: 'Sales & Marketing', code: 'SM', budget: 850000 },
    { name: 'Operations & Finance', code: 'OPS', budget: 500000 },
  ];

  const depts: Record<string, any> = {};
  for (const d of departmentsData) {
    depts[d.code] = await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: d.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: d.name,
        code: d.code,
        budget: d.budget,
      },
    });
  }

  // 3. Create Users for each Role
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);

  const roleUsersData = [
    { email: 'admin@nextday.work', pass: adminPasswordHash, role: Role.SUPER_ADMIN, first: 'Alexander', last: 'Vance', title: 'Chief Executive Officer' },
    { email: 'hr@nextday.work', pass: passwordHash, role: Role.HR_ADMIN, first: 'Sarah', last: 'Jenkins', title: 'VP of People Operations' },
    { email: 'recruiter@nextday.work', pass: passwordHash, role: Role.RECRUITER, first: 'David', last: 'Kim', title: 'Senior Talent Acquisition Lead' },
    { email: 'manager@nextday.work', pass: passwordHash, role: Role.MANAGER, first: 'Marcus', last: 'Sterling', title: 'VP of Engineering' },
    { email: 'employee@nextday.work', pass: passwordHash, role: Role.EMPLOYEE, first: 'Elena', last: 'Rostova', title: 'Senior Staff Engineer' },
    { email: 'candidate@nextday.work', pass: passwordHash, role: Role.CANDIDATE, first: 'Julian', last: 'Hayes', title: 'Staff Systems Architect' },
  ];

  const createdRoleUsers: Record<string, any> = {};
  for (const u of roleUsersData) {
    createdRoleUsers[u.role] = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { role: u.role },
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash: u.pass,
        role: u.role,
        emailVerified: true,
      },
    });

    if (u.role !== Role.CANDIDATE) {
      await prisma.employee.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
        update: {},
        create: {
          tenantId: tenant.id,
          userId: createdRoleUsers[u.role].id,
          employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          firstName: u.first,
          lastName: u.last,
          email: u.email,
          jobTitle: u.title,
          departmentId: depts['HR'].id,
          status: EmployeeStatus.ACTIVE,
          salary: 160000,
        },
      });
    }
  }

  // 4. Seed 40 Employees
  console.log('👥 Seeding 40 employees...');
  const firstNames = ['Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore',
    'Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail',
    'Aiden', 'Ethan', 'Mason', 'Logan', 'Jackson', 'Aria', 'Chloe', 'Ella', 'Grace', 'Zoey',
    'Priya', 'Arjun', 'Rohan', 'Ananya', 'Wei', 'Mei', 'Hiroshi', 'Kenji', 'Mateo', 'Camila'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Sharma', 'Patel', 'Verma', 'Gupta', 'Chen', 'Wang', 'Tanaka', 'Sato', 'Silva', 'Santos',
    'Dubois', 'Moreau', 'Rossi', 'Ferrari', 'Kowalski', 'Novak', 'Muller', 'Schmidt', 'Alvarez', 'Romero'];
  const titles = [
    'Senior Frontend Engineer', 'Backend Systems Architect', 'Full Stack Developer', 'Cloud Infrastructure Engineer',
    'Security Engineer', 'Product Manager', 'UX/UI Designer', 'Data Scientist', 'Engineering Manager', 'QA Automation Engineer',
    'HR Business Partner', 'Talent Partner', 'Finance Analyst', 'Sales Executive', 'Customer Success Architect'
  ];

  const deptCodes = ['ENG', 'PROD', 'HR', 'SM', 'OPS'];
  const allEmployees: any[] = [];

  for (let i = 0; i < 40; i++) {
    const fn = firstNames[i];
    const ln = lastNames[i];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@acme.corp`;
    const code = deptCodes[i % deptCodes.length];
    const status = i < 4 ? EmployeeStatus.ONBOARDING : (i === 38 ? EmployeeStatus.SUSPENDED : EmployeeStatus.ACTIVE);

    const emp = await prisma.employee.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {},
      create: {
        tenantId: tenant.id,
        employeeId: `EMP-${2000 + i}`,
        firstName: fn,
        lastName: ln,
        email,
        phone: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
        jobTitle: titles[i % titles.length],
        departmentId: depts[code].id,
        status,
        salary: 95000 + (i % 8) * 12000,
        skills: ['TypeScript', 'Node.js', 'React', 'Cloud Architecture', 'Agile Leadership'],
      },
    });
    allEmployees.push(emp);
  }

  // 5. Seed 5 Job Openings
  console.log('💼 Seeding 5 job openings...');
  const jobsData = [
    { title: 'Staff Distributed Systems Engineer', dept: 'ENG', loc: 'Remote (US/Canada)', desc: 'Architect low-latency streaming infrastructure and distributed caching engines with Node.js and PostgreSQL.' },
    { title: 'Senior AI / ML Research Engineer', dept: 'ENG', loc: 'San Francisco, CA / Hybrid', desc: 'Design agentic workflows, prompt routing, and vector retrieval mechanisms for enterprise HR applications.' },
    { title: 'Lead Product Designer (Design Systems)', dept: 'PROD', loc: 'Remote', desc: 'Own NextDay design system across web and mobile surfaces, ensuring fluid micro-interactions and accessibility.' },
    { title: 'Senior Technical Recruiter', dept: 'HR', loc: 'New York, NY', desc: 'Partner with engineering leaders to source, interview, and close world-class systems software talent.' },
    { title: 'Enterprise Account Executive', dept: 'SM', loc: 'Remote', desc: 'Drive enterprise sales cycles with Fortune 500 HR and people operations leadership.' },
  ];

  const createdJobs: any[] = [];
  for (const j of jobsData) {
    const job = await prisma.jobOpening.create({
      data: {
        tenantId: tenant.id,
        title: j.title,
        departmentId: depts[j.dept].id,
        location: j.loc,
        type: JobType.FULL_TIME,
        description: j.desc,
        requirements: '5+ years proven enterprise experience. Strong communicator and self-directed problem solver.',
        salaryMin: 140000,
        salaryMax: 220000,
        status: JobStatus.OPEN,
      },
    });
    createdJobs.push(job);
  }

  // 6. Seed 25 Candidates with embeddings and stages
  console.log('🎯 Seeding 25 candidates with embeddings...');
  const candidateStages: CandidateStage[] = [
    CandidateStage.SOURCED,
    CandidateStage.APPLIED,
    CandidateStage.SCREENING,
    CandidateStage.INTERVIEW,
    CandidateStage.OFFER,
    CandidateStage.HIRED,
    CandidateStage.REJECTED,
  ];

  for (let i = 0; i < 25; i++) {
    const fn = ['Lucas', 'Maya', 'Nico', 'Sora', 'Zara', 'Tariq', 'Chloe', 'Kiran', 'Leo', 'Freja',
      'Gabriel', 'Nadia', 'Dante', 'Astrid', 'Samir', 'Yuki', 'Ronan', 'Leila', 'Finn', 'Thalia',
      'Orion', 'Sasha', 'Kai', 'Amara', 'Devon'][i];
    const ln = ['Vanderbilt', 'Sinclair', 'Sterling', 'Blackwood', 'Frost', 'Khoury', 'Mercer', 'Rao', 'Kim', 'Lindstrom',
      'Castillo', 'Petrov', 'Romano', 'Jensen', 'Mansoor', 'Tanaka', 'O\'Connor', 'Nasser', 'Gallagher', 'Vali',
      'Chen', 'Vogel', 'Moreno', 'Okafor', 'Winters'][i];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
    const stage = candidateStages[i % candidateStages.length];
    const score = 70 + (i * 3) % 28;

    // Deterministic mock 768-dim embedding
    const mockVec = new Array(768).fill(0).map((_, idx) => parseFloat(Math.sin(i * 17 + idx).toFixed(4)));

    const candidate = await prisma.candidate.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {},
      create: {
        tenantId: tenant.id,
        firstName: fn,
        lastName: ln,
        email,
        phone: `+1 (555) 789-${1000 + i}`,
        currentCompany: i % 2 === 0 ? 'Stripe' : 'Datadog',
        currentTitle: i % 3 === 0 ? 'Senior Software Engineer' : 'Staff Backend Developer',
        experienceYears: 4 + (i % 6),
        expectedSalary: 160000 + (i % 5) * 10000,
        stage,
        aiScore: score,
        aiSummary: `Strong technical match with expertise in modern microservices, high concurrency, and distributed data systems.`,
        skills: ['TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'System Design'],
        skillsEmbedding: JSON.stringify(mockVec),
        resumeText: `${fn} ${ln} - Experienced software engineer with expertise in distributed systems, REST/GraphQL APIs, and high availability systems.`,
      },
    });

    // Create applications for first 2 jobs
    await prisma.application.create({
      data: {
        tenantId: tenant.id,
        candidateId: candidate.id,
        jobOpeningId: createdJobs[i % createdJobs.length].id,
        stage,
        matchScore: score,
      },
    }).catch(() => {});
  }

  // 7. Seed 10+ Email Templates
  console.log('✉️ Seeding 12 Handlebars email templates...');
  const templates = [
    {
      name: 'Official Offer Letter',
      slug: 'offer-letter',
      category: 'RECRUITING',
      subject: 'Offer of Employment: {{jobTitle}} at Acme Corporation',
      bodyHtml: `<p>Dear {{firstName}},</p><p>We are delighted to formally offer you the position of <strong>{{jobTitle}}</strong> at Acme Corporation! Reporting to {{managerName}}, your anticipated start date is <strong>{{startDate}}</strong>.</p><p>Annual base compensation: \${{salary}} with full health, 401(k) matching, and equity benefits.</p><p>Please review and sign the attached offer letter.</p><p>Warmly,<br/>The Acme People Operations Team</p>`,
      variables: ['firstName', 'jobTitle', 'managerName', 'startDate', 'salary'],
    },
    {
      name: 'Interview Invitation',
      slug: 'interview-invitation',
      category: 'RECRUITING',
      subject: 'Invitation to Interview: {{jobTitle}} at Acme',
      bodyHtml: `<p>Hi {{firstName}},</p><p>Thank you for your interest in the {{jobTitle}} role. We were very impressed by your background and would love to schedule a 45-minute technical conversation.</p><p>Please choose a slot that works best for you: {{schedulingLink}}</p><p>Best regards,<br/>Acme Recruiting Team</p>`,
      variables: ['firstName', 'jobTitle', 'schedulingLink'],
    },
    {
      name: 'Candidate Rejection Notice',
      slug: 'rejection-notice',
      category: 'RECRUITING',
      subject: 'Update on your application for {{jobTitle}} at Acme',
      bodyHtml: `<p>Dear {{firstName}},</p><p>Thank you for taking the time to speak with our team about the {{jobTitle}} opening. While your accomplishments are impressive, we have chosen to move forward with another candidate whose experience is more closely aligned with our current immediate needs.</p><p>We will keep your resume on file for future roles.</p><p>Best wishes,<br/>Acme Talent Team</p>`,
      variables: ['firstName', 'jobTitle'],
    },
    {
      name: 'Welcome & Onboarding Kickoff',
      slug: 'welcome-onboarding',
      category: 'ONBOARDING',
      subject: 'Welcome to Acme, {{firstName}}! Getting Started Guide',
      bodyHtml: `<p>Welcome aboard, {{firstName}}!</p><p>We are thrilled to have you join our team as <strong>{{jobTitle}}</strong> starting on <strong>{{startDate}}</strong>. Your manager {{managerName}} and the entire team are excited to meet you.</p><p>Please log in to your NextDay portal to review your onboarding checklist and sign compliance documents.</p>`,
      variables: ['firstName', 'jobTitle', 'startDate', 'managerName'],
    },
    {
      name: 'Document Request Notice',
      slug: 'document-request',
      category: 'COMPLIANCE',
      subject: 'Action Required: Pending Compliance Documents',
      bodyHtml: `<p>Hello {{firstName}},</p><p>This is a quick reminder that we require your {{documentName}} for statutory compliance verification. Please upload this directly to your portal by {{dueDate}}.</p>`,
      variables: ['firstName', 'documentName', 'dueDate'],
    },
    {
      name: 'Leave Request Approved',
      slug: 'leave-approved',
      category: 'HR_NOTIFICATION',
      subject: 'Your Leave Request has been Approved',
      bodyHtml: `<p>Hi {{firstName}},</p><p>Great news! Your leave request for <strong>{{daysCount}} day(s)</strong> from {{startDate}} to {{endDate}} has been approved by {{managerName}}.</p>`,
      variables: ['firstName', 'daysCount', 'startDate', 'endDate', 'managerName'],
    },
    {
      name: 'Leave Request Rejected',
      slug: 'leave-rejected',
      category: 'HR_NOTIFICATION',
      subject: 'Update regarding your Leave Request',
      bodyHtml: `<p>Hi {{firstName}},</p><p>Your leave request for {{startDate}} to {{endDate}} could not be approved at this time due to team coverage requirements: {{rejectionReason}}.</p>`,
      variables: ['firstName', 'startDate', 'endDate', 'rejectionReason'],
    },
    {
      name: 'Monthly Payslip Ready',
      slug: 'payslip-ready',
      category: 'HR_NOTIFICATION',
      subject: 'Your Payslip for {{monthYear}} is Ready',
      bodyHtml: `<p>Hi {{firstName}},</p><p>Your payslip for {{monthYear}} is now available for viewing and download in your NextDay portal under Payroll & Expenses.</p>`,
      variables: ['firstName', 'monthYear'],
    },
    {
      name: 'Corporate Policy Update',
      slug: 'policy-update',
      category: 'GENERAL',
      subject: 'Important Company Policy Update: {{policyTitle}}',
      bodyHtml: `<p>Hello {{firstName}},</p><p>Please review our updated {{policyTitle}} guidelines effective {{effectiveDate}}. Please read the document and complete electronic acknowledgment.</p>`,
      variables: ['firstName', 'policyTitle', 'effectiveDate'],
    },
    {
      name: 'Probation Review Notice',
      slug: 'probation-review',
      category: 'HR_NOTIFICATION',
      subject: 'Upcoming 90-Day Performance Review: {{firstName}} {{lastName}}',
      bodyHtml: `<p>Hi {{managerName}},</p><p>This is a reminder that {{firstName}} {{lastName}} is approaching the 90-day milestone on {{date}}. Please complete the evaluation rubric in NextDay.</p>`,
      variables: ['managerName', 'firstName', 'lastName', 'date'],
    },
    {
      name: 'Offboarding & Exit Interview',
      slug: 'exit-offboarding',
      category: 'HR_NOTIFICATION',
      subject: 'Acme Offboarding Checklist & Exit Interview',
      bodyHtml: `<p>Dear {{firstName}},</p><p>As you prepare for your transition, here is your exit checklist covering equipment return, COBRA benefits, and your exit interview schedule on {{exitDate}}.</p>`,
      variables: ['firstName', 'exitDate'],
    },
    {
      name: 'Birthday & Anniversary Celebration',
      slug: 'birthday-anniversary',
      category: 'GENERAL',
      subject: 'Happy Work Anniversary, {{firstName}}! 🎉',
      bodyHtml: `<p>Happy {{milestoneYear}}-year work anniversary, {{firstName}}! 🚀</p><p>Thank you for all your incredible contributions, passion, and leadership at Acme Corporation. Here's to many more milestones together!</p>`,
      variables: ['firstName', 'milestoneYear'],
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: t.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: t.name,
        slug: t.slug,
        category: t.category,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        variables: t.variables,
        isSystem: true,
      },
    });
  }

  // 8. Seed 2 Custom Modules (Autocoding engine demonstration)
  console.log('📦 Seeding 2 AI-generated custom modules...');
  const customModules = [
    {
      name: 'Vaccination & Health Tracker',
      slug: 'vaccination-tracker',
      icon: 'ShieldCheck',
      description: 'Track corporate health immunization status, COVID-19 boosters, and verified exemptions.',
      schemaSpec: {
        name: 'Vaccination & Health Tracker',
        slug: 'vaccination-tracker',
        icon: 'ShieldCheck',
        description: 'Track corporate health immunization status, COVID-19 boosters, and verified exemptions.',
        fields: [
          { name: 'employeeName', label: 'Employee Name', type: 'text', required: true },
          { name: 'vaccineType', label: 'Vaccine Type', type: 'select', options: ['Pfizer-BioNTech', 'Moderna', 'Johnson & Johnson', 'Covishield', 'Flu Shot'], required: true },
          { name: 'doseNumber', label: 'Dose', type: 'select', options: ['1st Dose', '2nd Dose', 'Booster 1', 'Booster 2'], required: true },
          { name: 'administeredDate', label: 'Date Administered', type: 'date', required: true },
          { name: 'certificateNumber', label: 'Batch / Cert ID', type: 'text', required: false },
          { name: 'status', label: 'Status', type: 'badge', options: ['VERIFIED', 'PENDING_REVIEW', 'EXEMPT'], default: 'PENDING_REVIEW' },
        ],
        tableColumns: ['employeeName', 'vaccineType', 'doseNumber', 'administeredDate', 'status'],
        charts: [
          { type: 'pie', title: 'Immunization Compliance Status', field: 'status' },
          { type: 'bar', title: 'Vaccine Type Distribution', field: 'vaccineType' },
        ],
        permissions: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'],
      },
    },
    {
      name: 'Equipment & Asset Registry',
      slug: 'equipment-registry',
      icon: 'Laptop',
      description: 'Inventory laptops, monitors, mobile devices, and security keys assigned to employees.',
      schemaSpec: {
        name: 'Equipment & Asset Registry',
        slug: 'equipment-registry',
        icon: 'Laptop',
        description: 'Inventory laptops, monitors, mobile devices, and security keys assigned to employees.',
        fields: [
          { name: 'assetTag', label: 'Asset Tag', type: 'text', required: true },
          { name: 'deviceType', label: 'Device Model', type: 'select', options: ['MacBook Pro 16" M3', 'MacBook Air 15" M3', 'Dell Precision 5680', 'Dell 4K Monitor 32"', 'YubiKey 5C NFC'], required: true },
          { name: 'assignedTo', label: 'Assigned Employee', type: 'text', required: true },
          { name: 'serialNumber', label: 'Serial Number', type: 'text', required: true },
          { name: 'condition', label: 'Asset Condition', type: 'badge', options: ['NEW', 'GOOD', 'NEEDS_SERVICE', 'RETIRED'], default: 'GOOD' },
        ],
        tableColumns: ['assetTag', 'deviceType', 'assignedTo', 'serialNumber', 'condition'],
        charts: [
          { type: 'pie', title: 'Device Fleet by Model', field: 'deviceType' },
          { type: 'bar', title: 'Hardware Health Status', field: 'condition' },
        ],
        permissions: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'],
      },
    },
  ];

  for (const m of customModules) {
    const mod = await prisma.customModule.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: m.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: m.name,
        slug: m.slug,
        icon: m.icon,
        description: m.description,
        schemaSpec: m.schemaSpec,
        isPublished: true,
        version: 1,
      },
    });

    // Add sample records
    if (m.slug === 'vaccination-tracker') {
      await prisma.customRecord.createMany({
        data: [
          { tenantId: tenant.id, moduleId: mod.id, data: { employeeName: 'Alexander Vance', vaccineType: 'Pfizer-BioNTech', doseNumber: 'Booster 2', administeredDate: '2024-03-12', certificateNumber: 'VAC-99120', status: 'VERIFIED' } },
          { tenantId: tenant.id, moduleId: mod.id, data: { employeeName: 'Sarah Jenkins', vaccineType: 'Moderna', doseNumber: 'Booster 1', administeredDate: '2024-02-18', certificateNumber: 'VAC-88412', status: 'VERIFIED' } },
          { tenantId: tenant.id, moduleId: mod.id, data: { employeeName: 'Elena Rostova', vaccineType: 'Flu Shot', doseNumber: '1st Dose', administeredDate: '2024-10-05', certificateNumber: 'VAC-77291', status: 'VERIFIED' } },
          { tenantId: tenant.id, moduleId: mod.id, data: { employeeName: 'Liam Smith', vaccineType: 'Moderna', doseNumber: '2nd Dose', administeredDate: '2024-01-15', certificateNumber: 'VAC-11204', status: 'PENDING_REVIEW' } },
        ],
      });
    } else {
      await prisma.customRecord.createMany({
        data: [
          { tenantId: tenant.id, moduleId: mod.id, data: { assetTag: 'AST-001', deviceType: 'MacBook Pro 16" M3', assignedTo: 'Elena Rostova', serialNumber: 'C02G8940MD6R', condition: 'GOOD' } },
          { tenantId: tenant.id, moduleId: mod.id, data: { assetTag: 'AST-002', deviceType: 'Dell Precision 5680', assignedTo: 'Alexander Vance', serialNumber: 'DL-994827', condition: 'GOOD' } },
          { tenantId: tenant.id, moduleId: mod.id, data: { assetTag: 'AST-003', deviceType: 'MacBook Air 15" M3', assignedTo: 'Liam Smith', serialNumber: 'C02H1189PA3X', condition: 'NEW' } },
        ],
      });
    }
  }

  // 9. Seed Sample Punches, Leaves, Expenses, and Onboarding Plans
  console.log('⏰ Seeding attendance punches, leaves, and expenses...');
  const firstEmp = allEmployees[0];
  const secondEmp = allEmployees[1];

  // Attendance
  await prisma.attendance.createMany({
    data: [
      { tenantId: tenant.id, employeeId: firstEmp.id, date: new Date(), punchIn: new Date(Date.now() - 6 * 3600000), totalHours: 6.0, status: 'PRESENT' },
      { tenantId: tenant.id, employeeId: secondEmp.id, date: new Date(), punchIn: new Date(Date.now() - 4 * 3600000), totalHours: 4.0, status: 'LATE', anomalyFlags: ['LATE_ARRIVAL'] },
    ],
  });

  // Leave Requests
  await prisma.leaveRequest.create({
    data: {
      tenantId: tenant.id,
      employeeId: firstEmp.id,
      leaveType: 'ANNUAL',
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 8),
      daysCount: 3,
      reason: 'Family trip to Yosemite',
      status: LeaveStatus.PENDING,
    },
  });

  // Expenses
  await prisma.expense.create({
    data: {
      tenantId: tenant.id,
      employeeId: firstEmp.id,
      title: 'Monthly Cloud Infrastructure & Copilot Subscription',
      category: 'SOFTWARE',
      amount: 49.0,
      status: ExpenseStatus.APPROVED,
      auditedByAgent: true,
      auditScore: 0.99,
      policyFlag: 'AUTO_APPROVED_UNDER_POLICY',
    },
  });

  // Onboarding Plan
  const plan = await prisma.onboardingPlan.create({
    data: {
      tenantId: tenant.id,
      employeeId: firstEmp.id,
      title: 'Full Stack Engineer Onboarding Track',
      role: 'Staff Engineer',
      status: 'IN_PROGRESS',
      progress: 60,
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      { tenantId: tenant.id, planId: plan.id, title: 'Upload Government Photo ID', category: 'DOCUMENT', order: 1, status: 'COMPLETED', autoCompletable: true },
      { tenantId: tenant.id, planId: plan.id, title: 'Sign Security NDA & Employee Handbook', category: 'DOCUMENT', order: 2, status: 'COMPLETED', autoCompletable: true },
      { tenantId: tenant.id, planId: plan.id, title: 'Setup GitHub & Corporate Slack SSO', category: 'IT_SETUP', order: 3, status: 'COMPLETED', autoCompletable: true },
      { tenantId: tenant.id, planId: plan.id, title: 'Meet with VP of Engineering', category: 'MEET_TEAM', order: 4, status: 'PENDING', autoCompletable: false },
      { tenantId: tenant.id, planId: plan.id, title: 'Ship First Production PR', category: 'TRAINING', order: 5, status: 'PENDING', autoCompletable: false },
    ],
  });

  console.log('✅ NextDay database seeded with complete demo dataset successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
