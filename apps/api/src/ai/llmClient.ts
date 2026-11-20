import { env } from '../config/env.js';

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

export interface EmbeddingResult {
  embedding: number[];
}

export class LLMClient {
  private apiKey: string;
  private isMock: boolean;

  constructor() {
    this.apiKey = env.GEMINI_API_KEY;
    this.isMock = !this.apiKey || this.apiKey.trim() === '';
  }

  get isMockMode(): boolean {
    return this.isMock;
  }

  /**
   * Generates text using Gemini 2.0 Flash or deterministic fallback
   */
  async generateText(options: GenerateTextOptions): Promise<string> {
    if (this.isMock) {
      return this.getMockResponse(options.prompt, options.systemInstruction);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: options.prompt }] }],
            systemInstruction: options.systemInstruction
              ? { parts: [{ text: options.systemInstruction }] }
              : undefined,
            generationConfig: {
              temperature: options.temperature ?? 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API request failed (${response.status}).`);
      }

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini API returned no generated text.');
      return text;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Gemini API request failed.');
    }
  }

  /**
   * Generates structured JSON adhering to generic specification
   */
  async generateStructured<T>(options: GenerateTextOptions): Promise<T> {
    const raw = await this.generateText({
      ...options,
      prompt: `${options.prompt}\n\nIMPORTANT: Respond ONLY with valid, raw JSON. Do NOT wrap in markdown or backticks.`,
    });

    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (e) {
      console.warn('Failed to parse JSON from LLM output, extracting first matching JSON structure');
      const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error(`Unable to parse LLM structured output: ${raw}`);
    }
  }

  /**
   * Generates a 768-dimensional vector embedding
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.isMock) {
      return this.getMockEmbedding(text);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini embedding request failed (${response.status}).`);
      }

      const data = (await response.json()) as any;
      if (!Array.isArray(data?.embedding?.values)) throw new Error('Gemini returned no embedding.');
      return data.embedding.values;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Gemini embedding request failed.');
    }
  }

  /**
   * Deterministic mock vector generation (768 dimensions) based on string hash
   */
  private getMockEmbedding(seed: string): number[] {
    const vector = new Array(768).fill(0);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 768; i++) {
      const val = Math.sin(hash + i * 31);
      vector[i] = parseFloat(val.toFixed(4));
    }
    // Normalize vector
    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0)) || 1;
    return vector.map((v) => parseFloat((v / norm).toFixed(6)));
  }

  /**
   * Realistic deterministic mock responses for HR agents and commands
   */
  private getMockResponse(prompt: string, systemInstruction?: string): string {
    const lower = (prompt + ' ' + (systemInstruction || '')).toLowerCase();

    // Intent Router
    if (lower.includes('router') || lower.includes('intent')) {
      const userText = prompt.toLowerCase();
      if (userText.includes('vaccination') || userText.includes('module') || userText.includes('dashboard') || userText.includes('autocode')) {
        return JSON.stringify({
          module: 'DEV_AUTOCODE',
          action: 'GENERATE_MODULE',
          confidence: 0.97,
          params: { specTitle: 'Vaccination Tracker', category: 'Compliance' },
          summary: 'Triggering Dev Agent to generate schema and UI spec for Vaccination Tracker',
          requiresConfirmation: true,
        });
      }
      if (userText.includes('candidate') || userText.includes('hire') || userText.includes('engineer') || userText.includes('resume')) {
        return JSON.stringify({
          module: 'RECRUITMENT',
          action: 'SEARCH_CANDIDATES',
          confidence: 0.96,
          params: { query: 'senior engineers', limit: 5 },
          summary: 'Searching top matching candidates from talent pool',
          requiresConfirmation: false,
        });
      }
      if (userText.includes('leave') || userText.includes('vacation') || userText.includes('priya')) {
        return JSON.stringify({
          module: 'LEAVE',
          action: 'APPROVE_LEAVE',
          confidence: 0.98,
          params: { targetName: 'Priya', status: 'APPROVED' },
          summary: "Identified leave request approval for Priya Sharma",
          requiresConfirmation: true,
        });
      }
      if (userText.includes('punch') || userText.includes('attendance') || userText.includes("hasn't punched") || userText.includes('clock in')) {
        return JSON.stringify({
          module: 'TIME',
          action: 'CHECK_ABSENT_PUNCHES',
          confidence: 0.95,
          params: { date: 'today' },
          summary: 'Querying employees without an active punch-in today',
          requiresConfirmation: false,
        });
      }
      if (userText.includes('welcome') || userText.includes('new joiner') || userText.includes('email all')) {
        return JSON.stringify({
          module: 'EMAIL',
          action: 'BULK_SEND_TEMPLATE',
          confidence: 0.94,
          params: { template: 'welcome-onboarding', audience: 'new_hires' },
          summary: 'Preparing bulk email dispatch with welcome template to all onboarding hires',
          requiresConfirmation: true,
        });
      }
      return JSON.stringify({
        module: 'CORE_HCM',
        action: 'GENERAL_QUERY',
        confidence: 0.88,
        params: { query: prompt },
        summary: `Processed query: "${prompt.slice(0, 40)}..."`,
        requiresConfirmation: false,
      });
    }

    // Autocoding Agent
    if (lower.includes('autocoding') || lower.includes('modulespec') || lower.includes('vaccination')) {
      return JSON.stringify({
        name: 'Vaccination & Health Tracker',
        slug: 'vaccination-tracker',
        icon: 'ShieldCheck',
        description: 'Track COVID-19 and corporate vaccination compliance records across all locations.',
        fields: [
          { name: 'employeeName', label: 'Employee Name', type: 'text', required: true },
          { name: 'vaccineType', label: 'Vaccine Type', type: 'select', options: ['Pfizer', 'Moderna', 'Johnson & Johnson', 'Covishield', 'Flu Shot'], required: true },
          { name: 'doseNumber', label: 'Dose', type: 'select', options: ['1st Dose', '2nd Dose', 'Booster 1', 'Booster 2'], required: true },
          { name: 'administeredDate', label: 'Date Administered', type: 'date', required: true },
          { name: 'certificateNumber', label: 'Certificate / Batch #', type: 'text', required: false },
          { name: 'status', label: 'Verification Status', type: 'badge', options: ['VERIFIED', 'PENDING_REVIEW', 'EXEMPT'], default: 'PENDING_REVIEW' },
        ],
        tableColumns: ['employeeName', 'vaccineType', 'doseNumber', 'administeredDate', 'status'],
        charts: [
          { type: 'pie', title: 'Vaccination Status Breakdown', field: 'status' },
          { type: 'bar', title: 'Doses by Vaccine Type', field: 'vaccineType' },
        ],
        permissions: ['HR_ADMIN', 'MANAGER'],
      });
    }

    // Email Drafting Agent (check before candidate matching because email
    // prompts commonly include a candidate recipient context).
    if (lower.includes('email') || lower.includes('draft')) {
      return JSON.stringify({
        subject: 'Welcome to the NextDay Team - Your Onboarding Journey Begins!',
        bodyHtml: `<p>Dear {{firstName}},</p><p>We are thrilled to officially welcome you to the team as our new <strong>{{jobTitle}}</strong>! Your first day is scheduled for <strong>{{startDate}}</strong>.</p><p>We've prepared your personalized onboarding portal with your checklist and welcome resources. Please feel free to reach out to {{managerName}} with any questions.</p><p>Welcome aboard,<br/>The NextDay People Operations Team</p>`,
        tone: 'professional_warm',
      });
    }

    // Resume Screening / Inbound Agent
    if (lower.includes('resume') || lower.includes('candidate') || lower.includes('score')) {
      return JSON.stringify({
        aiScore: 92,
        aiSummary: 'Strong candidate with 6+ years in full-stack architecture, React, Node.js, and cloud systems. Exceptional problem solver with enterprise HR tech experience.',
        extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'GraphQL', 'System Design'],
        matchHighlights: [
          'Direct experience architecting microservices and real-time feeds',
          'Proficient with modern TypeScript monorepos and TailwindCSS',
          'Lead developer on enterprise SaaS products',
        ],
        stageRecommendation: 'INTERVIEW',
        suggestedInterviewSlots: [
          'Tomorrow at 2:00 PM EST',
          'Thursday at 11:00 AM EST',
          'Friday at 4:00 PM EST',
        ],
      });
    }

    // Interview Questions Generator
    if (lower.includes('interview') && lower.includes('question')) {
      return JSON.stringify({
        technicalQuestions: [
          'How would you enforce strict tenant data isolation in a multi-tenant PostgreSQL database with RLS?',
          'Explain how you would handle race conditions in an attendance live-punch system with thousands of concurrent workers.',
          'Describe your experience with event-driven architectures using Redis BullMQ queues.',
        ],
        behavioralQuestions: [
          'Describe a situation where an autonomous AI workflow produced an unexpected output. How did you resolve and safeguard it?',
          'How do you mentor junior developers while driving tight enterprise release timelines?',
        ],
        rubric: {
          systemDesign: 'Weight 40% - evaluates scalability, cache strategy, and concurrency',
          codeQuality: 'Weight 35% - evaluates clean TS, tests, and security principles',
          communication: 'Weight 25% - clarity of thought and trade-off justification',
        },
      });
    }

    // Document OCR Agent
    if (lower.includes('ocr') || lower.includes('document')) {
      return JSON.stringify({
        documentType: 'GOVERNMENT_ID',
        confidence: 0.98,
        fields: {
          fullName: 'Jane Doe',
          documentNumber: 'ID-884920491',
          issueDate: '2021-05-14',
          expiryDate: '2031-05-14',
          issuingAuthority: 'State Department',
        },
        isValid: true,
        flags: [],
      });
    }

    // Attendance Anomaly Agent
    if (lower.includes('anomaly') || lower.includes('attendance')) {
      return JSON.stringify({
        hasAnomaly: true,
        type: 'MISSING_PUNCH_OUT',
        severity: 'MEDIUM',
        suggestedAction: 'AUTO_RESOLVE_WITH_STANDARD_SHIFT',
        resolutionNote: 'Employee clocked in at 9:02 AM but missed punch-out. Standard 8-hour shift applied pending manager tap.',
      });
    }

    // Expense Auditor Agent
    if (lower.includes('expense') || lower.includes('audit')) {
      return JSON.stringify({
        isCompliant: true,
        auditScore: 0.96,
        policyFlags: [],
        autoApproved: true,
        lineItems: [
          { description: 'Cloud Services & Dev Tools', amount: 48.0, category: 'SOFTWARE' },
          { description: 'Ergonomic Desk Accessory', amount: 75.0, category: 'OFFICE' },
        ],
        reason: 'All items within monthly team reimbursement limit under $150. No alcohol or disallowed items detected.',
      });
    }

    // General fallback
    return `Analysis completed successfully. NextDay AI engine evaluated the parameters and verified compliance against corporate policy.`;
  }
}

export const llm = new LLMClient();
