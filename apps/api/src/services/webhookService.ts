import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

export class WebhookService {
  /**
   * Dispatches an event to all registered webhooks for a tenant matching the event name
   */
  async dispatchEvent(tenantId: string, event: string, payload: Record<string, any>): Promise<void> {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      });

      const matchingWebhooks = webhooks.filter(
        (wh) => wh.events.includes('*') || wh.events.includes(event)
      );

      for (const webhook of matchingWebhooks) {
        this.deliverWebhook(webhook, event, payload).catch((err) => {
          console.warn(`Webhook delivery failed for ${webhook.url}:`, err);
        });
      }
    } catch (err) {
      console.warn('Webhook dispatch error:', err);
    }
  }

  /**
   * Signs payload with HMAC-SHA256 and delivers HTTP POST
   */
  private async deliverWebhook(webhook: any, event: string, payload: any): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify({
      id: crypto.randomUUID(),
      event,
      timestamp,
      data: payload,
    });

    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${bodyString}`)
      .digest('hex');

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NextDay-Signature': `t=${timestamp},v1=${signature}`,
          'X-NextDay-Event': event,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = res.status;
      responseBody = (await res.text()).slice(0, 1000);
    } catch (err: any) {
      error = err.message || 'Delivery request failed';
    }

    // Record delivery attempt
    await prisma.webhookDelivery.create({
      data: {
        tenantId: webhook.tenantId,
        webhookId: webhook.id,
        event,
        payload,
        statusCode,
        responseBody,
        error,
        attempt: 1,
      },
    }).catch(() => {});
  }
}

export const webhookService = new WebhookService();
