import type {
  CustomCommandV2Definition,
  CustomCommandV2ImportCreateRequest,
  CustomCommandV2ImportPreviewResponse,
  CustomCommandV2ImportSource,
  CustomCommandV2Issue,
} from "@shared/custom-command-v2";
import {
  customCommandV2ImportPayloadSchema,
  extractCustomCommandV2ImportJson,
  normalizeCustomCommandV2ImportPayload,
  summarizeCustomCommandV2,
} from "@shared/custom-command-v2";
import {
  getCustomCommandV2JsonParseLocation,
  normalizeCustomCommandV2ImportText,
} from "@shared/custom-command-v2-import-normalize";
import { buildCustomCommandV2CreateInput, compileCustomCommandV2Definition } from "./compile";

function buildSource(kind: CustomCommandV2ImportSource["kind"], raw: string): CustomCommandV2ImportSource {
  return {
    kind,
    raw,
    importedAt: new Date().toISOString(),
  };
}

function issue(
  path: string,
  code: string,
  message: string,
  severity: "error" | "warning" = "error",
  suggestedFix?: string,
): CustomCommandV2Issue {
  return { path, code, message, severity, suggestedFix };
}

function buildBaseResponse(input: {
  diagnostics: CustomCommandV2ImportPreviewResponse["diagnostics"];
  issues?: CustomCommandV2Issue[];
  preview?: CustomCommandV2ImportPreviewResponse["preview"];
  definition?: CustomCommandV2ImportPreviewResponse["definition"];
  compiled?: CustomCommandV2ImportPreviewResponse["compiled"];
  importReady?: boolean;
  draftReady?: boolean;
}): CustomCommandV2ImportPreviewResponse {
  return {
    ok: Boolean(input.importReady),
    importReady: Boolean(input.importReady),
    draftReady: Boolean(input.draftReady),
    issues: input.issues || [],
    diagnostics: input.diagnostics,
    preview: input.preview ?? null,
    definition: input.definition ?? null,
    compiled: input.compiled ?? null,
  };
}

function buildDiagnostics(raw: string, parseError?: unknown) {
  const normalized = normalizeCustomCommandV2ImportText(raw);
  const parseLocation = parseError && normalized.extractedText
    ? getCustomCommandV2JsonParseLocation(normalized.extractedText, parseError)
    : null;

  return {
    normalizedText: normalized.normalizedText,
    extractedText: normalized.extractedText,
    extractedCandidateCount: normalized.extractedCandidates.length,
    notices: normalized.notices,
    wrapperPrefixRemoved: normalized.wrapperPrefixRemoved,
    wrapperSuffixRemoved: normalized.wrapperSuffixRemoved,
    parseLocation,
  };
}

function getFirstNonWhitespaceCharacter(value: string) {
  const match = value.match(/\S/);
  return match ? value[match.index ?? 0] : null;
}

function getParseFailureDetails(input: {
  text: string;
  error: unknown;
  normalization: ReturnType<typeof normalizeCustomCommandV2ImportText>;
}) {
  const technicalMessage = input.error instanceof Error ? input.error.message : String(input.error ?? "");
  const firstCharacter = getFirstNonWhitespaceCharacter(input.text);

  if (firstCharacter && firstCharacter !== "{") {
    return {
      code: "invalid_leading_character",
      message: "The payload starts with an invalid character before the opening brace.",
      suggestedFix: "Remove everything before the first { so Archivist receives one clean JSON object.",
      likelyReason: "Extra wrapper text is still present before the JSON object.",
      nextSuggestion: "Ask the chatbot to return raw JSON only, then paste that response here directly.",
      technicalMessage,
    };
  }

  if (
    input.normalization.notices.some((notice) => notice.code === "normalized_smart_quotes")
    || /[“”]/.test(input.text)
  ) {
    return {
      code: "smart_quotes_remaining",
      message: "Looks like your JSON contains smart quotes or copied mobile formatting.",
      suggestedFix: "Use straight ASCII double quotes only for every JSON key and string value.",
      likelyReason: "Curly quotes or copied formatting are still breaking the JSON structure.",
      nextSuggestion: "Copy the response as plain text, or ask the chatbot to return raw JSON with no markdown.",
      technicalMessage,
    };
  }

  if (/(^|[{,]\s*)'[^']+'\s*:/.test(input.text) || /:\s*'[^']*'/.test(input.text)) {
    return {
      code: "single_quotes_used",
      message: "This paste uses single quotes, but JSON requires double quotes.",
      suggestedFix: "Replace single quotes around keys or string values with straight double quotes.",
      likelyReason: "The payload is shaped like JavaScript, not strict JSON.",
      nextSuggestion: "Tell the chatbot to return JSON only, not JavaScript object syntax.",
      technicalMessage,
    };
  }

  if (/\{\s*[A-Za-z0-9_-]+\s*:/.test(input.text) || /,\s*[A-Za-z0-9_-]+\s*:/.test(input.text)) {
    return {
      code: "missing_key_quotes",
      message: "This paste looks close, but at least one object key is missing double quotes.",
      suggestedFix: "Wrap every property name in straight double quotes, like \"name\": \"value\".",
      likelyReason: "One or more object keys are written without JSON quotes.",
      nextSuggestion: "Fix the first unquoted key near the reported position and preview again.",
      technicalMessage,
    };
  }

  if (/,\s*[}\]]/.test(input.text)) {
    return {
      code: "trailing_comma",
      message: "This JSON contains a trailing comma that breaks parsing.",
      suggestedFix: "Remove the comma before the closing } or ] and preview again.",
      likelyReason: "A trailing comma is present near the end of an object or array.",
      nextSuggestion: "Check the line around the reported position for a comma immediately before a closing bracket.",
      technicalMessage,
    };
  }

  if (/unexpected end/i.test(technicalMessage)) {
    return {
      code: "incomplete_json",
      message: "This JSON looks incomplete, so Archivist cannot safely import it yet.",
      suggestedFix: "Check for a missing closing brace, bracket, or quote near the end of the payload.",
      likelyReason: "The object ends before JSON parsing can finish.",
      nextSuggestion: "Make sure the first { has a matching closing } and every string is closed.",
      technicalMessage,
    };
  }

  return {
    code: "invalid_json",
    message: "Import is blocked because this payload is not structurally safe yet.",
    suggestedFix: "Paste one clean JSON object only, with no comments, markdown, or broken syntax.",
    likelyReason: "The JSON structure still breaks before Archivist can validate the command schema.",
    nextSuggestion: "Fix the reported line and column, then run preview again.",
    technicalMessage,
  };
}

function mapSchemaIssue(entry: any): CustomCommandV2Issue {
  const path = entry.path?.length ? entry.path.join(".") : "command";

  if (entry.code === "unrecognized_keys" && Array.isArray(entry.keys) && entry.keys.length > 0) {
    const fields = entry.keys.join(", ");
    return issue(
      path,
      "unsupported_fields",
      `Archivist found unsupported field${entry.keys.length === 1 ? "" : "s"} here: ${fields}.`,
      "error",
      "Remove fields that are not part of the Archivist command schema, then preview again.",
    );
  }

  if (entry.code === "invalid_union_discriminator" && path === "command.trigger.type") {
    return issue(
      path,
      "unsupported_trigger_type",
      "This trigger type is not supported by Archivist Custom Commands import.",
      "error",
      Array.isArray(entry.options) && entry.options.length > 0
        ? `Use one of the supported trigger types only: ${entry.options.join(", ")}.`
        : "Use one of the supported trigger types from the generated AI prompt or the import guide.",
    );
  }

  if (entry.code === "invalid_union_discriminator" && path.includes("workflow.steps") && path.endsWith("type")) {
    return issue(
      path,
      "unsupported_step_type",
      "This workflow step type is not supported by Archivist import.",
      "error",
      Array.isArray(entry.options) && entry.options.length > 0
        ? `Use one of the supported workflow step types only: ${entry.options.join(", ")}.`
        : "Use one of the supported workflow step types from the generated AI prompt or the import guide.",
    );
  }

  if (path === "schemaVersion") {
    return issue(
      path,
      "invalid_schema_version",
      "This payload uses the wrong schema version for Archivist import.",
      "error",
      "Set schemaVersion to 1 and keep the rest of the top-level contract unchanged.",
    );
  }

  if (path === "kind") {
    return issue(
      path,
      "invalid_kind",
      "This payload is missing the Archivist command kind at the top level.",
      "error",
      "Set kind to \"archivist-command\".",
    );
  }

  if (entry.code === "invalid_type" && entry.received === "undefined") {
    return issue(
      path,
      "missing_required_field",
      `A required field is missing at ${path}.`,
      "error",
      "Fill in the missing field and preview again.",
    );
  }

  if (entry.code === "invalid_union_discriminator") {
    return issue(
      path,
      "unsupported_variant",
      "This section uses a variant Archivist does not support here.",
      "error",
      "Choose one of the documented trigger or step types only.",
    );
  }

  if (entry.code === "too_small" && path === "command.meta.name") {
    return issue(
      path,
      "missing_command_name",
      "This payload needs a command name before Archivist can import it.",
      "error",
      "Set command.meta.name to a short, useful command name.",
    );
  }

  return issue(
    path,
    entry.code || "invalid_payload",
    entry.message || "This payload does not match the Archivist command schema yet.",
    "error",
    "Review the highlighted field and adjust it to match the Archivist command format.",
  );
}

function getDraftDefinition(definition: CustomCommandV2Definition) {
  return {
    ...definition,
    behavior: {
      ...definition.behavior,
      enabled: false,
    },
  } satisfies CustomCommandV2Definition;
}

function evaluateDefinition(definition: CustomCommandV2Definition) {
  const compiled = compileCustomCommandV2Definition(definition);
  return {
    definition,
    compiled: compiled.compiled,
    issues: compiled.issues,
    importReady: Boolean(compiled.compiled) && compiled.issues.every((entry) => entry.severity !== "error"),
  };
}

export function previewCustomCommandV2Import(
  raw: string,
  _sourceKind: CustomCommandV2ImportSource["kind"] = "paste-json",
): CustomCommandV2ImportPreviewResponse {
  const diagnostics = buildDiagnostics(raw);
  const normalized = normalizeCustomCommandV2ImportText(raw);

  if (!normalized.normalizedText.includes("{")) {
    return buildBaseResponse({
      diagnostics,
      issues: [
        issue(
          "raw",
          "missing_json_object",
          "Archivist could not find a JSON object in that paste.",
          "error",
          "Paste one Archivist command object only. If a chatbot added explanation text, keep the JSON object and remove the rest.",
        ),
      ],
    });
  }

  if (normalized.extractedCandidates.length > 1) {
    return buildBaseResponse({
      diagnostics,
      issues: [
        issue(
          "raw",
          "ambiguous_multiple_json_objects",
          "We found more than one JSON object in this paste, so Archivist cannot safely guess which one to import.",
          "error",
          "Keep exactly one command object in the paste with no second example or wrapper payload.",
        ),
      ],
    });
  }

  if (!normalized.extractedText) {
    return buildBaseResponse({
      diagnostics,
      issues: [
        issue(
          "raw",
          "missing_opening_brace",
          "This paste looks close, but Archivist still cannot find a clean opening brace for the command object.",
          "error",
          "Keep one JSON object only, starting with { and ending with }.",
        ),
      ],
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(normalized.extractedText);
  } catch (error) {
    const parseDiagnostics = buildDiagnostics(raw, error);
    const parseDetails = getParseFailureDetails({
      text: normalized.extractedText || normalized.normalizedText,
      error,
      normalization: normalized,
    });
    const diagnostics = {
      ...parseDiagnostics,
      parseLocation: parseDiagnostics.parseLocation
        ? {
            ...parseDiagnostics.parseLocation,
            likelyReason: parseDetails.likelyReason,
            nextSuggestion: parseDetails.nextSuggestion,
            technicalMessage: parseDetails.technicalMessage,
          }
        : null,
    };

    return buildBaseResponse({
      diagnostics,
      issues: [
        issue(
          "raw",
          parseDetails.code,
          diagnostics.parseLocation
            ? `${parseDetails.message} Archivist hit the break at line ${diagnostics.parseLocation.line}, column ${diagnostics.parseLocation.column}.`
            : parseDetails.message,
          "error",
          parseDetails.suggestedFix,
        ),
      ],
    });
  }

  const normalizedJson = normalizeCustomCommandV2ImportPayload(parsedJson);
  const issues: CustomCommandV2Issue[] = [];

  if (normalizedJson !== parsedJson) {
    issues.push(
      issue(
        "command",
        "legacy_import_normalized",
        "Archivist converted this payload from an older command shape into the current v2 workflow format.",
        "warning",
        "Open the imported command in the builder and review the trigger, access, and workflow sections before publishing.",
      ),
    );
  }

  const payload = customCommandV2ImportPayloadSchema.safeParse(normalizedJson);
  if (!payload.success) {
    return buildBaseResponse({
      diagnostics,
      issues: [...issues, ...payload.error.issues.map(mapSchemaIssue)],
    });
  }

  const publishedEvaluation = evaluateDefinition(payload.data.command);
  const draftEvaluation = evaluateDefinition(getDraftDefinition(payload.data.command));
  const preview = summarizeCustomCommandV2(payload.data.command);

  return buildBaseResponse({
    diagnostics,
    issues: [...issues, ...publishedEvaluation.issues],
    preview,
    definition: payload.data.command,
    compiled: publishedEvaluation.compiled,
    importReady: publishedEvaluation.importReady,
    draftReady: draftEvaluation.importReady,
  });
}

export function prepareCustomCommandV2Import(input: CustomCommandV2ImportCreateRequest) {
  const preview = previewCustomCommandV2Import(input.raw, input.sourceKind);

  if (!preview.definition) {
    return {
      ok: false as const,
      preview,
      createInput: null,
    };
  }

  const definition = input.saveAsDraft ? getDraftDefinition(preview.definition) : preview.definition;
  const evaluated = evaluateDefinition(definition);

  if (!evaluated.compiled || evaluated.issues.some((entry) => entry.severity === "error")) {
    return {
      ok: false as const,
      preview: {
        ...preview,
        ok: false,
        importReady: false,
        draftReady: input.saveAsDraft ? false : preview.draftReady,
        issues: evaluated.issues,
        preview: summarizeCustomCommandV2(definition),
        definition,
        compiled: evaluated.compiled,
      },
      createInput: null,
    };
  }

  const finalCompilation = buildCustomCommandV2CreateInput({
    definition,
    compiled: evaluated.compiled,
    issues: evaluated.issues,
    source: buildSource(input.sourceKind, extractCustomCommandV2ImportJson(input.raw) || input.raw.trim()),
  });

  return {
    ok: true as const,
    preview: {
      ...preview,
      ok: true,
      importReady: true,
      draftReady: true,
      issues: input.saveAsDraft ? evaluated.issues : preview.issues,
      preview: summarizeCustomCommandV2(definition),
      definition,
      compiled: evaluated.compiled,
    },
    createInput: finalCompilation,
  };
}
