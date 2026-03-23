import { z } from "zod";

export const SITE_EDITOR_SCHEMA_VERSION = 1;

export const siteEditorSurfaceKeySchema = z.enum(["landing", "login", "dashboard_shell"]);
export type SiteEditorSurfaceKey = z.infer<typeof siteEditorSurfaceKeySchema>;

export const siteEditorFieldKindSchema = z.enum([
  "text",
  "textarea",
  "image_url",
  "link_url",
  "badge_text",
  "button_label",
  "color_token",
]);
export type SiteEditorFieldKind = z.infer<typeof siteEditorFieldKindSchema>;

export const siteEditorFieldSchema = z
  .object({
    key: z.string().min(1),
    kind: siteEditorFieldKindSchema,
    label: z.string().min(1),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    value: z.string(),
  })
  .strict();
export type SiteEditorField = z.infer<typeof siteEditorFieldSchema>;

export const siteEditorSectionSchema = z
  .object({
    schemaVersion: z.number().int().default(SITE_EDITOR_SCHEMA_VERSION),
    id: z.string().min(1),
    type: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    visible: z.boolean().default(true),
    order: z.number().int().default(0),
    fields: z.array(siteEditorFieldSchema),
  })
  .strict();
export type SiteEditorSection = z.infer<typeof siteEditorSectionSchema>;

export const siteEditorSurfaceDocumentSchema = z
  .object({
    schemaVersion: z.number().int().default(SITE_EDITOR_SCHEMA_VERSION),
    surface: siteEditorSurfaceKeySchema,
    sections: z.array(siteEditorSectionSchema),
  })
  .strict();
export type SiteEditorSurfaceDocument = z.infer<typeof siteEditorSurfaceDocumentSchema>;

export const siteEditorSurfaceStateSchema = z
  .object({
    surfaceKey: siteEditorSurfaceKeySchema,
    label: z.string(),
    schemaVersion: z.number().int().default(SITE_EDITOR_SCHEMA_VERSION),
    draftContent: siteEditorSurfaceDocumentSchema,
    publishedContent: siteEditorSurfaceDocumentSchema,
    hasUnpublishedChanges: z.boolean(),
    updatedAt: z.string().nullable(),
    publishedAt: z.string().nullable(),
    updatedByUserId: z.number().nullable(),
    publishedByUserId: z.number().nullable(),
    updatedByLabel: z.string().nullable(),
    publishedByLabel: z.string().nullable(),
  })
  .strict();
export type SiteEditorSurfaceState = z.infer<typeof siteEditorSurfaceStateSchema>;

export const siteEditorSaveDraftRequestSchema = z
  .object({
    draftContent: siteEditorSurfaceDocumentSchema,
  })
  .strict();

export const siteEditorPublishResponseSchema = siteEditorSurfaceStateSchema;

export const SITE_EDITOR_SURFACE_LABELS: Record<SiteEditorSurfaceKey, string> = {
  landing: "Landing",
  login: "Login",
  dashboard_shell: "Dashboard Shell",
};

function createField(
  key: string,
  kind: SiteEditorFieldKind,
  label: string,
  value: string,
  options?: { description?: string; placeholder?: string },
): SiteEditorField {
  return {
    key,
    kind,
    label,
    value,
    description: options?.description,
    placeholder: options?.placeholder,
  };
}

function createSection(
  id: string,
  type: string,
  label: string,
  order: number,
  fields: SiteEditorField[],
  options?: { visible?: boolean; description?: string },
): SiteEditorSection {
  return {
    schemaVersion: SITE_EDITOR_SCHEMA_VERSION,
    id,
    type,
    label,
    description: options?.description,
    visible: options?.visible ?? true,
    order,
    fields,
  };
}

function buildLandingDefaults(): SiteEditorSurfaceDocument {
  return {
    schemaVersion: SITE_EDITOR_SCHEMA_VERSION,
    surface: "landing",
    sections: [
      createSection(
        "hero",
        "hero",
        "Hero",
        0,
        [
          createField("badgePrimary", "badge_text", "Primary Badge", "Command-first"),
          createField("badgeSecondary", "badge_text", "Secondary Badge", "Live Discord workspace"),
          createField("titleLineOne", "text", "Title Line One", "Build the server."),
          createField("titleAccent", "text", "Accent Title", "Not a pile of modules."),
          createField(
            "body",
            "textarea",
            "Body Copy",
            "Archivist turns triggers, conditions, message design, and server behavior into one dark control workspace.",
          ),
          createField("primaryCtaLabel", "button_label", "Primary Button", "Go to Dashboard"),
          createField("secondaryCtaLabel", "button_label", "Secondary Button", "Login with Discord"),
        ],
        { description: "Main hero copy and primary calls to action." },
      ),
      createSection(
        "metrics",
        "metrics",
        "Metrics",
        1,
        [
          createField("serversLabel", "text", "Servers Label", "Servers"),
          createField("membersLabel", "text", "Members Label", "Members"),
          createField("commandsLabel", "text", "Commands Label", "Commands"),
          createField("statusLabel", "text", "Status Label", "Status"),
        ],
        { description: "Labels shown above the live landing page stats." },
      ),
      createSection(
        "product_rows",
        "feature_rows",
        "Core Systems",
        2,
        [
          createField("eyebrow", "text", "Eyebrow", "Core systems"),
          createField("title", "text", "Title", "Three systems. One product."),
          createField("row1Title", "text", "Row 1 Title", "Custom Commands"),
          createField(
            "row1Body",
            "textarea",
            "Row 1 Description",
            "Triggers, filters, conditions, roles, messages, delays, and branching in one command system.",
          ),
          createField("row2Title", "text", "Row 2 Title", "Design Studio"),
          createField(
            "row2Body",
            "textarea",
            "Row 2 Description",
            "Live Discord message building with drafts, reusable layouts, components, and visual feedback.",
          ),
          createField("row3Title", "text", "Row 3 Title", "Fun & Creative"),
          createField(
            "row3Body",
            "textarea",
            "Row 3 Description",
            "Lighter community tools that stay sharp, useful, and secondary to the real workspace.",
          ),
        ],
      ),
      createSection(
        "preview_panel",
        "preview_panel",
        "Preview Panel",
        3,
        [
          createField("eyebrow", "text", "Eyebrow", "Product preview"),
          createField("title", "text", "Title", "A real workspace, not a promo screen."),
          createField("feature1Label", "text", "Feature 1 Label", "Quick access"),
          createField(
            "feature1Body",
            "textarea",
            "Feature 1 Body",
            "Find commands, drafts, and logs without leaving the workspace.",
          ),
          createField("feature2Label", "text", "Feature 2 Label", "Command safety"),
          createField(
            "feature2Body",
            "textarea",
            "Feature 2 Body",
            "Filters, permissions, conditions, and action flow stay visible while you build.",
          ),
          createField("feature3Label", "text", "Feature 3 Label", "Studio linked"),
          createField(
            "feature3Body",
            "textarea",
            "Feature 3 Body",
            "Pick saved message designs directly inside command actions.",
          ),
        ],
      ),
      createSection(
        "copy_points",
        "copy_points",
        "Copy Points",
        4,
        [
          createField("eyebrow", "text", "Eyebrow", "Built for Discord owners"),
          createField("title", "text", "Title", "Short copy. Clear control. Real outcomes."),
          createField(
            "point1",
            "textarea",
            "Point 1",
            "Welcome, verify, moderation, and rules flows belong inside Custom Commands.",
          ),
          createField(
            "point2",
            "textarea",
            "Point 2",
            "Design Studio drafts plug directly into command actions instead of living on their own island.",
          ),
          createField(
            "point3",
            "textarea",
            "Point 3",
            "Fun & Creative stays present, but never overwhelms the command engine.",
          ),
          createField(
            "point4",
            "textarea",
            "Point 4",
            "Everything stays dark, sharp, and mobile-usable without turning into stacked marketing boxes.",
          ),
        ],
      ),
      createSection(
        "final_cta",
        "final_cta",
        "Final Call To Action",
        5,
        [
          createField("eyebrow", "text", "Eyebrow", "Open the workspace"),
          createField("title", "text", "Title", "Step into Archivist."),
          createField(
            "body",
            "textarea",
            "Body Copy",
            "Use the dashboard if you are ready to build. Invite the bot if the server connection comes first.",
          ),
          createField("primaryCtaLabel", "button_label", "Primary Button", "Open Dashboard"),
          createField("secondaryCtaLabel", "button_label", "Secondary Button", "Login with Discord"),
        ],
      ),
    ],
  };
}

function buildLoginDefaults(): SiteEditorSurfaceDocument {
  return {
    schemaVersion: SITE_EDITOR_SCHEMA_VERSION,
    surface: "login",
    sections: [
      createSection(
        "hero",
        "hero",
        "Hero",
        0,
        [
          createField("eyebrow", "text", "Eyebrow", "Secure sign-in"),
          createField("title", "text", "Title", "Step into the server workspace."),
          createField(
            "body",
            "textarea",
            "Body Copy",
            "Sign in with Discord to open Custom Commands, Design Studio, Fun and Creative tools, and the live Archivist control shell.",
          ),
          createField("chip1", "badge_text", "Chip 1", "Custom Commands"),
          createField("chip2", "badge_text", "Chip 2", "Design Studio"),
          createField("chip3", "badge_text", "Chip 3", "Server Settings"),
        ],
      ),
      createSection(
        "login_intro",
        "intro",
        "Login Intro",
        1,
        [
          createField("eyebrow", "text", "Eyebrow", "Login"),
          createField("title", "text", "Title", "Authenticate with Discord."),
          createField(
            "body",
            "textarea",
            "Body Copy",
            "Archivist only uses the connection needed to access your server list and workspace context.",
          ),
        ],
      ),
      createSection(
        "trust_points",
        "trust_points",
        "Trust Points",
        2,
        [
          createField("point1", "text", "Point 1", "Server list access only"),
          createField("point2", "text", "Point 2", "No message reading"),
          createField("point3", "text", "Point 3", "Revoke anytime from Discord"),
        ],
      ),
      createSection(
        "discord_login",
        "discord_login",
        "Discord Login",
        3,
        [
          createField("buttonLabel", "button_label", "Button Label", "Login with Discord"),
          createField(
            "disabledCopy",
            "textarea",
            "Disabled State Copy",
            "Discord login is not configured on this deployment right now.",
          ),
        ],
      ),
      createSection(
        "owner_access",
        "owner_access",
        "Owner Access",
        4,
        [
          createField("title", "text", "Title", "Owner Access"),
          createField(
            "body",
            "textarea",
            "Body Copy",
            "Private Archivist sign-in for direct dashboard editing without Discord OAuth. This only works when owner credentials are configured on the server.",
          ),
          createField("usernameLabel", "text", "Username Label", "Owner Username"),
          createField("usernamePlaceholder", "text", "Username Placeholder", "owner"),
          createField("passwordLabel", "text", "Password Label", "Owner Password"),
          createField(
            "passwordPlaceholder",
            "text",
            "Password Placeholder",
            "Enter the private owner password",
          ),
          createField("buttonLabel", "button_label", "Button Label", "Open Owner Workspace"),
        ],
      ),
      createSection(
        "footer_copy",
        "footer_copy",
        "Footer Copy",
        5,
        [
          createField("tagline", "text", "Tagline", "Mobile-first. Dark workspace. Real server control."),
        ],
      ),
    ],
  };
}

function buildDashboardShellDefaults(): SiteEditorSurfaceDocument {
  return {
    schemaVersion: SITE_EDITOR_SCHEMA_VERSION,
    surface: "dashboard_shell",
    sections: [
      createSection(
        "workspace_brand",
        "workspace_brand",
        "Workspace Brand",
        0,
        [
          createField("brandName", "text", "Brand Name", "Archivist"),
          createField("mobileTagline", "text", "Mobile Tagline", "Mobile Control Center"),
          createField(
            "sidebarBannerImageUrl",
            "image_url",
            "Sidebar Banner Image",
            "",
            {
              description: "Optional image URL for the mobile sidebar banner header.",
              placeholder: "https://...",
            },
          ),
          createField("desktopSectionLabel", "text", "Desktop Badge", "Section"),
          createField("workspaceBadgeLabel", "badge_text", "Workspace Badge", "Workspace"),
        ],
      ),
      createSection(
        "shell_copy",
        "shell_copy",
        "Shell Copy",
        1,
        [
          createField("searchPlaceholder", "text", "Search Placeholder", "Search commands, drafts, logs"),
          createField("inviteButtonLabel", "button_label", "Invite Button Label", "Invite Archivist"),
          createField(
            "inviteButtonBody",
            "textarea",
            "Invite Button Body",
            "Re-add the bot if it was removed.",
          ),
          createField("footerTitle", "text", "Footer Title", "Directive"),
          createField(
            "footerBody",
            "textarea",
            "Footer Body",
            "Keep the first view simple. Let the drawer reveal the deeper system only when the user asks for it.",
          ),
        ],
      ),
      createSection(
        "empty_states",
        "empty_states",
        "Empty States",
        2,
        [
          createField("serverFallback", "text", "Server Fallback", "Server"),
          createField("dashboardFallback", "text", "Dashboard Fallback", "Archivist"),
        ],
      ),
    ],
  };
}

export function buildDefaultSiteEditorDocument(surface: SiteEditorSurfaceKey): SiteEditorSurfaceDocument {
  switch (surface) {
    case "landing":
      return buildLandingDefaults();
    case "login":
      return buildLoginDefaults();
    case "dashboard_shell":
      return buildDashboardShellDefaults();
  }
}

function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStringValue(input: unknown, fallback: string) {
  return typeof input === "string" ? input : fallback;
}

function getIncomingFieldMap(section: unknown) {
  if (!section || typeof section !== "object" || !Array.isArray((section as any).fields)) {
    return new Map<string, unknown>();
  }

  return new Map<string, unknown>(
    (section as any).fields
      .filter((field: unknown) => field && typeof field === "object" && typeof (field as any).key === "string")
      .map((field: any) => [field.key, field]),
  );
}

function getIncomingSectionMap(value: unknown) {
  if (!value || typeof value !== "object" || !Array.isArray((value as any).sections)) {
    return new Map<string, unknown>();
  }

  return new Map<string, unknown>(
    (value as any).sections
      .filter((section: unknown) => section && typeof section === "object" && typeof (section as any).id === "string")
      .map((section: any) => [section.id, section]),
  );
}

export function normalizeSiteEditorDocument(
  surface: SiteEditorSurfaceKey,
  input?: unknown,
): SiteEditorSurfaceDocument {
  const defaults = cloneDocument(buildDefaultSiteEditorDocument(surface));
  const incomingSections = getIncomingSectionMap(input);

  const normalizedSections = defaults.sections.map((defaultSection, defaultIndex) => {
    const incomingSection = incomingSections.get(defaultSection.id);
    const incomingFieldMap = getIncomingFieldMap(incomingSection);
    const visible =
      incomingSection && typeof (incomingSection as any).visible === "boolean"
        ? Boolean((incomingSection as any).visible)
        : defaultSection.visible;
    const orderValue = incomingSection && Number.isFinite((incomingSection as any).order)
      ? Number((incomingSection as any).order)
      : defaultSection.order;

    const fields = defaultSection.fields.map((defaultField) => {
      const incomingField = incomingFieldMap.get(defaultField.key) as any;
      return {
        ...defaultField,
        value: normalizeStringValue(incomingField?.value, defaultField.value),
      };
    });

    return {
      ...defaultSection,
      visible,
      order: Number.isInteger(orderValue) ? orderValue : defaultIndex,
      fields,
    };
  });

  normalizedSections.sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return defaults.sections.findIndex((section) => section.id === left.id) -
      defaults.sections.findIndex((section) => section.id === right.id);
  });

  return {
    schemaVersion: SITE_EDITOR_SCHEMA_VERSION,
    surface,
    sections: normalizedSections,
  };
}

export function getSiteEditorFieldValue(
  document: SiteEditorSurfaceDocument,
  sectionId: string,
  fieldKey: string,
  fallback = "",
) {
  const section = document.sections.find((entry) => entry.id === sectionId);
  const field = section?.fields.find((entry) => entry.key === fieldKey);
  return field?.value ?? fallback;
}

export function areSiteEditorDocumentsEqual(left: SiteEditorSurfaceDocument, right: SiteEditorSurfaceDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}
