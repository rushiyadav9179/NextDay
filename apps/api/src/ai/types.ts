export interface AgentContext {
  tenantId: string;
  userId?: string;
  params: Record<string, any>;
  socketEmitter?: (event: string, payload: any) => void;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any, ctx: AgentContext) => Promise<any>;
}

export interface AgentResult {
  success: boolean;
  data: any;
  summary: string;
  metrics?: Record<string, any>;
  error?: string;
}

export interface Agent {
  id: string;
  name: string;
  category: 'RECRUITING' | 'ONBOARDING' | 'WORKFORCE' | 'FINANCE' | 'COMPLIANCE' | 'SYSTEM';
  description: string;
  tools: AgentTool[];
  run: (ctx: AgentContext) => Promise<AgentResult>;
}
