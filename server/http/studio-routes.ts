import type { Express, Request } from "express";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { api } from "@shared/routes";
import type { StudioLibraryCategory, StudioLibraryScope } from "@shared/schema";
import { getOwnerSessionServerIds } from "../auth";
import {
  createStudioDocumentRecord,
  createStudioLibraryItem,
  deleteStudioDocumentRecord,
  deleteStudioLibraryItemRecord,
  getStudioDocumentById,
  getStudioLibraryItemById,
  getStudioPublicationById,
  listStudioDocuments,
  listStudioLibraryItems,
  listStudioPublicationSnapshots,
  listStudioPublications,
  listStudioRuntimeEvents,
  normalizeStudioDocument,
  updateStudioDocumentRecord,
  updateStudioLibraryItemRecord,
  updateStudioPublicationRecord,
} from "../studio-service";

const STUDIO_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "studio");

type StudioOwnedScope = "personal" | "server" | "starter";
type StudioOwnedResource = { serverId: number; scope?: string | null; ownerUserId?: number | null };

export interface StudioRouteAccessDependencies {
  getStudioActorUserId: (req: Request) => number | null;
  normalizeStudioOwnedScope: (req: Request, scope: StudioOwnedScope) => StudioOwnedScope | "server";
  hasStudioRecordAccess: (req: Request, resource: StudioOwnedResource) => Promise<boolean>;
}

function sanitizeStudioUploadName(value: string) {
  const trimmed = value.trim().toLowerCase();
  const stem = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return stem.slice(0, 40) || "studio-asset";
}

function parseStudioImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.replace("image/", "");

  return { mimeType, buffer, extension };
}

export function registerStudioRoutes(app: Express, dependencies: StudioRouteAccessDependencies) {
  app.use("/api/studio", async (req, res, next) => {
    const ownerServerIds = getOwnerSessionServerIds(req as any);
    if (!ownerServerIds?.length) return next();

    const documentMatch = req.path.match(/^\/documents\/(\d+)(?:\/|$)/);
    if (documentMatch) {
      const document = await getStudioDocumentById(Number.parseInt(documentMatch[1], 10));
      if (!document) return res.status(404).json({ message: "Studio document not found" });
      if (!ownerServerIds.includes(document.serverId)) {
        return res.status(403).json({ message: "Owner access is limited to the configured dashboard servers." });
      }
      return next();
    }

    const libraryMatch = req.path.match(/^\/library\/(\d+)(?:\/|$)/);
    if (libraryMatch) {
      const item = await getStudioLibraryItemById(Number.parseInt(libraryMatch[1], 10));
      if (!item) return res.status(404).json({ message: "Studio library item not found" });
      if (!ownerServerIds.includes(item.serverId)) {
        return res.status(403).json({ message: "Owner access is limited to the configured dashboard servers." });
      }
      return next();
    }

    const publicationMatch = req.path.match(/^\/publications\/(\d+)(?:\/|$)/);
    if (publicationMatch) {
      const publication = await getStudioPublicationById(Number.parseInt(publicationMatch[1], 10));
      if (!publication) return res.status(404).json({ message: "Studio publication not found" });
      if (!ownerServerIds.includes(publication.serverId)) {
        return res.status(403).json({ message: "Owner access is limited to the configured dashboard servers." });
      }
      return next();
    }

    return next();
  });

  app.get(api.servers.studioDocuments.list.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const items = await listStudioDocuments(serverId, dependencies.getStudioActorUserId(req as Request));
    res.json(items);
  });

  app.post(api.servers.studioDocuments.create.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioDocuments.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const document = normalizeStudioDocument(parsed.data.document, parsed.data.name);
    const scope = dependencies.normalizeStudioOwnedScope(req as Request, parsed.data.scope);
    const created = await createStudioDocumentRecord({
      serverId,
      ownerUserId: dependencies.getStudioActorUserId(req as Request),
      scope,
      kind: parsed.data.kind,
      name: parsed.data.name,
      slug: parsed.data.slug,
      moduleBinding: parsed.data.moduleBinding || null,
      document,
      isArchived: parsed.data.isArchived,
    });
    res.status(201).json(created);
  });

  app.patch(api.studio.documents.update.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });

    const existing = await getStudioDocumentById(id);
    if (!existing) return res.status(404).json({ message: "Document not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, existing))) {
      return res.status(403).json({ message: "Not allowed to edit this document" });
    }

    const parsed = api.studio.documents.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioDocumentRecord(id, {
      ...parsed.data,
      document: parsed.data.document ? normalizeStudioDocument(parsed.data.document, existing.name) : existing.document,
    } as any);
    res.json(updated);
  });

  app.delete(api.studio.documents.delete.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });

    const existing = await getStudioDocumentById(id);
    if (!existing) return res.status(404).json({ message: "Document not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, existing))) {
      return res.status(403).json({ message: "Not allowed to delete this document" });
    }

    await deleteStudioDocumentRecord(id);
    res.status(204).send();
  });

  app.get(api.servers.studioLibrary.list.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const scopeRaw = String(req.query.scope || "all");
    const categoryRaw = String(req.query.category || "all");
    const scope = (["all", "personal", "server"] as const).includes(scopeRaw as any) ? (scopeRaw as "all" | StudioLibraryScope) : "all";
    const category = ([
      "all",
      "divider",
      "symbol",
      "emoji",
      "format",
      "style_block",
      "style_pack",
      "asset_link",
      "snippet",
    ] as const).includes(categoryRaw as any)
      ? (categoryRaw as "all" | StudioLibraryCategory)
      : "all";
    const search = typeof req.query.q === "string" ? req.query.q : "";
    const favoritesOnly = String(req.query.favorites || "").toLowerCase() === "true" || String(req.query.favorites || "") === "1";

    const items = await listStudioLibraryItems(serverId, dependencies.getStudioActorUserId(req as Request), {
      scope,
      category,
      search,
      favoritesOnly,
    });
    res.json(items);
  });

  app.post(api.servers.studioLibrary.create.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioLibrary.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const scope = dependencies.normalizeStudioOwnedScope(req as Request, parsed.data.scope);
    const created = await createStudioLibraryItem({
      serverId,
      ownerUserId: dependencies.getStudioActorUserId(req as Request),
      scope,
      category: parsed.data.category,
      name: parsed.data.name,
      payload: parsed.data.payload,
      tags: parsed.data.tags,
      favorite: parsed.data.favorite,
    });
    res.status(201).json(created);
  });

  app.post(api.servers.studioUploads.create.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioUploads.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const decoded = parseStudioImageDataUrl(parsed.data.dataUrl);
    if (!decoded) {
      return res.status(400).json({ message: "Upload must be a PNG, JPG, GIF, or WEBP image." });
    }
    if (decoded.buffer.byteLength > 8 * 1024 * 1024) {
      return res.status(400).json({ message: "Upload is too large. Keep images under 8 MB." });
    }

    const safeName = sanitizeStudioUploadName(parsed.data.name);
    const fileName = `${safeName}-${crypto.randomUUID().slice(0, 8)}.${decoded.extension}`;
    const serverFolder = path.join(STUDIO_UPLOAD_ROOT, String(serverId));
    await fs.mkdir(serverFolder, { recursive: true });
    await fs.writeFile(path.join(serverFolder, fileName), decoded.buffer);

    const origin = process.env.PUBLIC_BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const publicUrl = new URL(`/uploads/studio/${serverId}/${fileName}`, origin).toString();
    const libraryItem = await createStudioLibraryItem({
      serverId,
      ownerUserId: dependencies.getStudioActorUserId(req as Request),
      scope: dependencies.normalizeStudioOwnedScope(req as Request, parsed.data.scope),
      category: "asset_link",
      name: parsed.data.name.trim(),
      payload: { url: publicUrl, mimeType: decoded.mimeType, source: "upload" },
      tags: ["asset", "uploaded", "image"],
      favorite: false,
    });

    res.status(201).json({ url: publicUrl, name: parsed.data.name.trim(), libraryItem });
  });

  app.patch(api.studio.library.update.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, existing))) {
      return res.status(403).json({ message: "Not allowed to edit this item" });
    }

    const parsed = api.studio.library.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const patch: any = { ...parsed.data };
    if (patch.scope === "personal") {
      patch.scope = dependencies.normalizeStudioOwnedScope(req as Request, patch.scope);
      patch.ownerUserId = patch.scope === "personal" ? dependencies.getStudioActorUserId(req as Request) : null;
    }
    if (patch.scope === "server") patch.ownerUserId = null;

    const updated = await updateStudioLibraryItemRecord(id, patch);
    res.json(updated);
  });

  app.patch(api.studio.library.favorite.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, existing))) {
      return res.status(403).json({ message: "Not allowed to edit this item" });
    }

    const parsed = api.studio.library.favorite.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioLibraryItemRecord(id, { favorite: parsed.data.favorite } as any);
    res.json(updated);
  });

  app.delete(api.studio.library.delete.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, existing))) {
      return res.status(403).json({ message: "Not allowed to delete this item" });
    }
    await deleteStudioLibraryItemRecord(id);
    res.status(204).send();
  });

  app.get(api.servers.studioPublications.list.path, async (req, res) => {
    const serverId = Number.parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const publications = await listStudioPublications(serverId);
    const events = await listStudioRuntimeEvents(serverId);
    const eventMap = new Map<number, any[]>();
    for (const event of events) {
      if (!event.publicationId) continue;
      const current = eventMap.get(event.publicationId) || [];
      current.push(event);
      eventMap.set(event.publicationId, current);
    }

    const payload = await Promise.all(publications.map(async (publication) => ({
      ...publication,
      documentName: (await getStudioDocumentById(publication.documentId))?.name || `Document ${publication.documentId}`,
      snapshots: (await listStudioPublicationSnapshots(publication.id)).slice(0, 10),
      recentEvents: (eventMap.get(publication.id) || []).slice(0, 5),
    })));
    res.json(payload);
  });

  app.post(api.studio.publications.archive.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const publication = await getStudioPublicationById(id);
    if (!publication) return res.status(404).json({ message: "Publication not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, publication))) {
      return res.status(403).json({ message: "Not allowed to archive this publication" });
    }

    const updated = await updateStudioPublicationRecord(id, { active: false, status: "archived" });
    res.json(updated);
  });

  app.patch(api.studio.publications.status.path, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const publication = await getStudioPublicationById(id);
    if (!publication) return res.status(404).json({ message: "Publication not found" });
    if (!(await dependencies.hasStudioRecordAccess(req as Request, publication))) {
      return res.status(403).json({ message: "Not allowed to update this publication" });
    }

    const parsed = api.studio.publications.status.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioPublicationRecord(id, parsed.data);
    res.json(updated);
  });
}
