export type CustomCommandV2ImportNoticeSeverity = "info" | "warning";

export interface CustomCommandV2ImportNotice {
  code: string;
  title: string;
  detail: string;
  severity: CustomCommandV2ImportNoticeSeverity;
}

export interface CustomCommandV2ImportParseLocation {
  position: number;
  line: number;
  column: number;
  snippet?: string;
  likelyReason?: string;
  nextSuggestion?: string;
  technicalMessage?: string;
}

export interface CustomCommandV2ImportNormalizationResult {
  normalizedText: string;
  extractedText: string | null;
  extractedCandidates: string[];
  notices: CustomCommandV2ImportNotice[];
  wrapperPrefixRemoved: boolean;
  wrapperSuffixRemoved: boolean;
}

const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\u2060\uFEFF]/g;
const SMART_DOUBLE_QUOTE_PATTERN = /[\u201C\u201D\u201E\u201F\u2033\uFF02]/g;
const SMART_SINGLE_QUOTE_PATTERN = /[\u2018\u2019\u201A\u201B\u2032\u2035\uFF07\u02BC]/g;
const MOBILE_LINE_BREAK_PATTERN = /[\u2028\u2029]/g;
const ODD_SPACING_PATTERN = /[\u00A0\u2007\u202F]/g;
const OUTER_CODE_FENCE_PATTERN = /^```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```$/;
const EMBEDDED_CODE_FENCE_PATTERN = /```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g;

function pushNotice(
  notices: CustomCommandV2ImportNotice[],
  code: string,
  title: string,
  detail: string,
  severity: CustomCommandV2ImportNoticeSeverity = "info",
) {
  notices.push({ code, title, detail, severity });
}

function extractBalancedJsonObjects(raw: string) {
  const source = raw.trim();
  const candidates: string[] = [];
  let start: number | null = null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (start === null) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        candidates.push(source.slice(start, index + 1).trim());
        start = null;
      }
    }
  }

  return candidates;
}

function replaceOutsideAsciiStrings(source: string, pattern: RegExp, replacement: string) {
  let next = "";
  let inString = false;
  let escape = false;

  for (const char of source) {
    if (escape) {
      next += char;
      escape = false;
      continue;
    }

    if (char === "\\" && inString) {
      next += char;
      escape = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      next += char;
      continue;
    }

    next += !inString ? char.replace(pattern, replacement) : char;
  }

  return next;
}

function buildLikelyReason(raw: string, message: string, position: number) {
  if (!raw.trim().startsWith("{")) {
    return "The payload starts with extra text before the opening brace.";
  }
  const char = raw[position] || "";
  if (char === "'") {
    return "This looks like single quotes where JSON needs straight double quotes.";
  }
  if (char === "`") {
    return "A stray backtick is still in the payload, which usually means markdown fence text is still present.";
  }
  if (message.includes("Expected property name") || message.includes("Expected double-quoted property name")) {
    return "A key is probably missing straight double quotes, or there may be a trailing comma nearby.";
  }
  if (message.includes("Unexpected end")) {
    return "The JSON looks cut off before the final closing brace.";
  }
  if (SMART_DOUBLE_QUOTE_PATTERN.test(raw)) {
    return "This paste still appears to contain smart quotes.";
  }
  return "The payload is still not structurally safe JSON.";
}

function buildNextSuggestion(raw: string, message: string) {
  if (!raw.trim().startsWith("{")) {
    return "Keep one JSON object only, starting at the first opening brace.";
  }
  if (message.includes("Expected property name") || message.includes("Expected double-quoted property name")) {
    return "Check the key names and commas near the reported position, then preview again.";
  }
  if (message.includes("Unexpected end")) {
    return "Make sure the object closes fully and that every opening brace or bracket has a matching close.";
  }
  return "Remove any extra wrapper text, smart quotes, or unsupported edits, then preview the JSON again.";
}

function stripCodeFences(input: string) {
  const trimmed = input.trim();
  const outerMatch = trimmed.match(OUTER_CODE_FENCE_PATTERN);
  if (outerMatch) {
    return {
      text: outerMatch[1].trim(),
      removed: true,
    };
  }

  if (!trimmed.includes("```")) {
    return {
      text: trimmed,
      removed: false,
    };
  }

  const matches = Array.from(trimmed.matchAll(EMBEDDED_CODE_FENCE_PATTERN));
  if (matches.length === 1) {
    const replacement = matches[0][1].trim();
    return {
      text: trimmed.replace(matches[0][0], replacement).trim(),
      removed: true,
    };
  }

  return {
    text: trimmed,
    removed: false,
  };
}

export function normalizeCustomCommandV2ImportText(raw: string): CustomCommandV2ImportNormalizationResult {
  const notices: CustomCommandV2ImportNotice[] = [];
  let working = typeof raw === "string" ? raw : String(raw ?? "");

  const withoutBom = working.replace(/\uFEFF/g, "");
  if (withoutBom !== working) {
    working = withoutBom;
    pushNotice(
      notices,
      "removed_bom",
      "Removed hidden file markers",
      "Archivist removed hidden BOM markers that can sneak in before or around the JSON object.",
    );
  }

  const withoutZeroWidth = working.replace(ZERO_WIDTH_PATTERN, "");
  if (withoutZeroWidth !== working) {
    working = withoutZeroWidth;
    pushNotice(
      notices,
      "removed_zero_width",
      "Removed invisible characters",
      "Archivist stripped hidden clipboard characters that often break mobile JSON pastes.",
    );
  }

  const normalizedLineBreaks = working.replace(/\r\n?/g, "\n").replace(MOBILE_LINE_BREAK_PATTERN, "\n");
  if (normalizedLineBreaks !== working) {
    working = normalizedLineBreaks;
    pushNotice(
      notices,
      "normalized_line_breaks",
      "Normalized pasted line breaks",
      "Archivist cleaned up mobile clipboard line separators before validation.",
    );
  }

  const normalizedSpacing = working.replace(ODD_SPACING_PATTERN, " ");
  if (normalizedSpacing !== working) {
    working = normalizedSpacing;
    pushNotice(
      notices,
      "normalized_spacing",
      "Normalized clipboard spacing",
      "Archivist replaced non-standard spaces from the pasted payload with plain spaces before validation.",
    );
  }

  const normalizedDoubleQuotes = working.replace(SMART_DOUBLE_QUOTE_PATTERN, "\"");
  if (normalizedDoubleQuotes !== working) {
    working = normalizedDoubleQuotes;
    pushNotice(
      notices,
      "normalized_smart_quotes",
      "Replaced smart double quotes",
      "This paste used curly quotes. Archivist converted them to standard JSON quotes.",
      "warning",
    );
  }

  const normalizedApostrophes = replaceOutsideAsciiStrings(working, SMART_SINGLE_QUOTE_PATTERN, "'");
  if (normalizedApostrophes !== working) {
    working = normalizedApostrophes;
    pushNotice(
      notices,
      "normalized_smart_apostrophes",
      "Replaced smart apostrophes",
      "Archivist converted curly apostrophes to plain apostrophes outside JSON string content.",
    );
  }

  const trimmed = working.trim();
  working = trimmed;

  const fenced = stripCodeFences(working);
  if (fenced.removed) {
    working = fenced.text;
    pushNotice(
      notices,
      "removed_code_fences",
      "Removed markdown code fences",
      "Archivist stripped markdown fences so only the JSON payload stays in the import flow.",
      "warning",
    );
  } else {
    working = fenced.text;
  }

  const candidates = extractBalancedJsonObjects(working);
  let extractedText: string | null = working;
  let wrapperPrefixRemoved = false;
  let wrapperSuffixRemoved = false;

  if (candidates.length === 1) {
    const candidate = candidates[0];
    const candidateIndex = working.indexOf(candidate);
    const prefix = candidateIndex > 0 ? working.slice(0, candidateIndex) : "";
    const suffix = candidateIndex >= 0 ? working.slice(candidateIndex + candidate.length) : "";
    wrapperPrefixRemoved = prefix.trim().length > 0;
    wrapperSuffixRemoved = suffix.trim().length > 0;
    extractedText = candidate;

    if (wrapperPrefixRemoved || wrapperSuffixRemoved) {
      pushNotice(
        notices,
        "extracted_wrapped_json",
        "Extracted the JSON object from wrapper text",
        "Archivist found one likely command object and ignored the prose around it.",
        "warning",
      );
    }
  } else if (candidates.length === 0) {
    const firstBraceIndex = working.indexOf("{");
    extractedText = firstBraceIndex >= 0 ? working.slice(firstBraceIndex).trim() : null;
  } else {
    extractedText = candidates[0];
  }

  return {
    normalizedText: working,
    extractedText,
    extractedCandidates: candidates,
    notices,
    wrapperPrefixRemoved,
    wrapperSuffixRemoved,
  };
}

export function getCustomCommandV2JsonParseLocation(raw: string, error: unknown): CustomCommandV2ImportParseLocation | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch) return null;

  const position = Number.parseInt(positionMatch[1], 10);
  if (!Number.isFinite(position) || position < 0) return null;

  const safePosition = Math.min(position, raw.length);
  const slice = raw.slice(0, safePosition);
  const lines = slice.split("\n");
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;
  const snippetStart = Math.max(0, safePosition - 24);
  const snippetEnd = Math.min(raw.length, safePosition + 24);
  const snippet = raw.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim();

  return {
    position,
    line,
    column,
    snippet: snippet || undefined,
    likelyReason: buildLikelyReason(raw, message, safePosition),
    nextSuggestion: buildNextSuggestion(raw, message),
    technicalMessage: message || undefined,
  };
}
