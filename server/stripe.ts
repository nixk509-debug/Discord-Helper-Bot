import type { Express } from "express";
import { requireAuth } from "./auth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export function registerStripeRoutes(app: Express) {
  app.get("/api/premium/key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch {
      res.status(503).json({ message: "Stripe not configured" });
    }
  });

  app.get("/api/premium/status", requireAuth, async (req, res) => {
    const ownerIds = (process.env.OWNER_IDS || "").split(",").filter(Boolean);
    const isOwner = ownerIds.includes(req.user!.discordId);

    if (isOwner) {
      return res.json({ isPremium: true, reason: "owner", subscription: null });
    }

    if (req.user!.stripeSubscriptionId) {
      try {
        const result = await db.execute(
          sql`SELECT * FROM stripe.subscriptions WHERE id = ${req.user!.stripeSubscriptionId}`
        );
        const sub = result.rows[0];
        if (sub && (sub.status === "active" || sub.status === "trialing")) {
          return res.json({ isPremium: true, reason: "subscription", subscription: sub });
        }
      } catch {}
    }

    res.json({ isPremium: req.user!.isPremium || false, reason: "none", subscription: null });
  });

  app.post("/api/premium/checkout", requireAuth, async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ message: "priceId is required" });
      }

      let customerId = req.user!.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user!.email || undefined,
          metadata: { discordId: req.user!.discordId, userId: String(req.user!.id) },
        });
        customerId = customer.id;
        await db
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, req.user!.id));
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/premium?success=true`,
        cancel_url: `${baseUrl}/premium?canceled=true`,
        metadata: { userId: String(req.user!.id) },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err.message);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/premium/portal", requireAuth, async (req, res) => {
    try {
      if (!req.user!.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: req.user!.stripeCustomerId,
        return_url: `${baseUrl}/premium`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Portal error:", err.message);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.get("/api/premium/products", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT p.id, p.name, p.description, p.metadata,
               pr.id as price_id, pr.unit_amount, pr.currency, pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);
      res.json(result.rows);
    } catch {
      res.json([]);
    }
  });
}
