import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { llm } from '../ai/llmClient.js';
import { socketService } from '../services/socketService.js';
import { webhookService } from '../services/webhookService.js';
import { CandidateStage } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function getCandidates(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { stage, search, cursor, limit = 50 } = req.query;

  const whereClause: any = { tenantId };
  if (stage && stage !== 'ALL') {
    whereClause.stage = stage as CandidateStage;
  }
  if (search) {
    whereClause.OR = [
      { firstName: { contains: String(search), mode: 'insensitive' } },
      { lastName: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { currentTitle: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      applications: {
        include: { jobOpening: true },
      },
      interviews: true,
    },
  });

  res.json({ candidates });
}

export async function createCandidate(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return;
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    currentCompany,
    currentTitle,
    experienceYears,
    expectedSalary,
    resumeText,
    jobOpeningId,
  } = req.body;

  let aiScore = 80;
  let aiSummary = 'Profile submitted for review.';
  let skills: string[] = [];

  // Generate resume parsing and embedding if resumeText is provided
  let embeddingVector: number[] = [];
  if (resumeText) {
    try {
      const evaluation = await llm.generateStructured<any>({
        prompt: `Parse candidate resume:\n${resumeText}`,
      });
      aiScore = evaluation.aiScore || 85;
      aiSummary = evaluation.aiSummary || 'Relevant profile based on resume.';
      skills = evaluation.extractedSkills || ['Software Engineering'];
      embeddingVector = await llm.generateEmbedding(`${firstName} ${lastName} ${currentTitle} ${resumeText}`);
    } catch {
      // Fallback
    }
  }

  if (jobOpeningId) {
    const job = await prisma.jobOpening.findFirst({ where: { id: jobOpeningId, tenantId }, select: { id: true } });
    if (!job) {
      res.status(404).json({ error: 'Job opening not found' });
      return;
    }
  }

  const candidate = await prisma.candidate.create({
    data: {
      tenantId,
      firstName,
      lastName,
      email,
      phone,
      currentCompany,
      currentTitle,
      experienceYears: Number(experienceYears || 0),
      expectedSalary: expectedSalary ? Number(expectedSalary) : null,
      resumeText,
      stage: CandidateStage.SOURCED,
      aiScore,
      aiSummary,
      skills,
      skillsEmbedding: embeddingVector.length ? JSON.stringify(embeddingVector) : null,
    },
  });

  if (jobOpeningId) {
    await prisma.application.create({
      data: {
        tenantId,
        candidateId: candidate.id,
        jobOpeningId,
        stage: CandidateStage.APPLIED,
        matchScore: aiScore,
      },
    });
  }

  // Real-time broadcast & webhook dispatch
  socketService.emitToTenant(tenantId, 'candidate:created', candidate);
  webhookService.dispatchEvent(tenantId, 'candidate.created', {
    candidateId: candidate.id,
    name: `${candidate.firstName} ${candidate.lastName}`,
    email: candidate.email,
  });

  res.status(201).json(candidate);
}

export async function updateCandidateStage(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { id } = req.params;
  const { stage } = req.body;

  if (!tenantId) {
    res.status(401).json({ error: 'Tenant context required' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.candidate.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const candidate = await tx.candidate.update({
      where: { id: existing.id },
      data: { stage: stage as CandidateStage },
    });
    const terminalStatus = stage === CandidateStage.HIRED ? 'HIRED' : stage === CandidateStage.REJECTED ? 'REJECTED' : undefined;
    await tx.application.updateMany({
      where: { candidateId: id, tenantId },
      data: { stage: stage as CandidateStage, ...(terminalStatus ? { status: terminalStatus } : {}) },
    });

    let employee: { id: string } | null = null;
    let employeeCreated = false;
    if (stage === CandidateStage.HIRED) {
      employee = await tx.employee.findFirst({ where: { tenantId, email: existing.email }, select: { id: true } });
      if (!employee) {
        const application = await tx.application.findFirst({
          where: { candidateId: id, tenantId },
          include: { jobOpening: { select: { title: true, departmentId: true } } },
          orderBy: { updatedAt: 'desc' },
        });
        employee = await tx.employee.create({
          data: {
            tenantId,
            employeeId: `ND-${randomUUID().slice(0, 8).toUpperCase()}`,
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email,
            jobTitle: application?.jobOpening.title || existing.currentTitle || 'New Hire',
            departmentId: application?.jobOpening.departmentId || undefined,
            salary: existing.expectedSalary || 0,
            status: 'ONBOARDING',
          },
          select: { id: true },
        });
        employeeCreated = true;
      }
    }

    return { candidate, employeeId: employee?.id, employeeCreated };
  });

  if (!result) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  // Real-time broadcast
  socketService.emitToTenant(tenantId!, 'candidate:stage_updated', {
    id: result.candidate.id,
    stage: result.candidate.stage,
  });
  if (stage === CandidateStage.HIRED) {
    socketService.emitToTenant(tenantId, 'candidate:hired', {
      candidateId: result.candidate.id,
      employeeId: result.employeeId,
      employeeCreated: result.employeeCreated,
    });
  }

  res.json({ ...result.candidate, employeeId: result.employeeId, employeeCreated: result.employeeCreated });
}

export async function semanticCandidateSearch(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { query, limit = 10 } = req.body;

  if (!query) {
    res.status(400).json({ error: 'Search query required.' });
    return;
  }

  // Generate embedding for query
  const queryEmbedding = await llm.generateEmbedding(query);

  const candidates = await prisma.candidate.findMany({
    where: { tenantId },
  });

  // Calculate cosine similarity scores
  const scored = candidates.map((cand) => {
    let similarity = 0.5;
    if (cand.skillsEmbedding) {
      try {
        const candVec: number[] = JSON.parse(cand.skillsEmbedding);
        // Cosine similarity
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < Math.min(candVec.length, queryEmbedding.length); i++) {
          dot += candVec[i] * queryEmbedding[i];
          normA += candVec[i] * candVec[i];
          normB += queryEmbedding[i] * queryEmbedding[i];
        }
        similarity = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0.5;
      } catch {
        similarity = 0.5;
      }
    } else {
      // Keyword fallback match
      const text = `${cand.firstName} ${cand.lastName} ${cand.currentTitle} ${cand.skills.join(' ')}`.toLowerCase();
      const qWords = query.toLowerCase().split(/\s+/);
      const matches = qWords.filter((w: string) => text.includes(w)).length;
      similarity = matches / (qWords.length || 1);
    }

    return {
      candidate: cand,
      similarityScore: parseFloat((similarity * 100).toFixed(1)),
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  res.json({
    query,
    results: scored.slice(0, Number(limit)),
  });
}

export async function scheduleInterview(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const { candidateId, jobOpeningId, scheduledAt, title, durationMinutes = 45 } = req.body;

  const [candidate, job] = await Promise.all([
    prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true } }),
    prisma.jobOpening.findFirst({ where: { id: jobOpeningId, tenantId }, select: { id: true } }),
  ]);
  if (!candidate || !job) {
    res.status(404).json({ error: 'Candidate or job opening not found' });
    return;
  }

  const interview = await prisma.interview.create({
    data: {
      tenantId: tenantId!,
      candidateId,
      jobOpeningId,
      title: title || 'Technical & Cultural Interview',
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      meetUrl: null,
      status: 'SCHEDULED',
    },
    include: {
      candidate: true,
      jobOpening: true,
    },
  });

  socketService.emitToTenant(tenantId!, 'interview:scheduled', interview);

  res.status(201).json(interview);
}
