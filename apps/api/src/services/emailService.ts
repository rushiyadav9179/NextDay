import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export interface SendEmailOptions {
  tenantId: string;
  templateId?: string;
  to: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  variables?: Record<string, any>;
  scheduledAt?: Date;
}

export interface BulkSendOptions {
  tenantId: string;
  templateId?: string;
  recipients: Array<{
    to: string;
    recipientName?: string;
    variables?: Record<string, any>;
  }>;
  subject: string;
  bodyHtml: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
        this.isConfigured = true;
      } catch {
        this.isConfigured = false;
      }
    }
  }

  /**
   * Compiles Handlebars template with provided context variables
   */
  compileTemplate(bodyHtml: string, variables: Record<string, any> = {}): string {
    try {
      const template = Handlebars.compile(bodyHtml);
      return template(variables);
    } catch {
      return bodyHtml;
    }
  }

  /**
   * Sends a single email (or records as SIMULATED if no SMTP configured)
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; logId: string; status: string }> {
    const compiledBody = this.compileTemplate(options.bodyHtml, options.variables || {});
    const compiledSubject = this.compileTemplate(options.subject, options.variables || {});

    let status = 'SIMULATED';
    let errorMessage: string | undefined = undefined;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: env.SMTP_FROM,
          to: options.to,
          subject: compiledSubject,
          html: compiledBody,
        });
        status = 'SENT';
      } catch (err: any) {
        status = 'FAILED';
        errorMessage = err?.message || 'SMTP delivery failure';
        console.warn('SMTP Send Failed:', err);
      }
    } else {
      console.log(`[SIMULATED EMAIL] To: ${options.to} | Subject: "${compiledSubject}"`);
    }

    // Persist to EmailLog
    const log = await prisma.emailLog.create({
      data: {
        tenantId: options.tenantId,
        templateId: options.templateId,
        recipientEmail: options.to,
        recipientName: options.recipientName,
        subject: compiledSubject,
        bodyHtml: compiledBody,
        status,
        errorMessage,
        meta: options.variables || {},
      },
    });

    return { success: status !== 'FAILED', logId: log.id, status };
  }

  /**
   * Bulk sends templated emails with per-recipient merged variables
   */
  async sendBulk(options: BulkSendOptions): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of options.recipients) {
      try {
        const result = await this.sendEmail({
          tenantId: options.tenantId,
          templateId: options.templateId,
          to: recipient.to,
          recipientName: recipient.recipientName,
          subject: options.subject,
          bodyHtml: options.bodyHtml,
          variables: recipient.variables || {},
        });

        if (result.success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: options.recipients.length, sent, failed };
  }
}

export const emailService = new EmailService();
