import {
  COMPONENT_TYPES,
  type EmbedComponentOption,
  type EmbedComponentType,
  type StudioDiagnostic,
  type StudioDocument,
  type StudioEmbedDraft,
  type StudioNode,
  type StudioPublishMode,
  type StudioPublishNodeOutcome,
  type StudioPublishPlan,
  type StudioPublishSeverity,
} from "./schema";
import { collectStudioDiagnostics, type StudioDocumentRenderOptions } from "./studio-document";

const URL_PATTERN = /^https?:\/\/\S+$/i;
const COMPONENTS_V2_FLAG = 32768;

interface StudioNodePlanResult {
  status: "exact" | "downgraded" | "blocked";
  reason: string;
  severity?: StudioPublishSeverity;
  component?: EmbedComponentType;
  contentParts: string[];
  embeds: StudioEmbedDraft[];
  outcomes: StudioPublishNodeOutcome[];
  usesLayoutComponents: boolean;
  usesContentComponents: boolean;
  usesInteractiveComponents: boolean;
  missingCustomIdCount: number;
  missingHandlerBindingCount: number;
  invalidMediaConfiguration: boolean;
}

function safeText(value: unknown) {
  return String(value || "").trim();
}

function isHttpUrl(value: unknown) {
  const raw = safeText(value);
  return raw.length > 0 && URL_PATTERN.test(raw);
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

function emptyPlanResult(
  node: StudioNode,
  status: "exact" | "downgraded" | "blocked",
  reason: string,
  extra?: Partial<StudioPublishNodeOutcome>,
): StudioNodePlanResult {
  return {
    status,
    reason,
    severity: extra?.severity,
    component: undefined,
    contentParts: [],
    embeds: [],
    outcomes: [makeOutcome(node, status, reason, extra)],
    usesLayoutComponents: ["container", "section", "divider"].includes(node.type),
    usesContentComponents: ["text_display", "media_gallery", "file", "style_block"].includes(node.type),
    usesInteractiveComponents: ["action_row", "button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type),
    missingCustomIdCount: 0,
    missingHandlerBindingCount: 0,
    invalidMediaConfiguration: false,
  };
}

function combineChildMetadata(results: StudioNodePlanResult[]) {
  return {
    outcomes: results.flatMap((result) => result.outcomes),
    usesLayoutComponents: results.some((result) => result.usesLayoutComponents),
    usesContentComponents: results.some((result) => result.usesContentComponents),
    usesInteractiveComponents: results.some((result) => result.usesInteractiveComponents),
    missingCustomIdCount: results.reduce((total, result) => total + result.missingCustomIdCount, 0),
    missingHandlerBindingCount: results.reduce((total, result) => total + result.missingHandlerBindingCount, 0),
    invalidMediaConfiguration: results.some((result) => result.invalidMediaConfiguration),
  };
}

function subtreeUsesInteractive(document: StudioDocument, nodeId: string): boolean {
  const node = document.nodes[nodeId];
  if (!node) return false;
  if (["action_row", "button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    return true;
  }
  return node.childIds.some((childId) => subtreeUsesInteractive(document, childId));
}

function serializeLegacySubtree(document: StudioDocument, nodeId: string): { contentParts: string[]; embeds: StudioEmbedDraft[] } {
  const node = document.nodes[nodeId];
  if (!node) return { contentParts: [], embeds: [] };

  const contentParts: string[] = [];
  const embeds: StudioEmbedDraft[] = [];

  const visit = (currentNode: StudioNode) => {
    switch (currentNode.type) {
      case "container":
      case "section":
        if (currentNode.props.heading) contentParts.push(`**${String(currentNode.props.heading)}**`);
        if (currentNode.props.description) contentParts.push(String(currentNode.props.description));
        currentNode.childIds.forEach((childId) => {
          const child = document.nodes[childId];
          if (child) visit(child);
        });
        return;
      case "text_display":
        if (safeText(currentNode.props.text)) contentParts.push(String(currentNode.props.text));
        return;
      case "divider":
        contentParts.push(buildDividerText(currentNode.props));
        return;
      case "style_block":
        embeds.push(buildStyleBlockEmbed(currentNode));
        return;
      case "media_gallery": {
        const items = Array.isArray(currentNode.props.items) ? currentNode.props.items : [];
        items.slice(0, 4).forEach((item: any) => {
          const url = safeText(item?.url);
          if (!url) return;
          embeds.push({
            title: String(currentNode.props.title || ""),
            description: String(item?.description || ""),
            imageUrl: url,
            color: String(currentNode.props.accentColor || "#5865F2"),
          });
        });
        return;
      }
      case "file":
        if (safeText(currentNode.props.url)) {
          contentParts.push(`[${String(currentNode.props.label || "Attachment")}](${String(currentNode.props.url)})`);
        }
        return;
      default:
        return;
    }
  };

  visit(node);
  return { contentParts, embeds };
}

function planInteractiveButton(document: StudioDocument, node: StudioNode): StudioNodePlanResult {
  const label = safeText(node.props.label) || "Button";
  const action = node.actionId ? document.actions[node.actionId] : undefined;
  const customId = safeText(node.props.customId);

  if (!action && !customId && Number(node.props.style || 1) !== 5) {
    return {
      ...emptyPlanResult(node, "blocked", `${label} has no action or custom id for live publish.`, {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Button behavior would not work live.",
      }),
      missingHandlerBindingCount: 1,
      usesInteractiveComponents: true,
    };
  }

  return {
    status: "exact",
    reason: "Button can publish as a live interactive control.",
    component: {
      type: COMPONENT_TYPES.BUTTON,
      id: node.id,
      label,
      style: Number(node.props.style || 1),
      emoji: node.props.emoji ? String(node.props.emoji) : undefined,
      disabled: Boolean(node.props.disabled),
      customId: customId || undefined,
      url: action?.type === "open_url" ? action.url : undefined,
      action,
    },
    contentParts: [],
    embeds: [],
    outcomes: [makeOutcome(node, "exact", "Button can publish as a live interactive control.", { liveType: "button" })],
    usesLayoutComponents: false,
    usesContentComponents: false,
    usesInteractiveComponents: true,
    missingCustomIdCount: customId ? 0 : 1,
    missingHandlerBindingCount: 0,
    invalidMediaConfiguration: false,
  };
}

function planStringSelect(document: StudioDocument, node: StudioNode): StudioNodePlanResult {
  const options = Array.isArray(node.props.options) ? node.props.options : [];
  if (options.length === 0) {
    return {
      ...emptyPlanResult(node, "blocked", "Select menu has no options to send live.", {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Select menu would be empty.",
      }),
      missingHandlerBindingCount: 1,
      usesInteractiveComponents: true,
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
      ...emptyPlanResult(node, "blocked", "Select menu options are missing live action bindings.", {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Select menu behavior would not work live.",
      }),
      missingHandlerBindingCount: Math.max(1, missingBindings),
      usesInteractiveComponents: true,
    };
  }

  return {
    status: "exact",
    reason: "String select can publish as a live interactive control.",
    component: {
      type: COMPONENT_TYPES.SELECT_MENU,
      id: node.id,
      customId: String(node.props.customId || node.id),
      placeholder: String(node.props.placeholder || node.props.label || "Choose an option"),
      disabled: Boolean(node.props.disabled),
      minValues: Math.max(0, Math.min(25, Number(node.props.minValues || 1))),
      maxValues: Math.max(1, Math.min(25, Number(node.props.maxValues || 1))),
      options: preparedOptions,
    },
    contentParts: [],
    embeds: [],
    outcomes: [makeOutcome(node, "exact", "String select can publish as a live interactive control.", { liveType: "string_select" })],
    usesLayoutComponents: false,
    usesContentComponents: false,
    usesInteractiveComponents: true,
    missingCustomIdCount: safeText(node.props.customId) ? 0 : 1,
    missingHandlerBindingCount: missingBindings,
    invalidMediaConfiguration: false,
  };
}

function planSection(document: StudioDocument, node: StudioNode, options?: StudioDocumentRenderOptions): StudioNodePlanResult {
  const textDisplays: EmbedComponentType[] = [];
  const childOutcomes: StudioPublishNodeOutcome[] = [];
  let accessoryButton: EmbedComponentType | undefined;
  let blocked = false;
  let invalidMediaConfiguration = false;
  let missingCustomIdCount = 0;
  let missingHandlerBindingCount = 0;

  if (safeText(node.props.heading)) {
    textDisplays.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, content: `**${String(node.props.heading)}**` });
  }
  if (safeText(node.props.description)) {
    textDisplays.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, content: String(node.props.description) });
  }

  for (const childId of node.childIds) {
    const child = document.nodes[childId];
    if (!child) continue;
    const planned = planNode(document, childId, options);
    childOutcomes.push(...planned.outcomes);
    invalidMediaConfiguration = invalidMediaConfiguration || planned.invalidMediaConfiguration;
    missingCustomIdCount += planned.missingCustomIdCount;
    missingHandlerBindingCount += planned.missingHandlerBindingCount;

    if (child.type === "text_display" && planned.status === "exact" && planned.component?.type === COMPONENT_TYPES.TEXT_DISPLAY) {
      textDisplays.push(planned.component);
      continue;
    }

    if (child.type === "button" && planned.status === "exact" && !accessoryButton && planned.component?.type === COMPONENT_TYPES.BUTTON) {
      accessoryButton = planned.component;
      continue;
    }

    blocked = blocked || subtreeUsesInteractive(document, childId);
  }

  if (!blocked && textDisplays.length > 0) {
    return {
      status: "exact",
      reason: "Section can publish as a native V2 section.",
      component: {
        type: COMPONENT_TYPES.SECTION,
        id: node.id,
        components: textDisplays,
        accessory: accessoryButton,
      },
      contentParts: [],
      embeds: [],
      outcomes: [
        makeOutcome(node, "exact", "Section can publish as a native V2 section.", { liveType: "section" }),
        ...childOutcomes,
      ],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: Boolean(accessoryButton),
      missingCustomIdCount,
      missingHandlerBindingCount,
      invalidMediaConfiguration,
    };
  }

  if (blocked) {
    return {
      ...emptyPlanResult(node, "blocked", "Section contains interactive or structured content that cannot survive a truthful live publish.", {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Section behavior or structure would be misleading live.",
      }),
      outcomes: [
        makeOutcome(node, "blocked", "Section contains interactive or structured content that cannot survive a truthful live publish.", {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Section behavior or structure would be misleading live.",
        }),
        ...childOutcomes,
      ],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: true,
      missingCustomIdCount,
      missingHandlerBindingCount,
      invalidMediaConfiguration,
    };
  }

  const legacy = serializeLegacySubtree(document, node.id);
  return {
    status: "downgraded",
    reason: "Section will publish as simplified text/embed content.",
    severity: "structural",
    component: undefined,
    contentParts: legacy.contentParts,
    embeds: legacy.embeds,
    outcomes: [
      makeOutcome(node, "downgraded", "Section will publish as simplified text/embed content.", {
        severity: "structural",
        transformedTo: "text and embeds",
        lost: "Native section layout and nesting will not survive live publish.",
      }),
      ...childOutcomes,
    ],
    usesLayoutComponents: true,
    usesContentComponents: true,
    usesInteractiveComponents: false,
    missingCustomIdCount,
    missingHandlerBindingCount,
    invalidMediaConfiguration,
  };
}

function planContainer(document: StudioDocument, node: StudioNode, options?: StudioDocumentRenderOptions): StudioNodePlanResult {
  const childResults = node.childIds.map((childId) => planNode(document, childId, options));
  const childMeta = combineChildMetadata(childResults);
  const exactChildren = childResults.every((result) => result.status === "exact" && result.component);

  if (exactChildren) {
    const components: EmbedComponentType[] = [];
    if (safeText(node.props.heading)) {
      components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, content: `**${String(node.props.heading)}**` });
    }
    if (safeText(node.props.description)) {
      components.push({ type: COMPONENT_TYPES.TEXT_DISPLAY, content: String(node.props.description) });
    }
    components.push(...childResults.map((result) => result.component!).filter(Boolean));

    return {
      status: "exact",
      reason: "Container can publish as a native V2 container.",
      component: {
        type: COMPONENT_TYPES.CONTAINER,
        id: node.id,
        accentColor: safeText(node.props.accentColor) || undefined,
        spoiler: Boolean(node.props.spoiler),
        components,
      },
      contentParts: [],
      embeds: [],
      outcomes: [
        makeOutcome(node, "exact", "Container can publish as a native V2 container.", { liveType: "container" }),
        ...childMeta.outcomes,
      ],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: childMeta.usesInteractiveComponents,
      missingCustomIdCount: childMeta.missingCustomIdCount,
      missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
      invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
    };
  }

  if (childMeta.usesInteractiveComponents || subtreeUsesInteractive(document, node.id)) {
    return {
      ...emptyPlanResult(node, "blocked", "Container would need to downgrade interactive content, so live publish is blocked.", {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Interactive behavior inside the container would be misleading live.",
      }),
      outcomes: [
        makeOutcome(node, "blocked", "Container would need to downgrade interactive content, so live publish is blocked.", {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Interactive behavior inside the container would be misleading live.",
        }),
        ...childMeta.outcomes,
      ],
      usesLayoutComponents: true,
      usesContentComponents: true,
      usesInteractiveComponents: true,
      missingCustomIdCount: childMeta.missingCustomIdCount,
      missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
      invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
    };
  }

  const legacy = serializeLegacySubtree(document, node.id);
  return {
    status: "downgraded",
    reason: "Container will publish as simplified text/embed content.",
    severity: "structural",
    component: undefined,
    contentParts: legacy.contentParts,
    embeds: legacy.embeds,
    outcomes: [
      makeOutcome(node, "downgraded", "Container will publish as simplified text/embed content.", {
        severity: "structural",
        transformedTo: "text and embeds",
        lost: "Native container layout and nested grouping will not survive live publish.",
      }),
      ...childMeta.outcomes,
    ],
    usesLayoutComponents: true,
    usesContentComponents: true,
    usesInteractiveComponents: false,
    missingCustomIdCount: childMeta.missingCustomIdCount,
    missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
    invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
  };
}

function planActionRow(document: StudioDocument, node: StudioNode, options?: StudioDocumentRenderOptions): StudioNodePlanResult {
  const childResults = node.childIds.map((childId) => planNode(document, childId, options));
  const childMeta = combineChildMetadata(childResults);
  const exactChildren = childResults.every((result) =>
    result.status === "exact" &&
    result.component &&
    (result.component.type === COMPONENT_TYPES.BUTTON || result.component.type === COMPONENT_TYPES.SELECT_MENU),
  );

  if (!exactChildren) {
    return {
      ...emptyPlanResult(node, "blocked", "Action row contains controls that cannot publish exactly.", {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Interactive controls would not work live.",
      }),
      outcomes: [
        makeOutcome(node, "blocked", "Action row contains controls that cannot publish exactly.", {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Interactive controls would not work live.",
        }),
        ...childMeta.outcomes,
      ],
      usesLayoutComponents: false,
      usesContentComponents: false,
      usesInteractiveComponents: true,
      missingCustomIdCount: childMeta.missingCustomIdCount,
      missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
      invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
    };
  }

  return {
    status: "exact",
    reason: "Action row can publish as live interactive controls.",
    component: {
      type: COMPONENT_TYPES.ACTION_ROW,
      components: childResults.map((result) => result.component!).filter(Boolean),
    },
    contentParts: [],
    embeds: [],
    outcomes: [
      makeOutcome(node, "exact", "Action row can publish as live interactive controls.", { liveType: "action_row" }),
      ...childMeta.outcomes,
    ],
    usesLayoutComponents: false,
    usesContentComponents: false,
    usesInteractiveComponents: true,
    missingCustomIdCount: childMeta.missingCustomIdCount,
    missingHandlerBindingCount: childMeta.missingHandlerBindingCount,
    invalidMediaConfiguration: childMeta.invalidMediaConfiguration,
  };
}

function planNode(document: StudioDocument, nodeId: string, options?: StudioDocumentRenderOptions): StudioNodePlanResult {
  const node = document.nodes[nodeId];
  if (!node) {
    return {
      status: "blocked",
      reason: "Missing node.",
      contentParts: [],
      embeds: [],
      outcomes: [],
      usesLayoutComponents: false,
      usesContentComponents: false,
      usesInteractiveComponents: false,
      missingCustomIdCount: 0,
      missingHandlerBindingCount: 0,
      invalidMediaConfiguration: false,
    };
  }

  switch (node.type) {
    case "text_display":
      return {
        status: "exact",
        reason: "Text display can publish as a native V2 content block.",
        component: {
          type: COMPONENT_TYPES.TEXT_DISPLAY,
          id: node.id,
          content: String(node.props.text || ""),
        },
        contentParts: [],
        embeds: [],
        outcomes: [makeOutcome(node, "exact", "Text display can publish as a native V2 content block.", { liveType: "text_display" })],
        usesLayoutComponents: false,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
      };
    case "divider": {
      const mode = String(node.props.mode || "line");
      if (mode === "line" || !safeText(node.props.text) || safeText(node.props.text) === "--------") {
        return {
          status: "exact",
          reason: "Divider can publish as a native V2 separator.",
          component: {
            type: COMPONENT_TYPES.SEPARATOR,
            id: node.id,
            spacing: node.props.spacing === "large" || node.props.spacing === "relaxed" ? "large" : "small",
            divider: true,
          },
          contentParts: [],
          embeds: [],
          outcomes: [makeOutcome(node, "exact", "Divider can publish as a native V2 separator.", { liveType: "separator" })],
          usesLayoutComponents: true,
          usesContentComponents: false,
          usesInteractiveComponents: false,
          missingCustomIdCount: 0,
          missingHandlerBindingCount: 0,
          invalidMediaConfiguration: false,
        };
      }

      return {
        status: "downgraded",
        reason: "Custom divider styling will publish as text instead of a native separator.",
        severity: "visual-only",
        component: undefined,
        contentParts: [buildDividerText(node.props)],
        embeds: [],
        outcomes: [makeOutcome(node, "downgraded", "Custom divider styling will publish as text instead of a native separator.", {
          severity: "visual-only",
          transformedTo: "text",
          lost: "Native separator styling is replaced with plain text symbols.",
        })],
        usesLayoutComponents: true,
        usesContentComponents: false,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
      };
    }
    case "media_gallery": {
      const items = Array.isArray(node.props.items) ? node.props.items : [];
      const validItems = items
        .map((item: any) => ({
          url: safeText(item?.url),
          description: safeText(item?.description) || undefined,
          spoiler: Boolean(item?.spoiler),
        }))
        .filter((item) => Boolean(item.url));

      if (validItems.length === 0) {
        return {
          ...emptyPlanResult(node, "blocked", "Media gallery needs at least one valid image URL.", {
            severity: "structural",
            transformedTo: "none",
            lost: "Media gallery content would be empty live.",
          }),
          invalidMediaConfiguration: true,
          usesContentComponents: true,
        };
      }

      return {
        status: "exact",
        reason: "Media gallery can publish as a native V2 gallery.",
        component: {
          type: COMPONENT_TYPES.MEDIA_GALLERY,
          id: node.id,
          items: validItems,
        },
        contentParts: [],
        embeds: [],
        outcomes: [makeOutcome(node, "exact", "Media gallery can publish as a native V2 gallery.", { liveType: "media_gallery" })],
        usesLayoutComponents: false,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
      };
    }
    case "file":
      if (!isHttpUrl(node.props.url)) {
        return {
          ...emptyPlanResult(node, "blocked", "File component needs a valid URL for live publish.", {
            severity: "structural",
            transformedTo: "none",
            lost: "Attachment would not resolve live.",
          }),
          usesContentComponents: true,
        };
      }
      return {
        status: "exact",
        reason: "File can publish as a native V2 file component.",
        component: {
          type: COMPONENT_TYPES.FILE,
          id: node.id,
          label: String(node.props.label || "Attachment"),
          url: String(node.props.url),
          spoiler: Boolean(node.props.spoiler),
        },
        contentParts: [],
        embeds: [],
        outcomes: [makeOutcome(node, "exact", "File can publish as a native V2 file component.", { liveType: "file" })],
        usesLayoutComponents: false,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
      };
    case "style_block":
      return {
        status: "downgraded",
        reason: "Style block will publish as a simplified embed.",
        severity: "structural",
        component: undefined,
        contentParts: [],
        embeds: [buildStyleBlockEmbed(node)],
        outcomes: [makeOutcome(node, "downgraded", "Style block will publish as a simplified embed.", {
          severity: "structural",
          transformedTo: "embed",
          lost: "Native V2 block styling is replaced with an embed card.",
        })],
        usesLayoutComponents: false,
        usesContentComponents: true,
        usesInteractiveComponents: false,
        missingCustomIdCount: 0,
        missingHandlerBindingCount: 0,
        invalidMediaConfiguration: false,
      };
    case "button":
      return planInteractiveButton(document, node);
    case "string_select":
      return planStringSelect(document, node);
    case "role_select":
    case "user_select":
    case "channel_select":
    case "mentionable_select":
      return {
        ...emptyPlanResult(node, "blocked", `${node.type.replace(/_/g, " ")} is still runtime gated and cannot publish exactly yet.`, {
          severity: "behavior-breaking",
          transformedTo: "none",
          lost: "Interactive behavior would not work live.",
        }),
        usesInteractiveComponents: true,
        missingHandlerBindingCount: 1,
      };
    case "action_row":
      return planActionRow(document, node, options);
    case "container":
      return planContainer(document, node, options);
    case "section":
      return planSection(document, node, options);
    default:
      return emptyPlanResult(node, "blocked", `${node.type} is not supported by the live publish planner yet.`, {
        severity: "behavior-breaking",
        transformedTo: "none",
        lost: "Live publish would misrepresent this node.",
      });
  }
}

function dedupeDiagnostics(diagnostics: StudioDiagnostic[]) {
  const seen = new Set<string>();
  return diagnostics.filter((entry) => {
    const key = `${entry.level}:${entry.code}:${entry.message}:${entry.path || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildStudioPublishPlan(
  document: StudioDocument,
  requestedViewId?: string,
  options?: StudioDocumentRenderOptions,
): StudioPublishPlan {
  const diagnostics = collectStudioDiagnostics(document, requestedViewId, options);
  const viewId = requestedViewId || document.meta.entryViewId;
  const view = document.views[viewId] || document.views[document.meta.entryViewId];

  if (!view) {
    return {
      viewId: document.meta.entryViewId,
      mode: "blocked",
      label: "Blocked publish",
      summary: "Selected page no longer exists.",
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
      diagnostics: dedupeDiagnostics([
        ...diagnostics,
        {
          level: "error",
          code: "VIEW_NOT_FOUND",
          message: "Selected page no longer exists.",
        },
      ]),
      liveMessage: {
        content: "",
        embeds: [],
        components: [],
        publishPath: "blocked",
      },
    };
  }

  const contentParts: string[] = [];
  if (safeText(view.messageContent)) contentParts.push(String(view.messageContent));
  const embeds: StudioEmbedDraft[] = Array.isArray(view.embeds) ? [...view.embeds] : [];
  const components: EmbedComponentType[] = [];
  const nodeResults = view.rootNodeIds.map((nodeId) => planNode(document, nodeId, options));
  const nodeOutcomes = nodeResults.flatMap((result) => result.outcomes);

  nodeResults.forEach((result) => {
    if (result.component) components.push(result.component);
    contentParts.push(...result.contentParts);
    embeds.push(...result.embeds);
  });

  const usesLayoutComponents = nodeResults.some((result) => result.usesLayoutComponents);
  const usesContentComponents = nodeResults.some((result) => result.usesContentComponents);
  const usesInteractiveComponents = nodeResults.some((result) => result.usesInteractiveComponents);
  const usesComponentsV2 = view.rootNodeIds.length > 0;
  const downgradedNodeCount = nodeOutcomes.filter((entry) => entry.status === "downgraded").length;
  const blockedNodeCount = nodeOutcomes.filter((entry) => entry.status === "blocked").length;
  const exactNodeCount = nodeOutcomes.filter((entry) => entry.status === "exact").length;
  const structuralDowngradeCount = nodeOutcomes.filter((entry) => entry.severity === "structural").length;
  const behaviorBreakingCount = nodeOutcomes.filter((entry) => entry.severity === "behavior-breaking").length;
  const missingCustomIdCount = nodeResults.reduce((total, result) => total + result.missingCustomIdCount, 0);
  const missingHandlerBindingCount = nodeResults.reduce((total, result) => total + result.missingHandlerBindingCount, 0);
  const invalidMediaConfiguration = nodeResults.some((result) => result.invalidMediaConfiguration);
  const emptyInteractiveMap = usesInteractiveComponents && !components.some((component) =>
    component.type === COMPONENT_TYPES.ACTION_ROW ||
    component.type === COMPONENT_TYPES.BUTTON ||
    component.type === COMPONENT_TYPES.SELECT_MENU,
  );

  let mode: StudioPublishMode = "exact";
  if (blockedNodeCount > 0 || diagnostics.some((entry) => entry.level === "error")) {
    mode = "blocked";
  } else if (downgradedNodeCount > 0) {
    mode = "downgraded";
  }

  const publishPath =
    mode === "blocked"
      ? "blocked"
      : mode === "downgraded"
        ? "downgraded"
        : usesComponentsV2
          ? "v2"
          : "legacy";

  const flags = components.length > 0 && publishPath !== "blocked" ? COMPONENTS_V2_FLAG : undefined;
  const payloadReady = Boolean(safeText(contentParts.join("\n\n")) || embeds.length > 0 || components.length > 0) && mode !== "blocked";
  const v2FlagReady = components.length > 0 ? Boolean(flags) : !usesComponentsV2 || publishPath === "legacy";
  const requiresStructuralConfirmation = mode === "downgraded" && structuralDowngradeCount > 0;
  const requiresSimplifiedConfirmation = mode === "downgraded";

  const plannerDiagnostics: StudioDiagnostic[] = [
    ...diagnostics,
    {
      level: mode === "blocked" ? "error" : mode === "downgraded" ? "warning" : "info",
      code: "PUBLISH_MODE",
      message:
        mode === "blocked"
          ? "Live publish is blocked until behavior-breaking or invalid nodes are fixed."
          : mode === "downgraded"
            ? "This page will publish in a simplified form unless you change the downgraded nodes."
            : publishPath === "v2"
              ? "This page can publish as an exact Components V2 message."
              : "This page publishes cleanly through the legacy message path.",
      path: `views.${view.id}`,
    },
  ];

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

  if (emptyInteractiveMap) {
    plannerDiagnostics.push({
      level: "warning",
      code: "EMPTY_INTERACTIVE_MAP",
      message: "This page includes interactive intent, but no sendable live interactive map was produced.",
      path: `views.${view.id}`,
    });
  }

  if (!v2FlagReady && usesComponentsV2) {
    plannerDiagnostics.push({
      level: "error",
      code: "V2_FLAG_NOT_READY",
      message: "Components V2 publish flag is not ready for this page.",
      path: `views.${view.id}`,
    });
  }

  const summary =
    mode === "blocked"
      ? "Blocked publish. Fix the blocked nodes before sending this page live."
      : mode === "downgraded"
        ? requiresStructuralConfirmation
          ? "Downgraded publish. Live output will simplify structural layout, so review it before sending."
          : "Downgraded publish. Live output will simplify some visual details."
        : publishPath === "v2"
          ? "Exact V2 publish. Preview and live payload can match."
          : "Exact publish through the legacy message path.";

  return {
    viewId: view.id,
    mode,
    label: mode === "blocked" ? "Blocked publish" : mode === "downgraded" ? "Downgraded publish" : "Exact V2 publish",
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
    missingCustomIdCount,
    missingHandlerBindingCount,
    emptyInteractiveMap,
    invalidMediaConfiguration,
    v2FlagReady,
    payloadReady,
    requiresSimplifiedConfirmation,
    requiresStructuralConfirmation,
    nodeOutcomes,
    diagnostics: dedupeDiagnostics(plannerDiagnostics),
    liveMessage: {
      content: contentParts.join("\n\n").trim() || undefined,
      embeds: embeds.slice(0, 10),
      components,
      flags,
      publishPath,
    },
  };
}
