import { Agent, AgentContext, AgentResult } from './types.js';
import { prisma } from '../db/prisma.js';

class AgentRegistry {
  private agents = new Map<string, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  async runAgent(
    agentId: string,
    ctx: AgentContext
  ): Promise<AgentResult> {
    const agent = this.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id "${agentId}" not found in registry.`);
    }

    const startTime = Date.now();
    let agentRunRecord: any = null;

    try {
      // 1. Create AgentRun entry
      agentRunRecord = await prisma.agentRun.create({
        data: {
          tenantId: ctx.tenantId,
          agentId: agent.id,
          agentName: agent.name,
          status: 'RUNNING',
          inputParams: ctx.params,
          logs: [`Agent ${agent.name} triggered with params`, `Execution mode: ${process.env.GEMINI_API_KEY?.trim() ? 'provider' : 'mock'}`],
          startedAt: new Date(),
        },
      });

      // 2. Stream event via Socket.IO if available
      if (ctx.socketEmitter) {
        ctx.socketEmitter('agent:run:started', {
          runId: agentRunRecord.id,
          agentId: agent.id,
          agentName: agent.name,
          timestamp: new Date().toISOString(),
        });
      }

      // 3. Execute agent logic
      const result = await agent.run(ctx);
      const durationMs = Date.now() - startTime;

      // 4. Update AgentRun
      await prisma.agentRun.update({
        where: { id: agentRunRecord.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          outputData: result.data || {},
          durationMs,
          completedAt: new Date(),
          logs: [
            ...agentRunRecord.logs,
            `Completed in ${durationMs}ms: ${result.summary}`,
          ],
        },
      });

      // 5. Create immutable AiAuditTrail
      await prisma.aiAuditTrail.create({
        data: {
          tenantId: ctx.tenantId,
          agentName: agent.name,
          triggerType: ctx.params?.triggerType || 'USER_COMMAND',
          promptInput: JSON.stringify({ executionMode: process.env.GEMINI_API_KEY?.trim() ? 'PROVIDER' : 'MOCK', params: ctx.params }).slice(0, 4000),
          agentOutput: JSON.stringify({ executionMode: process.env.GEMINI_API_KEY?.trim() ? 'PROVIDER' : 'MOCK', result: result.data || result.summary }).slice(0, 4000),
          executionTimeMs: durationMs,
          status: result.success ? 'SUCCESS' : 'FAILED',
          error: result.error,
        },
      });

      // 6. Broadcast completion
      if (ctx.socketEmitter) {
        ctx.socketEmitter('agent:run:completed', {
          runId: agentRunRecord.id,
          agentId: agent.id,
          agentName: agent.name,
          success: result.success,
          durationMs,
          result: result.data,
          summary: result.summary,
        });
      }

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err?.message || 'Agent execution failure';

      if (agentRunRecord) {
        await prisma.agentRun.update({
          where: { id: agentRunRecord.id },
          data: {
            status: 'FAILED',
            durationMs,
            completedAt: new Date(),
            logs: [...(agentRunRecord.logs || []), `Error: ${errorMessage}`],
          },
        }).catch(() => {});

        await prisma.aiAuditTrail.create({
          data: {
            tenantId: ctx.tenantId,
            agentName: agent.name,
            triggerType: ctx.params?.triggerType || 'USER_COMMAND',
            promptInput: JSON.stringify({ executionMode: process.env.GEMINI_API_KEY?.trim() ? 'PROVIDER' : 'MOCK', params: ctx.params }).slice(0, 4000),
            agentOutput: '',
            executionTimeMs: durationMs,
            status: 'FAILED',
            error: errorMessage,
          },
        }).catch(() => {});
      }

      if (ctx.socketEmitter) {
        ctx.socketEmitter('agent:run:failed', {
          agentId: agent.id,
          error: errorMessage,
        });
      }

      return {
        success: false,
        data: null,
        summary: `Execution failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }
}

export const agentRegistry = new AgentRegistry();
