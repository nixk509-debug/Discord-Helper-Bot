import {
  COMPONENT_TYPES,
  type EmbedComponentOption,
  type EmbedComponentType,
  type StudioDiagnostic,
  type StudioDocument,
  type StudioDraftMode,
  type StudioEmbedDraft,
  type StudioNode,
  type StudioNormalizedNode,
  type StudioPublishNodeOutcome,
  type StudioPublishPlan,
} from "./schema";
import { collectStudioDiagnostics, type StudioDocumentRenderOptions } from "./studio-document";
import { createMigratedStudioDocument, getStudioNodePath, isUploadedStudioAssetUrl } from "./studio/migrate";

const URL_PATTERN = /^https?:\/\/\S+$/i;
const COMPONENTS_V2_FLAG = 32768;
const INTERACTIVE_NODE_TYPES = new Set([
  "action_row",
  "button",
  "string_select",
  "role_select",
  "user_select",
  "channel_select",
  "mentionable_select",
]);
const LAYOUT_NODE_TYPES = new Set([
  "container",
  "section",
  "text_display",
  "media_gallery",
  "file",
  "divider",
  "style_block",
]);

interface StudioNodePlanResult {
  exactComponent?: EmbedComponentType;
  standardContentParts: string[];
  standardEmbeds: StudioEmbedDraft[];
  standardComponents: EmbedComponentType[];
  standardAttachments: NonNullable<StudioPublishPlan["liveMessage"]["attachments"]>;
  normalizedNodes: StudioNormalizedNode[];
  outcomes: StudioPublishNodeOutcome[];
  usesLayoutComponents: boolean;
  usesContentComponents: boolean;
  usesInteractiveComponents: boolean;
  missingCustomIdCount: number;
  missingHandlerBindingCount: number;
  invalidMediaConfiguration: boolean;
  blocked: boolean;
  downgraded: boolean;
}

function safeText(value: unknown) {
  return String(value || "").trim();
}

function isHttpUrl(value: unknown) {
  const raw = safeText(value);
  return raw.length > 0 && URL_PATTERN.test(raw);
}

function getView(document: StudioDocument, requestedViewId?: string) {
  const requested = requestedViewId || document.meta.entryViewId;
  return document.views[requested] || document.views[document.meta.entryViewId];
}

function buildDividerText(props: Record<string, unknown>) {
  const mode = String(props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(props.repeat || 5)));
  if (mode === "emoji") {
    const emoji = String(props.emoji || "*");
    return Array.from({ length: repeat }, () => emoji).join(" ");
  }
  if (mode === "symbol") {
    const symbol = String(props.symbol || "*");
    return Array.from({ length: repeat }, () => symbol).join(" ");
  }
  if (mode === "stacked") {
    const text = String(props.text || "----");
    return Array.from({ length: Math.min(3, repeat) }, () => text).join("\n");
  }
  return String(props.text || "--------");
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

function makeOutcome(
  node: StudioNode,
  status: "exact" | "downgraded" | "blocked",
  reason: string,
  extra?: Partial<StudioPublishNodeOutcome>,
): StudioPublishNodeOutcome {
  return {
    nodeId: node.id,
    nodeType: node.type,
    status,
    reason,
    ...extra,
  };
}

function makeNormalizedNode(
  node: StudioNode,
  mode: StudioDraftMode,
  intent: StudioNormalizedNode["intent"],
  exact: boolean,
  detail: string,
): StudioNormalizedNode {
  return {
    nodeId: node.id,
    nodeType: node.type,
    path: getStudioNodePath(node),
    mode,
    intent,
    exact,
    detail,
  };
}

function emptyResult(node?: StudioNode): StudioNodePlanResult {
  return {
    exactComponent: undefined,
    standardContentParts: [],
    standardEmbeds: [],
    standardComponents: [],
    standardAttachments: [],
    normalizedNodes: node ? [makeNormalizedNode(node, "standard", "unsupported", false, "Missing or unsupported node.")] : [],
    outcomes: node ? [makeOutcome(node, "blocked", "Missing or unsupported node.")] : [],
    usesLayoutComponents: node ? LAYOUT_NODE_TYPES.has(node.type) : false,
    usesContentComponents: node ? !INTERACTIVE_NODE_TYPES.has(node.type) : false,
    usesInteractiveComponents: node ? INTERACTIVE_NODE_TYPES.has(node.type) : false,
    missingCustomIdCount: 0,
    missingHandlerBindingCount: 0,
    invalidMediaConfiguration: false,
    blocked: true,
    downgraded: false,
  };
}

function mergeResults(results: StudioNodePlanResult[]): StudioNodePlanResult {
  return results.reduce<StudioNodePlanResult>((merged, next) => ({
    exactComponent: undefined,
    standardContentParts: [...merged.standardContentParts, ...next.standardContentParts],
    standardEmbeds: [...merged.standardEmbeds, ...next.standardEmbeds],
    standardComponents: [...merged.standardComponents, ...next.standardComponents],
    standardAttachments: [...merged.standardAttachments, ...next.standardAttachments],
    normalizedNodes: [...merged.normalizedNodes, ...next.normalizedNodes],
    outcomes: [...merged.outcomes, ...next.outcomes],
    usesLayoutComponents: merged.usesLayoutComponents || next.usesLayoutComponents,
    usesContentComponents: merged.usesContentComponents || next.usesContentComponents,
    usesInteractiveComponents: merged.usesInteractiveComponents || next.usesInteractiveComponents,
    missingCustomIdCount: merged.missingCustomIdCount + next.missingCustomIdCount,
    missingHandlerBindingCount: merged.missingHandlerBindingCount + next.missingHandlerBindingCount,
    invalidMediaConfiguration: merged.invalidMediaConfiguration || next.invalidMediaConfiguration,
    blocked: merged.blocked || next.blocked,
    downgraded: merged.downgraded || next.downgraded,
  }), {
    exactComponent: undefined,
    standardContentParts: [],
    standardEmbeds: [],
    standardComponents: [],
    standardAttachments: [],
    normalizedNodes: [],
    outcomes: [],
    usesLayoutComponents: false,
    usesContentComponents: false,
    usesInteractiveComponents: false,
    missingCustomIdCount: 0,
    missingHandlerBindingCount: 0,
    invalidMediaConfiguration: false,
    blocked: false,
    downgraded: false,
  });
}

function mapButtonComponent(document: StudioDocument, node: StudioNode) {
  const action = node.actionId ? document.actions[node.actionId] : undefined;
  const customId = safeText(node.props.customId);

  if (!action && Number(node.props.style || 1) !== 5 && !customId) {
    return {
      component: null,
      missingCustomIdCount: customId ? 0 : 1,
      missingHandlerBindingCount: 1,
      reason: `${safeText(node.props.label) || "Button"} has no action or custom id.`,
    };
  }

  return {
    component: {
      type: COMPONENT_TYPES.BUTTON,
      id: node.id,
      label: String(node.props.label || "Button"),
      style: Number(node.props.style || 1),
      emoji: node.props.emoji ? String(node.props.emoji) : undefined,
      disabled: Boolean(node.props.disabled),
      customId: customId || undefined,
      url: action?.type === "open_url" ? action.url : undefined,
      action,
    } satisfies EmbedComponentType,
    missingCustomIdCount: customId ? 0 : 1,
    missingHandlerBindingCount: action ? 0 : (Number(node.props.style || 1) === 5 ? 0 : 1),
    reason: "Button can publish live.",
  };
}

function mapStringSelectComponent(document: StudioDocument, node: StudioNode) {
  const options = Array.isArray(node.props.options) ? node.props.options : [];
  if (options.length === 0) {
    return {
      component: null,
      missingCustomIdCount: safeText(node.props.customId) ? 0 : 1,
      missingHandlerBindingCount: 1,
      reason: "String select has no options.",
    };
  }

  const preparedOptions: EmbedComponentOption[] = [];
  let missingBindings = 0;
  for (const option of options.slice(0, 25)) {
    const value = String((option as any)?.value || "");
    const actionId = value ? node.optionActionIds?.[value] : undefined;
    const action = actionId ? document.actions[actionId] : undefined;
    if (!action) {
      missingBindings += 1;
      continue;
    }
    preparedOptions.push({
      label: String((option as any)?.label || "Option"),
      value: value || String((option as any)?.label || "option"),
      description: (option as any)?.description ? String((option as any).description) : undefined,
      emoji: (option as any)?.emoji ? String((option as any).emoji) : undefined,
      default: Boolean((option as any)?.default),
      action,
    });
  }

  if (preparedOptions.length === 0) {
    return {
      component: null,
      missingCustomIdCount: safeText(node.props.customId) ? 0 : 1,
      missingHandlerBindingCount: Math.max(1, missingBindings),
      reason: "String select options are missing publishable actions.",
    };
  }

  return {
    component: {
      type: COMPONENT_TYPES.SELECT_MENU,
      id: node.id,
      customId: String(node.props.customId || node.id),
      placeholder: String(node.props.placeholder || node.props.label || "Choose an option"),
      disabled: Boolean(node.props.disabled),
      minValues: Math.max(0, Math.min(25, Number(node.props.minValues || 1))),
      maxValues: Math.max(1, Math.min(25, Number(node.props.maxValues || 1))),
      options: preparedOptions,
      action: node.actionId ? document.actions[node.actionId] : undefined,
    } satisfies EmbedComponentType,
    missingCustomIdCount: safeText(node.props.customId) ? 0 : 1,
    missingHandlerBindingCount: missingBindings,
    reason: "String select can publish live.",
  };
}

function planInteractiveStandard(document: StudioDocument, node: StudioNode, mode: StudioDraftMode): StudioNodePlanResult {
  if (node.type === "button") {
    const mapped = mapButtonComponent(document, node);
    if (!mapped.component) {
      return {
        ...emptyResult(node),
        normalizedNodes: [makeNormalizedNode(node, mode, "interactive", false, mapped.reason)],
        outcomes: [makeOutcome(node, "blocked", mapped.reason, {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Interactive button behavior would fail live.",
        })],
        missingCustomIdCount: mapped.missingCustomIdCount,
        missingHandlerBindingCount: mapped.missingHandlerBindingCount,
      };
    }
    return {
      exactComponent: mapped.component,
      standardContentParts: [],
      standardEmbeds: [],
      standardComponents: [mapped.component],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, mode, "interactive", true, mapped.reason)],
      outcomes: [makeOutcome(node, "exact", mapped.reason, { liveType: "button" })],
      usesLayoutComponents: false,
      usesContentComponents: false,
      usesInteractiveComponents: true,
      missingCustomIdCount: mapped.missingCustomIdCount,
      missingHandlerBindingCount: mapped.missingHandlerBindingCount,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: false,
    };
  }

  if (node.type === "string_select") {
    const mapped = mapStringSelectComponent(document, node);
    if (!mapped.component) {
      return {
        ...emptyResult(node),
        normalizedNodes: [makeNormalizedNode(node, mode, "interactive", false, mapped.reason)],
        outcomes: [makeOutcome(node, "blocked", mapped.reason, {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Select menu behavior would fail live.",
        })],
        missingCustomIdCount: mapped.missingCustomIdCount,
        missingHandlerBindingCount: mapped.missingHandlerBindingCount,
      };
    }
    return {
      exactComponent: mapped.component,
      standardContentParts: [],
      standardEmbeds: [],
      standardComponents: [mapped.component],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, mode, "interactive", true, mapped.reason)],
      outcomes: [makeOutcome(node, "exact", mapped.reason, { liveType: "string_select" })],
      usesLayoutComponents: false,
      usesContentComponents: false,
      usesInteractiveComponents: true,
      missingCustomIdCount: mapped.missingCustomIdCount,
      missingHandlerBindingCount: mapped.missingHandlerBindingCount,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: false,
    };
  }

  if (node.type === "role_select" || node.type === "user_select" || node.type === "channel_select" || node.type === "mentionable_select") {
    return {
      ...emptyResult(node),
      normalizedNodes: [makeNormalizedNode(node, mode, "unsupported", false, `${node.type} is runtime-gated and cannot be published truthfully yet.`)],
      outcomes: [makeOutcome(node, "blocked", `${node.type.replace(/_/g, " ")} is runtime-gated and cannot publish truthfully yet.`, {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Runtime-gated select behavior is unsupported.",
      })],
    };
  }

  if (node.type !== "action_row") {
    return emptyResult(node);
  }

  const childResults = node.childIds.map((childId) => {
    const child = document.nodes[childId];
    return child ? planInteractiveStandard(document, child, mode) : emptyResult();
  });
  const childMeta = mergeResults(childResults);
  const exactChildren = childResults.every((result) =>
    result.exactComponent &&
    (result.exactComponent.type === COMPONENT_TYPES.BUTTON || result.exactComponent.type === COMPONENT_TYPES.SELECT_MENU),
  );
  if (!exactChildren) {
    return {
      ...childMeta,
      normalizedNodes: [
        makeNormalizedNode(node, mode, "interactive", false, "Action row contains unsupported controls."),
        ...childMeta.normalizedNodes,
      ],
      outcomes: [
        makeOutcome(node, "blocked", "Action row contains controls that cannot publish live.", {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Interactive controls would fail live.",
        }),
        ...childMeta.outcomes,
      ],
      blocked: true,
      usesInteractiveComponents: true,
    };
  }

  const component: EmbedComponentType = {
    type: COMPONENT_TYPES.ACTION_ROW,
    components: childResults.map((result) => result.exactComponent!).filter(Boolean),
  };
  return {
    exactComponent: component,
    standardContentParts: [],
    standardEmbeds: [],
    standardComponents: [component],
    standardAttachments: [],
    normalizedNodes: [
      makeNormalizedNode(node, mode, "interactive", true, "Action row can publish live."),
      ...childMeta.normalizedNodes,
    ],
    outcomes: [
      makeOutcome(node, "exact", "Action row can publish as live controls.", { liveType: "action_row" }),
      ...childMeta.outcomes,
    ],
    usesLayoutComponents: false,
    usesContentComponents: false,
    usesInteractiveComponents: true,
    missingCustomIdCount: childMeta.missingCustomIdCount,
    missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
    invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
    blocked: false,
    downgraded: false,
  };
}

function planStandardNode(document: StudioDocument, nodeId: string, mode: StudioDraftMode): StudioNodePlanResult {
  const node = document.nodes[nodeId];
  if (!node) return emptyResult();

  if (INTERACTIVE_NODE_TYPES.has(node.type)) {
    return planInteractiveStandard(document, node, mode);
  }

  const childResults = node.childIds.map((childId) => planStandardNode(document, childId, mode));
  const childMeta = mergeResults(childResults);
  const contentParts: string[] = [];
  const embeds: StudioEmbedDraft[] = [];
  const attachments = [...childMeta.standardAttachments];

  switch (node.type) {
    case "container":
    case "section":
      if (safeText(node.props.heading)) contentParts.push(`**${String(node.props.heading)}**`);
      if (safeText(node.props.description)) contentParts.push(String(node.props.description));
      contentParts.push(...childMeta.standardContentParts);
      embeds.push(...childMeta.standardEmbeds);
      return {
        exactComponent: undefined,
        standardContentParts: contentParts,
        standardEmbeds: embeds,
        standardComponents: childMeta.standardComponents,
        standardAttachments: attachments,
        normalizedNodes: [
          makeNormalizedNode(node, mode, "content", true, `${node.type} will publish in standard message mode.`),
          ...childMeta.normalizedNodes,
        ],
        outcomes: [
          makeOutcome(node, "exact", `${node.type.replace(/_/g, " ")} will publish in standard message mode.`, { liveType: "content" }),
          ...childMeta.outcomes,
        ],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: childMeta.usesInteractiveComponents,
        missingCustomIdCount: childMeta.missingCustomIdCount,
        missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
        invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
        blocked: childMeta.blocked,
        downgraded: childMeta.downgraded,
      };
    case "text_display":
      return {
        exactComponent: undefined,
        standardContentParts: [String(node.props.text || "")].filter(Boolean),
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: [],
        normalizedNodes: [makeNormalizedNode(node, mode, "content", true, "Text block publishes as message content.")],
        outcomes: [makeOutcome(node, "exact", "Text block publishes as message content.", { liveType: "content" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    case "divider":
      return {
        exactComponent: undefined,
        standardContentParts: [buildDividerText(node.props)],
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: [],
        normalizedNodes: [makeNormalizedNode(node, mode, "content", true, "Divider publishes as plain text separators in standard mode.")],
        outcomes: [makeOutcome(node, "exact", "Divider publishes as plain text separators in standard mode.", { liveType: "content" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    case "style_block":
      return {
        exactComponent: undefined,
        standardContentParts: [],
        standardEmbeds: [buildStyleBlockEmbed(node)],
        standardComponents: [],
        standardAttachments: [],
        normalizedNodes: [makeNormalizedNode(node, mode, "embed", true, "Notice block publishes as an embed in standard mode.")],
        outcomes: [makeOutcome(node, "exact", "Notice block publishes as an embed in standard mode.", { liveType: "embed" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    case "media_gallery": {
      const items = Array.isArray(node.props.items) ? node.props.items : [];
      const validItems = items.filter((item: any) => isHttpUrl(item?.url));
      if (validItems.length === 0) {
        return {
          ...emptyResult(node),
          normalizedNodes: [makeNormalizedNode(node, mode, "embed", false, "Media gallery has no valid image URLs.")],
          outcomes: [makeOutcome(node, "blocked", "Media gallery needs at least one valid image URL.", {
            severity: "structural",
            transformedTo: "none",
            lost: "Media gallery would be empty live.",
          })],
          invalidMediaConfiguration: true,
          usesLayoutComponents: true,
          usesContentComponents: true,
        };
      }
      return {
        exactComponent: undefined,
        standardContentParts: [],
        standardEmbeds: validItems.slice(0, 4).map((item: any) => ({
          title: String(node.props.title || ""),
          description: String(item?.description || ""),
          imageUrl: String(item.url),
          color: String(node.props.accentColor || "#5865F2"),
        })),
        standardComponents: [],
        standardAttachments: [],
        normalizedNodes: [makeNormalizedNode(node, mode, "embed", true, "Media gallery publishes as image embeds in standard mode.")],
        outcomes: [makeOutcome(node, "exact", "Media gallery publishes as image embeds in standard mode.", { liveType: "embed" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    }
    case "file": {
      const url = safeText(node.props.url);
      if (!isHttpUrl(url) && !isUploadedStudioAssetUrl(url)) {
        return {
          ...emptyResult(node),
          normalizedNodes: [makeNormalizedNode(node, mode, "file", false, "File block is missing a valid URL.")],
          outcomes: [makeOutcome(node, "blocked", "File block needs a valid URL.", {
            severity: "structural",
            transformedTo: "none",
            lost: "Attachment link would fail live.",
          })],
          usesLayoutComponents: true,
          usesContentComponents: true,
        };
      }
      return {
        exactComponent: undefined,
        standardContentParts: [`[${String(node.props.label || "Attachment")}](${url})`],
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: isUploadedStudioAssetUrl(url)
          ? [{
              id: node.id,
              name: String(node.props.label || "Attachment"),
              url,
              source: "asset",
              spoiler: Boolean(node.props.spoiler),
            }]
          : [],
        normalizedNodes: [makeNormalizedNode(node, mode, "file", true, "File block publishes as a standard link.")],
        outcomes: [makeOutcome(node, "exact", "File block publishes as a standard link.", { liveType: "content" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    }
    default:
      return emptyResult(node);
  }
}

function planLayoutNode(document: StudioDocument, nodeId: string): StudioNodePlanResult {
  const node = document.nodes[nodeId];
  if (!node) return emptyResult();

  if (INTERACTIVE_NODE_TYPES.has(node.type)) {
    return planInteractiveStandard(document, node, "layout_v2");
  }

  if (node.type === "text_display") {
    return {
      exactComponent: {
        type: COMPONENT_TYPES.TEXT_DISPLAY,
        id: node.id,
        content: String(node.props.text || ""),
      },
      standardContentParts: [String(node.props.text || "")].filter(Boolean),
      standardEmbeds: [],
      standardComponents: [],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, "layout_v2", "layout_v2", true, "Text display can publish as a V2 content block.")],
      outcomes: [makeOutcome(node, "exact", "Text display can publish as a V2 content block.", { liveType: "text_display" })],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: false,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: false,
    };
  }

  if (node.type === "divider") {
    const mode = String(node.props.mode || "line");
    if (mode === "line" || !safeText(node.props.text) || safeText(node.props.text) === "--------") {
      return {
        exactComponent: {
          type: COMPONENT_TYPES.SEPARATOR,
          id: node.id,
          spacing: node.props.spacing === "large" || node.props.spacing === "relaxed" ? "large" : "small",
          divider: true,
        },
        standardContentParts: [buildDividerText(node.props)],
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: [],
        normalizedNodes: [makeNormalizedNode(node, "layout_v2", "layout_v2", true, "Divider can publish as a V2 separator.")],
        outcomes: [makeOutcome(node, "exact", "Divider can publish as a V2 separator.", { liveType: "separator" })],
        usesLayoutComponents: true,
        usesContentComponents: false,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    }
    return {
      exactComponent: undefined,
      standardContentParts: [buildDividerText(node.props)],
      standardEmbeds: [],
      standardComponents: [],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, "layout_v2", "content", false, "Custom divider styling downgrades to plain text.")],
      outcomes: [makeOutcome(node, "downgraded", "Custom divider styling downgrades to plain text.", {
        severity: "visual-only",
        transformedTo: "text",
        lost: "Native V2 separator styling is lost.",
      })],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: false,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: true,
    };
  }

  if (node.type === "style_block") {
    return {
      exactComponent: undefined,
      standardContentParts: [],
      standardEmbeds: [buildStyleBlockEmbed(node)],
      standardComponents: [],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, "layout_v2", "embed", false, "Notice blocks downgrade to embeds in simplified publish.")],
      outcomes: [makeOutcome(node, "downgraded", "Notice blocks downgrade to embeds in simplified publish.", {
        severity: "structural",
        transformedTo: "embed",
        lost: "Native V2 layout styling is replaced with an embed.",
      })],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: false,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: true,
    };
  }

  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    const validItems = items
      .map((item: any) => ({
        url: safeText(item?.url),
        description: safeText(item?.description) || undefined,
        spoiler: Boolean(item?.spoiler),
      }))
      .filter((item) => Boolean(item.url) && isHttpUrl(item.url));
    if (validItems.length === 0) {
      return {
        ...emptyResult(node),
        normalizedNodes: [makeNormalizedNode(node, "layout_v2", "layout_v2", false, "Media gallery has no valid images.")],
        outcomes: [makeOutcome(node, "blocked", "Media gallery needs at least one valid image URL.", {
          severity: "structural",
          transformedTo: "none",
          lost: "Media gallery would be empty live.",
        })],
        invalidMediaConfiguration: true,
        usesLayoutComponents: true,
        usesContentComponents: true,
      };
    }
    return {
      exactComponent: {
        type: COMPONENT_TYPES.MEDIA_GALLERY,
        id: node.id,
        items: validItems,
      },
      standardContentParts: [],
      standardEmbeds: validItems.slice(0, 4).map((item) => ({
        title: String(node.props.title || ""),
        description: item.description,
        imageUrl: item.url,
        color: String(node.props.accentColor || "#5865F2"),
      })),
      standardComponents: [],
      standardAttachments: [],
      normalizedNodes: [makeNormalizedNode(node, "layout_v2", "layout_v2", true, "Media gallery can publish as a V2 gallery.")],
      outcomes: [makeOutcome(node, "exact", "Media gallery can publish as a V2 gallery.", { liveType: "media_gallery" })],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: false,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      invalidMediaConfiguration: false,
      blocked: false,
      downgraded: false,
    };
  }

  if (node.type === "file") {
    const url = safeText(node.props.url);
    if (isUploadedStudioAssetUrl(url)) {
      return {
        exactComponent: {
          type: COMPONENT_TYPES.FILE,
          id: node.id,
          label: String(node.props.label || "Attachment"),
          url,
          spoiler: Boolean(node.props.spoiler),
        },
        standardContentParts: [`[${String(node.props.label || "Attachment")}](${url})`],
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: [{
          id: node.id,
          name: String(node.props.label || "Attachment"),
          url,
          source: "asset",
          spoiler: Boolean(node.props.spoiler),
        }],
        normalizedNodes: [makeNormalizedNode(node, "layout_v2", "file", true, "Uploaded asset can publish as a V2 file component.")],
        outcomes: [makeOutcome(node, "exact", "Uploaded asset can publish as a V2 file component.", { liveType: "file" })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: false,
      };
    }
    if (isHttpUrl(url)) {
      return {
        exactComponent: undefined,
        standardContentParts: [`[${String(node.props.label || "Attachment")}](${url})`],
        standardEmbeds: [],
        standardComponents: [],
        standardAttachments: [{
          id: node.id,
          name: String(node.props.label || "Attachment"),
          url,
          source: "external",
          spoiler: Boolean(node.props.spoiler),
        }],
        normalizedNodes: [makeNormalizedNode(node, "layout_v2", "file", false, "External files downgrade to links because V2 files need uploaded attachments.")],
        outcomes: [makeOutcome(node, "downgraded", "External files downgrade to links because V2 files need uploaded attachments.", {
          severity: "structural",
          transformedTo: "link",
          lost: "Native V2 file rendering is unavailable for external URLs.",
        })],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
        blocked: false,
        downgraded: true,
      };
    }
    return {
      ...emptyResult(node),
      normalizedNodes: [makeNormalizedNode(node, "layout_v2", "file", false, "File block is missing a usable URL.")],
      outcomes: [makeOutcome(node, "blocked", "File block needs a valid URL.", {
        severity: "structural",
        transformedTo: "none",
        lost: "File payload cannot be serialized safely.",
      })],
      usesLayoutComponents: true,
      usesContentComponents: true,
    };
  }

  if (node.type === "section") {
    const childResults = node.childIds.map((childId) => planLayoutNode(document, childId));
    const childMeta = mergeResults(childResults);
    const textChildren = childResults
      .map((result) => result.exactComponent)
      .filter((component): component is EmbedComponentType => Boolean(component && component.type === COMPONENT_TYPES.TEXT_DISPLAY));
    const buttonChildren = childResults
      .map((result) => result.exactComponent)
      .filter((component): component is EmbedComponentType => Boolean(component && component.type === COMPONENT_TYPES.BUTTON));
    const fallback = planStandardNode(document, node.id, "standard");
    const exactSection = !childMeta.blocked &&
      !childMeta.downgraded &&
      buttonChildren.length <= 1 &&
      childResults.every((result) => {
        const component = result.exactComponent;
        return Boolean(component && (component.type === COMPONENT_TYPES.TEXT_DISPLAY || component.type === COMPONENT_TYPES.BUTTON));
      });

    if (exactSection) {
      const components: EmbedComponentType[] = [];
      if (safeText(node.props.heading)) {
        components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, id: `${node.id}_heading`, content: `**${String(node.props.heading)}**` });
      }
      if (safeText(node.props.description)) {
        components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, id: `${node.id}_description`, content: String(node.props.description) });
      }
      components.push(...textChildren);
      return {
        exactComponent: {
          type: COMPONENT_TYPES.SECTION,
          id: node.id,
          components,
          accessory: buttonChildren[0],
        },
        standardContentParts: fallback.standardContentParts,
        standardEmbeds: fallback.standardEmbeds,
        standardComponents: fallback.standardComponents,
        standardAttachments: fallback.standardAttachments,
        normalizedNodes: [
          makeNormalizedNode(node, "layout_v2", "layout_v2", true, "Section can publish as a V2 section."),
          ...childMeta.normalizedNodes,
        ],
        outcomes: [
          makeOutcome(node, "exact", "Section can publish as a V2 section.", { liveType: "section" }),
          ...childMeta.outcomes,
        ],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: childMeta.usesInteractiveComponents,
        missingCustomIdCount: childMeta.missingCustomIdCount,
        missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
        invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
        blocked: false,
        downgraded: false,
      };
    }

    if (childMeta.blocked) {
      return {
        ...fallback,
        exactComponent: undefined,
        normalizedNodes: [
          makeNormalizedNode(node, "layout_v2", "layout_v2", false, "Section contains unsupported V2 children."),
          ...childMeta.normalizedNodes,
        ],
        outcomes: [
          makeOutcome(node, "blocked", "Section contains unsupported V2 children.", {
            severity: "behavior-breaking",
            transformedTo: "none",
            lost: "Section behavior or structure would be misleading live.",
          }),
          ...childMeta.outcomes,
        ],
        blocked: true,
        downgraded: false,
      };
    }

    return {
      ...fallback,
      exactComponent: undefined,
      normalizedNodes: [
        makeNormalizedNode(node, "layout_v2", "content", false, "Section downgrades to standard content in simplified publish."),
        ...childMeta.normalizedNodes,
      ],
      outcomes: [
        makeOutcome(node, "downgraded", "Section downgrades to standard content in simplified publish.", {
          severity: "structural",
          transformedTo: "text and embeds",
          lost: "Native V2 section layout is replaced with standard message content.",
        }),
        ...childMeta.outcomes,
      ],
      blocked: false,
      downgraded: true,
    };
  }

  if (node.type === "container") {
    const childResults = node.childIds.map((childId) => planLayoutNode(document, childId));
    const childMeta = mergeResults(childResults);
    const fallback = planStandardNode(document, node.id, "standard");
    const allowedChildTypes = new Set<number>([
      COMPONENT_TYPES.TEXT_DISPLAY,
      COMPONENT_TYPES.SECTION,
      COMPONENT_TYPES.SEPARATOR,
      COMPONENT_TYPES.MEDIA_GALLERY,
      COMPONENT_TYPES.FILE,
    ]);
    const exactChildren = childResults.every((result) => Boolean(result.exactComponent && allowedChildTypes.has(result.exactComponent.type)));
    if (exactChildren && !childMeta.blocked && !childMeta.downgraded) {
      const components: EmbedComponentType[] = [];
      if (safeText(node.props.heading)) {
        components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, id: `${node.id}_heading`, content: `**${String(node.props.heading)}**` });
      }
      if (safeText(node.props.description)) {
        components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, id: `${node.id}_description`, content: String(node.props.description) });
      }
      components.push(...childResults.map((result) => result.exactComponent!).filter(Boolean));
      return {
        exactComponent: {
          type: COMPONENT_TYPES.CONTAINER,
          id: node.id,
          accentColor: safeText(node.props.accentColor) || undefined,
          spoiler: Boolean(node.props.spoiler),
          components,
        },
        standardContentParts: fallback.standardContentParts,
        standardEmbeds: fallback.standardEmbeds,
        standardComponents: fallback.standardComponents,
        standardAttachments: fallback.standardAttachments,
        normalizedNodes: [
          makeNormalizedNode(node, "layout_v2", "layout_v2", true, "Container can publish as a V2 container."),
          ...childMeta.normalizedNodes,
        ],
        outcomes: [
          makeOutcome(node, "exact", "Container can publish as a V2 container.", { liveType: "container" }),
          ...childMeta.outcomes,
        ],
        usesLayoutComponents: true,
        usesContentComponents: true,
        usesInteractiveComponents: childMeta.usesInteractiveComponents,
        missingCustomIdCount: childMeta.missingCustomIdCount,
        missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
        invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
        blocked: false,
        downgraded: false,
      };
    }

    if (childMeta.blocked) {
      return {
        ...fallback,
        exactComponent: undefined,
        normalizedNodes: [
          makeNormalizedNode(node, "layout_v2", "layout_v2", false, "Container contains unsupported V2 children."),
          ...childMeta.normalizedNodes,
        ],
        outcomes: [
          makeOutcome(node, "blocked", "Container contains unsupported V2 children.", {
            severity: "behavior-breaking",
            transformedTo: "none",
            lost: "Container layout would be misleading live.",
          }),
          ...childMeta.outcomes,
        ],
        blocked: true,
        downgraded: false,
      };
    }

    return {
      ...fallback,
      exactComponent: undefined,
      normalizedNodes: [
        makeNormalizedNode(node, "layout_v2", "content", false, "Container downgrades to standard content in simplified publish."),
        ...childMeta.normalizedNodes,
      ],
      outcomes: [
        makeOutcome(node, "downgraded", "Container downgrades to standard content in simplified publish.", {
          severity: "structural",
          transformedTo: "text and embeds",
          lost: "Native V2 container layout is replaced with standard message content.",
        }),
        ...childMeta.outcomes,
      ],
      blocked: false,
      downgraded: true,
    };
  }

  return emptyResult(node);
}

function dedupeDiagnostics(diagnostics: StudioDiagnostic[]) {
  const seen = new Set<string>();
  const next: StudioDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.level}:${diagnostic.code}:${diagnostic.path || ""}:${diagnostic.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(diagnostic);
  }
  return next;
}

export function buildStudioPublishPlan(
  documentInput: StudioDocument,
  requestedViewId?: string,
  options?: StudioDocumentRenderOptions,
): StudioPublishPlan {
  const migrated = createMigratedStudioDocument(documentInput);
  const document = migrated.document;
  const view = getView(document, requestedViewId);
  const diagnostics = collectStudioDiagnostics(document, requestedViewId, options);

  if (!view) {
    return {
      viewId: requestedViewId || document.meta.entryViewId,
      draftMode: document.meta.mode || "standard",
      mode: "blocked",
      label: "Blocked publish",
      summary: "Selected view no longer exists.",
      publishPath: "blocked",
      usesComponentsV2: false,
      usesLayoutComponents: false,
      usesContentComponents: false,
      usesInteractiveComponents: false,
      downgradedNodeCount: 0,
      blockedNodeCount: 1,
      exactNodeCount: 0,
      structuralDowngradeCount: 0,
      behaviorBreakingCount: 1,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      emptyInteractiveMap: false,
      invalidMediaConfiguration: false,
      v2FlagReady: false,
      payloadReady: false,
      requiresSimplifiedConfirmation: false,
      requiresStructuralConfirmation: false,
      nodeOutcomes: [],
      normalizedNodes: [],
      diagnostics: dedupeDiagnostics([
        ...diagnostics,
        { level: "error", code: "VIEW_NOT_FOUND", message: "Selected view no longer exists.", path: "views" },
      ]),
      debug: {
        draftMode: document.meta.mode || "standard",
        serializerStage: "preflight",
        payload: { embeds: [], components: [], attachments: [] },
        serializerInputs: [],
      },
      liveMessage: { embeds: [], components: [], attachments: [], publishPath: "blocked" },
    };
  }
  const draftMode = document.meta.mode || "standard";
  const plannerDiagnostics = [...diagnostics];
  const viewHasStandardBody = Boolean(safeText(view.messageContent)) || (Array.isArray(view.embeds) && view.embeds.length > 0);
  if (draftMode === "layout_v2" && viewHasStandardBody) {
    plannerDiagnostics.push({
      level: "warning",
      code: "LAYOUT_MODE_STANDARD_BODY",
      message: "This layout_v2 draft still contains message content or embeds and will require simplified publish.",
      path: `views.${view.id}`,
    });
  }

  const nodeResults = view.rootNodeIds.map((nodeId) =>
    draftMode === "layout_v2" ? planLayoutNode(document, nodeId) : planStandardNode(document, nodeId, draftMode),
  );
  const nodeMeta = mergeResults(nodeResults);
  const nodeOutcomes = nodeMeta.outcomes;
  const downgradedNodeCount = nodeOutcomes.filter((entry) => entry.status === "downgraded").length;
  const blockedNodeCount = nodeOutcomes.filter((entry) => entry.status === "blocked").length;
  const exactNodeCount = nodeOutcomes.filter((entry) => entry.status === "exact").length;
  const structuralDowngradeCount = nodeOutcomes.filter((entry) => entry.severity === "structural").length;
  const behaviorBreakingCount = nodeOutcomes.filter((entry) => entry.severity === "behavior-breaking").length;
  const usesLayoutComponents = nodeMeta.usesLayoutComponents;
  const usesContentComponents = nodeMeta.usesContentComponents || Boolean(safeText(view.messageContent)) || (Array.isArray(view.embeds) && view.embeds.length > 0);
  const usesInteractiveComponents = nodeMeta.usesInteractiveComponents;
  const usesComponentsV2 = draftMode === "layout_v2";

  let mode: StudioPublishPlan["mode"] = "exact";
  if (blockedNodeCount > 0 || plannerDiagnostics.some((entry) => entry.level === "error")) {
    mode = "blocked";
  } else if (draftMode === "layout_v2" && (downgradedNodeCount > 0 || viewHasStandardBody)) {
    mode = "downgraded";
  }

  const exactComponents = nodeResults.map((result) => result.exactComponent).filter((component): component is EmbedComponentType => Boolean(component));
  const standardContentParts = [
    safeText(view.messageContent) ? String(view.messageContent) : "",
    ...nodeMeta.standardContentParts,
  ].filter(Boolean);
  const standardEmbeds = [...(Array.isArray(view.embeds) ? view.embeds : []), ...nodeMeta.standardEmbeds];
  const standardComponents = nodeMeta.standardComponents;
  const standardAttachments = nodeMeta.standardAttachments;

  const publishPath: StudioPublishPlan["publishPath"] =
    mode === "blocked"
      ? "blocked"
      : mode === "downgraded"
        ? "downgraded"
        : draftMode === "layout_v2"
          ? "v2"
          : "legacy";

  const liveMessage =
    publishPath === "v2"
      ? {
          content: undefined,
          embeds: [],
          components: exactComponents,
          attachments: standardAttachments.filter((attachment) => attachment.source === "asset"),
          flags: exactComponents.length > 0 ? COMPONENTS_V2_FLAG : undefined,
          publishPath,
        }
      : {
          content: standardContentParts.join("\n\n").trim() || undefined,
          embeds: standardEmbeds.slice(0, 10),
          components: standardComponents,
          attachments: standardAttachments,
          flags: undefined,
          publishPath,
        };

  const emptyInteractiveMap = usesInteractiveComponents && liveMessage.components.length === 0;
  let payloadReady = Boolean(
    liveMessage.content ||
    (liveMessage.embeds || []).length > 0 ||
    (liveMessage.components || []).length > 0,
  ) && mode !== "blocked";
  let v2FlagReady = publishPath !== "v2" || Boolean(liveMessage.flags);

  plannerDiagnostics.push({
    level: mode === "blocked" ? "error" : mode === "downgraded" ? "warning" : "info",
    code: "PUBLISH_MODE",
    message:
      mode === "blocked"
        ? "Live publish is blocked until invalid or unsupported parts are fixed."
        : mode === "downgraded"
          ? "This draft will publish in simplified standard-message form."
          : publishPath === "v2"
            ? "This draft can publish as an exact Components V2 payload."
            : "This draft can publish as an exact standard Discord message.",
    path: `views.${view.id}`,
  });

  if (draftMode === "layout_v2" && publishPath === "v2" && (liveMessage.content || (liveMessage.embeds || []).length > 0)) {
    plannerDiagnostics.push({
      level: "error",
      code: "V2_MIXED_BODY_UNSUPPORTED",
      message: "Components V2 payloads cannot include message content or embeds.",
      path: `views.${view.id}`,
    });
    mode = "blocked";
    payloadReady = false;
    v2FlagReady = false;
  }

  if (emptyInteractiveMap) {
    plannerDiagnostics.push({
      level: "warning",
      code: "EMPTY_INTERACTIVE_MAP",
      message: "Interactive intent exists, but no sendable live control payload was produced.",
      path: `views.${view.id}`,
    });
  }

  nodeOutcomes
    .filter((entry) => entry.status !== "exact")
    .forEach((entry) => {
      plannerDiagnostics.push({
        level: entry.status === "blocked" ? "error" : "warning",
        code: entry.status === "blocked" ? "NODE_BLOCKED" : "NODE_DOWNGRADED",
        message: `${entry.nodeType.replace(/_/g, " ")}: ${entry.reason}`,
        path: `nodes.${entry.nodeId}`,
      });
    });

  const summary =
    mode === "blocked"
      ? "Blocked publish. Fix the highlighted parts before sending this draft live."
      : mode === "downgraded"
        ? "Simplified publish. This layout_v2 draft will be converted into a standard Discord message."
        : publishPath === "v2"
          ? "Exact V2 publish. Preview and live payload are aligned."
          : "Exact standard publish. Preview and live payload are aligned for a normal Discord message.";

  return {
    viewId: view.id,
    draftMode,
    mode,
    label:
      mode === "blocked"
        ? "Blocked publish"
        : mode === "downgraded"
          ? "Downgraded publish"
          : publishPath === "v2"
            ? "Exact V2 publish"
            : "Exact standard publish",
    summary,
    publishPath,
    usesComponentsV2,
    usesLayoutComponents,
    usesContentComponents,
    usesInteractiveComponents,
    downgradedNodeCount,
    blockedNodeCount,
    exactNodeCount,
    structuralDowngradeCount,
    behaviorBreakingCount,
    missingCustomIdCount: nodeMeta.missingCustomIdCount,
    missingHandlerBindingCount: nodeMeta.missingHandlerBindingCount,
    emptyInteractiveMap,
    invalidMediaConfiguration: nodeMeta.invalidMediaConfiguration,
    v2FlagReady,
    payloadReady,
    requiresSimplifiedConfirmation: mode === "downgraded",
    requiresStructuralConfirmation: mode === "downgraded" && structuralDowngradeCount > 0,
    nodeOutcomes,
    normalizedNodes: nodeMeta.normalizedNodes,
    diagnostics: dedupeDiagnostics(plannerDiagnostics),
    debug: {
      draftMode,
      serializerStage: "preflight",
      payload: {
        content: liveMessage.content,
        embeds: liveMessage.embeds,
        components: liveMessage.components,
        flags: liveMessage.flags,
        attachments: liveMessage.attachments,
      },
      serializerInputs: nodeMeta.normalizedNodes.map((entry) => ({
        kind: "normalized_node" as const,
        componentType: entry.intent,
        nodeId: entry.nodeId,
      })),
    },
    liveMessage,
  };
}
