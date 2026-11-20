import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { JobStatus, JobType } from '@prisma/client';

export async function getJobs(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { status, departmentId } = req.query;

  const whereClause: any = { tenantId };
  if (status) whereClause.status = status as JobStatus;
  if (departmentId) whereClause.departmentId = String(departmentId);

  const jobs = await prisma.jobOpening.findMany({
    where: whereClause,
    include: {
      department: true,
      _count: { select: { applications: true, interviews: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ jobs });
}

export async function createJob(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { title, departmentId, location, type, description, requirements, salaryMin, salaryMax } = req.body;

  const job = await prisma.jobOpening.create({
    data: {
      tenantId: tenantId!,
      title,
      departmentId,
      location: location || 'Remote',
      type: (type as JobType) || JobType.FULL_TIME,
      description,
      requirements,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      status: JobStatus.OPEN,
    },
  });

  res.status(201).json(job);
}

// Public Careers API (No auth required)
export async function getPublicJobs(req: Request, res: Response): Promise<void> {
  const { tenantSlug } = req.params;

  let tenant = null;
  if (tenantSlug) {
    tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  } else {
    tenant = await prisma.tenant.findFirst();
  }

  if (!tenant) {
    res.status(404).json({ error: 'Company careers portal not found' });
    return;
  }

  const jobs = await prisma.jobOpening.findMany({
    where: {
      tenantId: tenant.id,
      status: JobStatus.OPEN,
    },
    include: { department: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    companyName: tenant.name,
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department?.name || 'General',
      location: j.location,
      type: j.type,
      description: j.description,
      requirements: j.requirements,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      createdAt: j.createdAt,
    })),
  });
}

// Public Job Apply (Candidate Portal)
export async function applyToPublicJob(req: Request, res: Response): Promise<void> {
  const { jobId } = req.params;
  const { firstName, lastName, email, phone, currentCompany, currentTitle, resumeText, experienceYears } = req.body;

  const job = await prisma.jobOpening.findUnique({ where: { id: jobId } });
  if (!job || job.status !== JobStatus.OPEN) {
    res.status(404).json({ error: 'Job opening is not currently accepting applications.' });
    return;
  }

  // Create or link candidate
  let candidate = await prisma.candidate.findUnique({
    where: { tenantId_email: { tenantId: job.tenantId, email } },
  });

  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        tenantId: job.tenantId,
        firstName,
        lastName,
        email,
        phone,
        currentCompany,
        currentTitle,
        resumeText,
        experienceYears: Number(experienceYears || 0),
        stage: 'APPLIED',
        aiScore: 82,
        aiSummary: 'Direct public application submitted via NextDay Careers portal.',
      },
    });
  }

  const application = await prisma.application.create({
    data: {
      tenantId: job.tenantId,
      candidateId: candidate.id,
      jobOpeningId: job.id,
      stage: 'APPLIED',
      matchScore: 82,
    },
  });

  res.status(201).json({
    message: 'Application received successfully. Thank you for applying!',
    applicationId: application.id,
  });
}
