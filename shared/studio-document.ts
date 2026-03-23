import {
  COMPONENT_TYPES,
  type EmbedComponentOption,
  type EmbedComponentType,
  type StudioAction,
  type StudioDiagnostic,
  type StudioDocument,
  type StudioEmbedDraft,
  type StudioModalDefinition,
  type StudioNode,
} from "./schema";
import {
  buildStudioTokenDiagnostics,
  type StudioTokenAvailability,
} from "./studio-tokens";

const URL_PATTERN = /^https?:\/\/\S+$/i;
const DISCORD_LIMITS = {
  messageContent: 2000,
  embedsPerMessage: 10,
  embedTitle: 256,
  embedDescription: 4096,
  embedFields: 25,
  embedFieldName: 256,
  embedFieldValue: 1024,
  embedFooter: 2048,
  embedAuthor: 256,
  embedTotal: 6000,
  buttonLabel: 80,
  customId: 100,
  selectPlaceholder: 150,
  selectOptions: 25,
  modalTitle: 45,
  modalFields: 5,
  modalFieldLabel: 45,
  modalFieldPlaceholder: 100,
} as const;

export interface StudioSerializedView {
  content: string;
  embeds: StudioEmbedDraft[];
  interactiveComponents: EmbedComponentType[];
  diagnostics: StudioDiagnostic[];
  viewId: string;
}

export interface StudioDocumentRenderOptions {
  tokenAvailability?: StudioTokenAvailability;
}

function safeText(value: unknown) {
  return String(value || "").trim();
}

function isHttpUrl(value: unknown) {
  const raw = safeText(value);
  return raw.length === 0 || URL_PATTERN.test(raw);
}

function pushDiagnostic(
  diagnostics: StudioDiagnostic[],
  level: StudioDiagnostic["level"],
  code: string,
  message: string,
  path?: string,
) {
  diagnostics.push({ level, code, message, path });
}

function pushTokenDiagnostics(
  diagnostics: StudioDiagnostic[],
  value: unknown,
  path: string,
  options?: StudioDocumentRenderOptions,
) {
  const text = typeof value === "string" ? value : String(value || "");
  if (!text) return;
  diagnostics.push(...buildStudioTokenDiagnostics(text, path, options?.tokenAvailability));
}

function getView(document: StudioDocument, requestedViewId?: string) {
  const requested = requestedViewId || document.meta.entryViewId;
  return document.views[requested] || document.views[document.meta.entryViewId];
}

function embedCharCount(embed: StudioEmbedDraft) {
  let total = 0;
  total += safeText(embed.title).length;
  total += safeText(embed.description).length;
  total += safeText(embed.authorName).length;
  total += safeText(embed.footerText).length;
  for (const field of embed.fields || []) {
    total += safeText(field.name).length;
    total += safeText(field.value).length;
  }
  return total;
}

function buildDividerText(props: Record<string, unknown>) {
  const mode = String(props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(props.repeat || 5)));
  if (mode === "emoji") {
    const emoji = String(props.emoji || "✨");
    return Array.from({ length: repeat }, () => emoji).join(" ");
  }
  if (mode === "symbol") {
    const symbol = String(props.symbol || "•");
    return Array.from({ length: repeat }, () => symbol).join(" ");
  }
  if (mode === "stacked") {
    const text = String(props.text || "────");
    return Array.from({ length: Math.min(3, repeat) }, () => text).join("\n");
  }
  return String(props.text || "────────");
}

function buildStyleBlockEmbed(node: StudioNode): StudioEmbedDraft {
  const variant = String(node.props.variant || "warning_strip");
  const titleByVariant: Record<string, string> = {
    warning_strip: "Warning",
    rules_block: "Rules",
    locked_access: "Locked Access",
    archive_card: "Archive",
    red_alert: "Alert",
    spotlight_card: "Spotlight",
  };

  return {
    title: String(node.props.title || titleByVariant[variant] || "Notice"),
    description: String(node.props.description || node.props.text || ""),
    color: String(node.props.accentColor || "#B11226"),
  };
}

function appendContentPart(parts: string[], nextValue?: string | null) {
  const value = safeText(nextValue);
  if (!value) return;
  parts.push(value);
}

function validateEmbed(
  embed: StudioEmbedDraft,
  path: string,
  diagnostics: StudioDiagnostic[],
  options?: StudioDocumentRenderOptions,
) {
  pushTokenDiagnostics(diagnostics, embed.title, `${path}.title`, options);
  pushTokenDiagnostics(diagnostics, embed.description, `${path}.description`, options);
  pushTokenDiagnostics(diagnostics, embed.authorName, `${path}.authorName`, options);
  pushTokenDiagnostics(diagnostics, embed.footerText, `${path}.footerText`, options);
  if (safeText(embed.title).length > DISCORD_LIMITS.embedTitle) {
    pushDiagnostic(diagnostics, "error", "EMBED_TITLE_LIMIT", "Embed title exceeds 256 characters.", `${path}.title`);
  }
  if (safeText(embed.description).length > DISCORD_LIMITS.embedDescription) {
    pushDiagnostic(diagnostics, "error", "EMBED_DESCRIPTION_LIMIT", "Embed description exceeds 4096 characters.", `${path}.description`);
  }
  if (safeText(embed.authorName).length > DISCORD_LIMITS.embedAuthor) {
    pushDiagnostic(diagnostics, "error", "EMBED_AUTHOR_LIMIT", "Embed author name exceeds 256 characters.", `${path}.authorName`);
  }
  if (safeText(embed.footerText).length > DISCORD_LIMITS.embedFooter) {
    pushDiagnostic(diagnostics, "error", "EMBED_FOOTER_LIMIT", "Embed footer text exceeds 2048 characters.", `${path}.footerText`);
  }
  if (!isHttpUrl(embed.authorUrl)) {
    pushDiagnostic(diagnostics, "error", "EMBED_AUTHOR_URL_INVALID", "Embed author URL must be a valid http(s) URL.", `${path}.authorUrl`);
  }
  if (!isHttpUrl(embed.url)) {
    pushDiagnostic(diagnostics, "error", "EMBED_URL_INVALID", "Embed title URL must be a valid http(s) URL.", `${path}.url`);
  }
  if (!isHttpUrl(embed.imageUrl)) {
    pushDiagnostic(diagnostics, "error", "EMBED_IMAGE_URL_INVALID", "Embed image URL must be a valid http(s) URL.", `${path}.imageUrl`);
  }
  if (!isHttpUrl(embed.thumbnailUrl)) {
    pushDiagnostic(diagnostics, "error", "EMBED_THUMB_URL_INVALID", "Embed thumbnail URL must be a valid http(s) URL.", `${path}.thumbnailUrl`);
  }
  if (!isHttpUrl(embed.footerIconUrl)) {
    pushDiagnostic(diagnostics, "error", "EMBED_FOOTER_ICON_URL_INVALID", "Embed footer icon URL must be a valid http(s) URL.", `${path}.footerIconUrl`);
  }
  if (!isHttpUrl(embed.authorIconUrl)) {
    pushDiagnostic(diagnostics, "error", "EMBED_AUTHOR_ICON_URL_INVALID", "Embed author icon URL must be a valid http(s) URL.", `${path}.authorIconUrl`);
  }

  const fields = embed.fields || [];
  if (fields.length > DISCORD_LIMITS.embedFields) {
    pushDiagnostic(diagnostics, "error", "EMBED_FIELD_LIMIT", "Embed contains more than 25 fields.", `${path}.fields`);
  }
  fields.forEach((field, index) => {
    const fieldPath = `${path}.fields[${index}]`;
    pushTokenDiagnostics(diagnostics, field.name, `${fieldPath}.name`, options);
    pushTokenDiagnostics(diagnostics, field.value, `${fieldPath}.value`, options);
    if (safeText(field.name).length === 0) {
      pushDiagnostic(diagnostics, "warning", "EMBED_FIELD_NAME_EMPTY", "Field name is empty.", `${fieldPath}.name`);
    }
    if (safeText(field.value).length === 0) {
      pushDiagnostic(diagnostics, "warning", "EMBED_FIELD_VALUE_EMPTY", "Field value is empty.", `${fieldPath}.value`);
    }
    if (safeText(field.name).length > DISCORD_LIMITS.embedFieldName) {
      pushDiagnostic(diagnostics, "error", "EMBED_FIELD_NAME_LIMIT", "Field name exceeds 256 characters.", `${fieldPath}.name`);
    }
    if (safeText(field.value).length > DISCORD_LIMITS.embedFieldValue) {
      pushDiagnostic(diagnostics, "error", "EMBED_FIELD_VALUE_LIMIT", "Field value exceeds 1024 characters.", `${fieldPath}.value`);
    }
  });

  if (embedCharCount(embed) > DISCORD_LIMITS.embedTotal) {
    pushDiagnostic(diagnostics, "error", "EMBED_TOTAL_LIMIT", "Embed text content exceeds 6000 characters.", path);
  }
}

function validateAction(
  action: StudioAction,
  document: StudioDocument,
  diagnostics: StudioDiagnostic[],
  path: string,
) {
  if (action.type === "open_modal" && !document.modals[action.modalId || ""]) {
    pushDiagnostic(diagnostics, "error", "MODAL_REFERENCE_MISSING", "Action points to a modal that does not exist.", `${path}.modalId`);
  }
  if ((action.type === "goto_view" || action.type === "back_view") && action.targetViewId && !document.views[action.targetViewId]) {
    pushDiagnostic(diagnostics, "error", "VIEW_REFERENCE_MISSING", "Action points to a missing view.", `${path}.targetViewId`);
  }
  if (action.type === "cancel_view" && action.fallbackViewId && !document.views[action.fallbackViewId]) {
    pushDiagnostic(diagnostics, "error", "VIEW_FALLBACK_MISSING", "Cancel action points to a missing fallback view.", `${path}.fallbackViewId`);
  }
  if (action.type === "open_url" && !isHttpUrl(action.url)) {
    pushDiagnostic(diagnostics, "error", "ACTION_URL_INVALID", "Open link action needs a valid http(s) URL.", `${path}.url`);
  }
  if ((action.type === "channel_message" || action.type === "log_action") && safeText(action.channelId).length === 0) {
    pushDiagnostic(diagnostics, "warning", "ACTION_CHANNEL_MISSING", "Action target channel is not configured.", `${path}.channelId`);
  }
  if ((action.type === "role_add" || action.type === "role_remove" || action.type === "role_toggle") && safeText(action.roleId).length === 0) {
    pushDiagnostic(diagnostics, "warning", "ACTION_ROLE_MISSING", "Role action has no role selected.", `${path}.roleId`);
  }
}

function validateModal(modal: StudioModalDefinition, diagnostics: StudioDiagnostic[], path: string) {
  if (safeText(modal.title).length === 0) {
    pushDiagnostic(diagnostics, "error", "MODAL_TITLE_EMPTY", "Modal title is required.", `${path}.title`);
  }
  if (safeText(modal.title).length > DISCORD_LIMITS.modalTitle) {
    pushDiagnostic(diagnostics, "error", "MODAL_TITLE_LIMIT", "Modal title exceeds 45 characters.", `${path}.title`);
  }
  if (safeText(modal.customIdSeed).length > DISCORD_LIMITS.customId) {
    pushDiagnostic(diagnostics, "error", "MODAL_CUSTOM_ID_LIMIT", "Modal custom id seed exceeds 100 characters.", `${path}.customIdSeed`);
  }
  if ((modal.fields || []).length === 0) {
    pushDiagnostic(diagnostics, "warning", "MODAL_FIELDS_EMPTY", "Modal has no fields.", `${path}.fields`);
  }
  if ((modal.fields || []).length > DISCORD_LIMITS.modalFields) {
    pushDiagnostic(diagnostics, "error", "MODAL_FIELDS_LIMIT", "Modal has more than 5 fields.", `${path}.fields`);
  }
  (modal.fields || []).forEach((field, index) => {
    const fieldPath = `${path}.fields[${index}]`;
    if (safeText(field.label).length === 0) {
      pushDiagnostic(diagnostics, "error", "MODAL_FIELD_LABEL_EMPTY", "Modal field label is required.", `${fieldPath}.label`);
    }
    if (safeText(field.label).length > DISCORD_LIMITS.modalFieldLabel) {
      pushDiagnostic(diagnostics, "error", "MODAL_FIELD_LABEL_LIMIT", "Modal field label exceeds 45 characters.", `${fieldPath}.label`);
    }
    if (safeText(field.placeholder).length > DISCORD_LIMITS.modalFieldPlaceholder) {
      pushDiagnostic(diagnostics, "error", "MODAL_FIELD_PLACEHOLDER_LIMIT", "Modal field placeholder exceeds 100 characters.", `${fieldPath}.placeholder`);
    }
  });
}

function validateNodeReferences(
  document: StudioDocument,
  node: StudioNode,
  diagnostics: StudioDiagnostic[],
  path: string,
  options?: StudioDocumentRenderOptions,
) {
  if (node.type === "text_display") {
    pushTokenDiagnostics(diagnostics, node.props.text, `${path}.props.text`, options);
  }

  if (node.type === "button") {
    pushTokenDiagnostics(diagnostics, node.props.label, `${path}.props.label`, options);
  }

  if (node.type === "section" || node.type === "container") {
    pushTokenDiagnostics(diagnostics, node.props.heading, `${path}.props.heading`, options);
    pushTokenDiagnostics(diagnostics, node.props.description, `${path}.props.description`, options);
  }

  if (node.type === "style_block") {
    pushTokenDiagnostics(diagnostics, node.props.title, `${path}.props.title`, options);
    pushTokenDiagnostics(diagnostics, node.props.description, `${path}.props.description`, options);
  }

  if (node.type === "file") {
    pushTokenDiagnostics(diagnostics, node.props.label, `${path}.props.label`, options);
  }

  if (["string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    pushTokenDiagnostics(diagnostics, node.props.label, `${path}.props.label`, options);
    pushTokenDiagnostics(diagnostics, node.props.placeholder, `${path}.props.placeholder`, options);
  }

  if (node.type === "button") {
    if (!node.actionId) {
      pushDiagnostic(diagnostics, "warning", "BUTTON_ACTION_EMPTY", "Button has no action bound.", `${path}.actionId`);
    } else if (!document.actions[node.actionId]) {
      pushDiagnostic(diagnostics, "error", "BUTTON_ACTION_MISSING", "Button action reference is missing.", `${path}.actionId`);
    }

    if (safeText(node.props.label).length > DISCORD_LIMITS.buttonLabel) {
      pushDiagnostic(diagnostics, "error", "BUTTON_LABEL_LIMIT", "Button label exceeds 80 characters.", `${path}.props.label`);
    }
    if (safeText(node.props.customId).length > DISCORD_LIMITS.customId) {
      pushDiagnostic(diagnostics, "error", "BUTTON_CUSTOM_ID_LIMIT", "Button custom id exceeds 100 characters.", `${path}.props.customId`);
    }
  }

  if (["string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    if (safeText(node.props.customId).length > DISCORD_LIMITS.customId) {
      pushDiagnostic(diagnostics, "error", "SELECT_CUSTOM_ID_LIMIT", "Select custom id exceeds 100 characters.", `${path}.props.customId`);
    }
    if (safeText(node.props.placeholder).length > DISCORD_LIMITS.selectPlaceholder) {
      pushDiagnostic(diagnostics, "error", "SELECT_PLACEHOLDER_LIMIT", "Select placeholder exceeds 150 characters.", `${path}.props.placeholder`);
    }
  }

  if (node.type === "string_select") {
    const options = Array.isArray(node.props.options) ? node.props.options : [];
    if (options.length === 0) {
      pushDiagnostic(diagnostics, "warning", "SELECT_OPTIONS_EMPTY", "String select menu has no options.", `${path}.props.options`);
    }
    if (options.length > DISCORD_LIMITS.selectOptions) {
      pushDiagnostic(diagnostics, "error", "SELECT_OPTIONS_LIMIT", "String select menu has more than 25 options.", `${path}.props.options`);
    }
    options.forEach((option: any, index) => {
      const optionPath = `${path}.props.options[${index}]`;
      const optionLabel = safeText(option?.label);
      const optionValue = safeText(option?.value);
      if (!optionLabel) {
        pushDiagnostic(diagnostics, "warning", "SELECT_OPTION_LABEL_EMPTY", "Select option label is empty.", `${optionPath}.label`);
      }
      if (!optionValue) {
        pushDiagnostic(diagnostics, "warning", "SELECT_OPTION_VALUE_EMPTY", "Select option value is empty.", `${optionPath}.value`);
      }
      if (optionLabel.length > 100) {
        pushDiagnostic(diagnostics, "error", "SELECT_OPTION_LABEL_LIMIT", "Select option label exceeds 100 characters.", `${optionPath}.label`);
      }
      if (safeText(option?.description).length > 100) {
        pushDiagnostic(diagnostics, "error", "SELECT_OPTION_DESCRIPTION_LIMIT", "Select option description exceeds 100 characters.", `${optionPath}.description`);
      }
      const actionId = optionValue ? node.optionActionIds?.[optionValue] : undefined;
      if (optionValue && actionId && !document.actions[actionId]) {
        pushDiagnostic(diagnostics, "error", "SELECT_OPTION_ACTION_MISSING", "Select option action reference is missing.", `${path}.optionActionIds.${optionValue}`);
      }
      if (optionValue && !actionId && !node.actionId) {
        pushDiagnostic(diagnostics, "warning", "SELECT_OPTION_ACTION_EMPTY", "Select option has no action bound.", optionPath);
      }
    });
  }

  if (node.type === "action_row") {
    const children = node.childIds.map((id) => document.nodes[id]).filter(Boolean);
    const buttonCount = children.filter((child) => child.type === "button").length;
    const selectCount = children.filter((child) => child.type !== "button").length;
    if (children.length > 5) {
      pushDiagnostic(diagnostics, "error", "ROW_CHILD_LIMIT", "Action row has more than 5 items.", path);
    }
    if (buttonCount > 5) {
      pushDiagnostic(diagnostics, "error", "ROW_BUTTON_LIMIT", "Action row has more than 5 buttons.", path);
    }
    if (selectCount > 1) {
      pushDiagnostic(diagnostics, "error", "ROW_SELECT_LIMIT", "Action row can only contain one select menu.", path);
    }
    if (buttonCount > 0 && selectCount > 0) {
      pushDiagnostic(diagnostics, "warning", "ROW_MIXED_TYPES", "Action row mixes buttons and select menus.", path);
    }
  }

  if (node.type === "file" && !isHttpUrl(node.props.url)) {
    pushDiagnostic(diagnostics, "warning", "FILE_URL_INVALID", "File block URL is invalid.", `${path}.props.url`);
  }

  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    if (items.length === 0) {
      pushDiagnostic(diagnostics, "warning", "MEDIA_ITEMS_EMPTY", "Media gallery has no items.", `${path}.props.items`);
    }
    items.forEach((item: any, index) => {
      if (!isHttpUrl(item?.url)) {
        pushDiagnostic(diagnostics, "warning", "MEDIA_URL_INVALID", "Media item URL is invalid.", `${path}.props.items[${index}].url`);
      }
    });
  }

  if (["role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    pushDiagnostic(
      diagnostics,
      "info",
      "RUNTIME_GATED_SELECT",
      `${node.type.replace(/_/g, " ")} is schema-ready but currently runtime-gated.`,
      path,
    );
  }
}

function validateTree(
  document: StudioDocument,
  viewId: string,
  diagnostics: StudioDiagnostic[],
  options?: StudioDocumentRenderOptions,
) {
  const visited = new Set<string>();
  const view = document.views[viewId];
  if (!view) return;

  const walk = (nodeId: string, path: string) => {
    const node = document.nodes[nodeId];
    if (!node) {
      pushDiagnostic(diagnostics, "error", "NODE_MISSING", `Missing node ${nodeId}.`, path);
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    if (node.viewId !== viewId) {
      pushDiagnostic(diagnostics, "warning", "NODE_VIEW_MISMATCH", "Node belongs to a different view.", path);
    }

    validateNodeReferences(document, node, diagnostics, `nodes.${node.id}`, options);
    node.childIds.forEach((childId, index) => walk(childId, `${path}.childIds[${index}]`));
  };

  view.rootNodeIds.forEach((nodeId, index) => walk(nodeId, `views.${view.id}.rootNodeIds[${index}]`));
}

function renderInteractiveNode(
  document: StudioDocument,
  nodeId: string,
): EmbedComponentType | null {
  const node = document.nodes[nodeId];
  if (!node) return null;

  if (node.type === "button") {
    const action = node.actionId ? document.actions[node.actionId] : undefined;
    return {
      type: COMPONENT_TYPES.BUTTON,
      id: node.id,
      customId: safeText(node.props.customId) || node.id,
      label: String(node.props.label || "Button"),
      style: Number(node.props.style || 1),
      emoji: safeText(node.props.emoji) || undefined,
      disabled: Boolean(node.props.disabled || action?.disabled),
      url: action?.type === "open_url" ? action.url : undefined,
      action,
    };
  }

  const selectTypes: Array<StudioNode["type"]> = ["string_select", "role_select", "user_select", "channel_select", "mentionable_select"];
  if (selectTypes.includes(node.type)) {
    const options = Array.isArray(node.props.options) ? node.props.options : [];
    const preparedOptions: EmbedComponentOption[] = options.slice(0, 25).map((option: any) => {
      const value = String(option?.value || option?.id || `option_${Math.random().toString(36).slice(2, 8)}`);
      const optionActionId = node.optionActionIds?.[value];
      return {
        label: String(option?.label || "Option"),
        value,
        description: safeText(option?.description) || undefined,
        emoji: safeText(option?.emoji) || undefined,
        default: Boolean(option?.default),
        action: optionActionId ? document.actions[optionActionId] : undefined,
      };
    });

    return {
      type: COMPONENT_TYPES.SELECT_MENU,
      id: node.id,
      selectKind: node.type === "string_select"
        ? "string"
        : node.type === "role_select"
          ? "role"
          : node.type === "user_select"
            ? "user"
            : node.type === "channel_select"
              ? "channel"
              : "mentionable",
      customId: safeText(node.props.customId) || node.id,
      label: String(node.props.label || "Select Menu"),
      placeholder: String(node.props.placeholder || "Choose an option"),
      disabled: Boolean(node.props.disabled),
      minValues: Number(node.props.minValues || 1),
      maxValues: Number(node.props.maxValues || 1),
      defaultValues: Array.isArray(node.props.defaultValues) ? node.props.defaultValues.map((value) => String(value)) : undefined,
      channelTypes: Array.isArray(node.props.channelTypes) ? node.props.channelTypes.map((value) => String(value)) : undefined,
      options: preparedOptions,
      action: node.actionId ? document.actions[node.actionId] : undefined,
    };
  }

  return null;
}

export function collectStudioDiagnostics(
  document: StudioDocument,
  requestedViewId?: string,
  options?: StudioDocumentRenderOptions,
) {
  const diagnostics: StudioDiagnostic[] = [];
  const view = getView(document, requestedViewId);

  if (!view) {
    pushDiagnostic(diagnostics, "error", "VIEW_NOT_FOUND", "Selected view no longer exists.", "views");
    return diagnostics;
  }

  const viewPath = `views.${view.id}`;
  pushTokenDiagnostics(diagnostics, view.messageContent, `${viewPath}.messageContent`, options);

  if (safeText(view.messageContent).length > DISCORD_LIMITS.messageContent) {
    pushDiagnostic(
      diagnostics,
      "error",
      "MESSAGE_CONTENT_LIMIT",
      "Message content exceeds 2000 characters.",
      `${viewPath}.messageContent`,
    );
  }

  if (!safeText(view.messageContent) && (view.embeds || []).length === 0 && (view.rootNodeIds || []).length === 0) {
    pushDiagnostic(diagnostics, "info", "EMPTY_MESSAGE", "This view has no publishable content yet.", viewPath);
  }

  if ((view.embeds || []).length > DISCORD_LIMITS.embedsPerMessage) {
    pushDiagnostic(diagnostics, "error", "EMBED_LIMIT", "Discord allows up to 10 embeds per message.", `${viewPath}.embeds`);
  }

  let totalEmbedChars = 0;
  (view.embeds || []).forEach((embed, index) => {
    const embedPath = `${viewPath}.embeds[${index}]`;
    validateEmbed(embed, embedPath, diagnostics, options);
    totalEmbedChars += embedCharCount(embed);
  });
  if (totalEmbedChars > DISCORD_LIMITS.embedTotal) {
    pushDiagnostic(
      diagnostics,
      "error",
      "EMBED_TEXT_TOTAL_LIMIT",
      "Combined embed text exceeds 6000 characters.",
      `${viewPath}.embeds`,
    );
  }

  validateTree(document, view.id, diagnostics, options);

  Object.values(document.actions).forEach((action) => {
    validateAction(action, document, diagnostics, `actions.${action.id}`);
  });

  Object.values(document.modals).forEach((modal) => {
    validateModal(modal, diagnostics, `modals.${modal.id}`);
    (modal.submitActionIds || []).forEach((actionId) => {
      if (!document.actions[actionId]) {
        pushDiagnostic(
          diagnostics,
          "error",
          "MODAL_SUBMIT_ACTION_MISSING",
          "Modal submit action reference is missing.",
          `modals.${modal.id}.submitActionIds`,
        );
      }
    });
  });

  return diagnostics;
}

export function serializeStudioDocumentView(
  document: StudioDocument,
  requestedViewId?: string,
  options?: StudioDocumentRenderOptions,
): StudioSerializedView {
  const diagnostics = collectStudioDiagnostics(document, requestedViewId, options);
  const view = getView(document, requestedViewId);
  if (!view) {
    return {
      content: "",
      embeds: [],
      interactiveComponents: [],
      diagnostics,
      viewId: document.meta.entryViewId,
    };
  }

  const contentParts: string[] = [];
  appendContentPart(contentParts, view.messageContent);
  const embeds: StudioEmbedDraft[] = Array.isArray(view.embeds) ? [...view.embeds] : [];
  const interactiveComponents: EmbedComponentType[] = [];

  const visit = (nodeId: string) => {
    const node = document.nodes[nodeId];
    if (!node) return;

    switch (node.type) {
      case "container":
      case "section":
        appendContentPart(contentParts, node.props.heading ? `**${String(node.props.heading)}**` : "");
        appendContentPart(contentParts, node.props.description ? String(node.props.description) : "");
        node.childIds.forEach(visit);
        return;
      case "text_display":
        appendContentPart(contentParts, String(node.props.text || ""));
        return;
      case "divider":
        appendContentPart(contentParts, buildDividerText(node.props));
        return;
      case "style_block":
        embeds.push(buildStyleBlockEmbed(node));
        return;
      case "media_gallery": {
        const items = Array.isArray(node.props.items) ? node.props.items : [];
        items.slice(0, 4).forEach((item: any) => {
          const url = safeText(item?.url);
          if (!url) return;
          embeds.push({
            title: String(node.props.title || ""),
            description: String(item?.description || ""),
            imageUrl: url,
            color: String(node.props.accentColor || "#5865F2"),
          });
        });
        return;
      }
      case "file": {
        const url = safeText(node.props.url);
        if (url) appendContentPart(contentParts, `[${String(node.props.label || "Attachment")}](${url})`);
        return;
      }
      case "action_row": {
        const children = node.childIds
          .map((childId) => renderInteractiveNode(document, childId))
          .filter((entry): entry is EmbedComponentType => Boolean(entry));
        if (children.length > 0) {
          interactiveComponents.push({
            type: COMPONENT_TYPES.ACTION_ROW,
            components: children,
          });
        }
        return;
      }
      case "button":
      case "string_select":
      case "role_select":
      case "user_select":
      case "channel_select":
      case "mentionable_select": {
        const component = renderInteractiveNode(document, node.id);
        if (component) interactiveComponents.push(component);
        return;
      }
      default:
        return;
    }
  };

  view.rootNodeIds.forEach(visit);

  return {
    content: contentParts.join("\n\n").trim(),
    embeds: embeds.slice(0, 10),
    interactiveComponents,
    diagnostics,
    viewId: view.id,
  };
}
