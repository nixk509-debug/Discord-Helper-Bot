import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'Payload must be a Buffer. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    let sync;
    try {
      sync = await getStripeSync();
    } catch (err: any) {
      // if the sync helper is unavailable the route should have been disabled;
      // this defensive check protects a self‑hosted install from crashing if a
      // stray webhook is received.
      throw new Error(
        `Stripe sync not configured: ${err.message || 'unknown reason'}`
      );
    }

    await sync.processWebhook(payload, signature);
  }
}
