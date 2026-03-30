export type DecorativeStyleCategory =
  | "dividers"
  | "borders"
  | "frames"
  | "section_headers"
  | "accent_lines"
  | "edgy_dark"
  | "soft_cute"
  | "utility_minimal";

export interface DecorativeStyleItem {
  id: string;
  label: string;
  category: DecorativeStyleCategory;
  value: string;
  tags: string[];
  notes?: string;
}

type DecorativeStyleSeed =
  | string
  | {
      value: string;
      label?: string;
      tags?: string[];
      notes?: string;
    };

interface DecorativeCategoryMeta {
  label: string;
  description: string;
  tags: string[];
}

export const DECORATIVE_STYLE_CATEGORY_ORDER: DecorativeStyleCategory[] = [
  "dividers",
  "borders",
  "frames",
  "section_headers",
  "accent_lines",
  "edgy_dark",
  "soft_cute",
  "utility_minimal",
];

export const DECORATIVE_STYLE_CATEGORY_META: Record<DecorativeStyleCategory, DecorativeCategoryMeta> = {
  dividers: {
    label: "Dividers",
    description: "Fast separators for rules, announcements, and list breaks.",
    tags: ["divider", "separator", "break"],
  },
  borders: {
    label: "Borders",
    description: "Edge treatments and top-bottom pairs that add instant structure.",
    tags: ["border", "edge", "wrapper"],
  },
  frames: {
    label: "Frames",
    description: "Ready-made text containers for panels, notices, and callouts.",
    tags: ["frame", "panel", "container"],
  },
  section_headers: {
    label: "Section Headers",
    description: "Header-ready labels and branded text markers for key sections.",
    tags: ["header", "section", "label"],
  },
  accent_lines: {
    label: "Accent Lines",
    description: "Atmospheric linework for adding mood without a full frame.",
    tags: ["accent", "ornamental", "line"],
  },
  edgy_dark: {
    label: "Edgy / Dark",
    description: "Sharper, darker styling for gate notices, warnings, and heavy mood.",
    tags: ["edgy", "dark", "gothic"],
  },
  soft_cute: {
    label: "Soft / Cute",
    description: "Hearts, bows, florals, and dreamy lines for lighter server vibes.",
    tags: ["soft", "cute", "heart"],
  },
  utility_minimal: {
    label: "Utility / Minimal",
    description: "Clean, low-noise options that stay readable on any theme.",
    tags: ["utility", "minimal", "clean"],
  },
};

const DECORATIVE_STYLE_SEEDS: Record<DecorativeStyleCategory, DecorativeStyleSeed[]> = {
  dividers: [
    "⌢⌢⌢⌢⌢⌢⌢⌢⌢⌢⌢⌢⌢⌢",
    "⌣⌣⌣⌣⌣⌣⌣⌣⌣⌣⌣⌣⌣⌣",
    "════════════════════",
    "⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘",
    "︶︶︶︶︶︶︶︶︶︶︶︶",
    "☆═━┈┈━═☆",
    "┈┈┈┈┈┈┈┈┈",
    "・┈┈・┈┈・┈┈・",
    "━━━━━━━━━━━━",
    "﹀﹀﹀﹀﹀﹀﹀﹀",
    "﹌﹌﹌﹌﹌﹌﹌﹌",
    "﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏",
    "———————————————————",
    "⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒",
    "════∘◦❁◦∘════",
    "════❖════",
    "────── ꔫ ──────",
    "★──────────★─────────★",
    "▰━▰━▰━▰━▰━▰━▰━▰",
    "◆::◇::◆::◇::◆",
    "▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰",
    "△▽△▽△▽△▽△▽",
    "◈◆◈◆◈◆◈◆◈◆◈◆◈◆◈",
    "◇──◆──◇──◆──◇──◆──",
    "₪₪₪₪₪₪₪₪₪₪₪",
    "❉╤╤╤╤✿╤╤╤╤❉",
    "❉╧╧╧╧✿╧╧╧╧❉",
    "╴╴╴╴╴⊹ꮺ˚ ╴╴╴╴╴⊹˚ ╴╴╴╴˚ೃ",
    "▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄",
    "— — — — — — — — — — — — — —",
    "＼／＼／＼／＼／＼／＼／＼／＼／＼／＼／",
  ],
  borders: [
    "꧁──────ஓ๑♡๑ஓ──────꧂",
    "╔═══*.·:·.★ ✦ ★･:･:═══╗",
    "╚═══.·:·.★ ✦ ★･:･:═══╝",
    "╔══════ ≪≫°✺°≪ ≫ ══════╗",
    "╚══════ ≪≫°✺°≪ ≫ ══════╝",
    "╭── ⋅ ⋅ ── ✩ ── ⋅ ⋅ ──╮",
    "╰── ⋅ ⋅ ── ✩ ── ⋅ ⋅ ──╯",
    "╔═*.·:·.✧ ✦ ✧.·:·.*═╗",
    "╚═*.·:·.✧ ✦ ✧.·:·.*═╝",
    "╭━━━ ⋆⋅☆⋅⋆ ━━━╮",
    "╰━━━ ⋆⋅☆⋅⋆ ━━━╯",
    "┏━━━༻❁༺━━━┓",
    "┗━━━༻❁༺━━━┛",
    "╔═══════ ༺♡༻ ═══════╗",
    "╚═══════ ༺♡༻ ═══════╝",
    "┌─────── ✦ ───────┐",
    "└─────── ✦ ───────┘",
    "╭─────── ୨♡୧ ───────╮",
    "╰─────── ୨♡୧ ───────╯",
    "┏━━━━━━━━━𖦹━━━━━━━━━┓",
    "┗━━━━━━━━━𖦹━━━━━━━━━┛",
    "╭─── •.★.• ───╮",
    "╰─── •.★.• ───╯",
    "╔═════ ⟡ ⟡ ⟡ ═════╗",
    "╚═════ ⟡ ⟡ ⟡ ═════╝",
    "╭━━━━━ ꩜ ━━━━━╮",
    "╰━━━━━ ꩜ ━━━━━╯",
    "┏━━━⋆｡°✩°｡⋆━━━┓",
    "┗━━━⋆｡°✩°｡⋆━━━┛",
    "╒══════════════════╕",
    "╘══════════════════╛",
    "╔═════════════╗",
    "╚═════════════╝",
    "╔════════════════════╗",
    "╚════════════════════╝",
    "┏━━━━━━━━━━━━━━━━━━━━┓",
    "┗━━━━━━━━━━━━━━━━━━━━┛",
    "┌──────═━┈┈━═──────┐",
    "└──────═━┈┈━═──────┘",
  ],
  frames: [
    {
      label: "Classic Box",
      value: "+--------------+\n|              |\n+--------------+",
      tags: ["ascii", "frame"],
      notes: "Fast neutral frame for plain text blocks.",
    },
    {
      label: "Slanted Box",
      value: "/--------------\\\\\n|              |\n\\\\--------------/",
      tags: ["ascii", "frame"],
    },
    {
      label: "Moonline Frame",
      value: "╔═══*.·:·.☽✧    TEXT    ✧☾.·:·.*═══╗\n╚═══*.·:·.☽✧    TEXT    ✧☾.·:·.*═══╝",
      tags: ["template", "header"],
      notes: "Swap TEXT with your own headline or notice.",
    },
    {
      label: "Heart Crest Frame",
      value: "┏━━━༺♡༻━━━┓\n   YOUR TEXT HERE\n┗━━━༺♡༻━━━┛",
      tags: ["template", "soft"],
      notes: "Drop in a short title or one-line CTA.",
    },
    {
      label: "Soft Ribbon Frame",
      value: "╭────── · · ୨୧ · · ──────╮\n        YOUR TEXT\n╰────── · · ୨୧ · · ──────╯",
      tags: ["template", "soft", "panel"],
      notes: "Good for intro blurbs, notices, or section transitions.",
    },
    {
      label: "Minimal Glow Frame",
      value: "┌──────═━┈┈━═──────┐\n       YOUR TEXT\n└──────═━┈┈━═──────┘",
      tags: ["template", "minimal"],
      notes: "Keeps a clean boxed look without overpowering content.",
    },
  ],
  section_headers: [
    "╔═══════[ TEXT ]═══════╗",
    "╚═══════[ TEXT ]═══════╝",
    "┏━━━━━━━〔 TEXT 〕━━━━━━━┓",
    "┗━━━━━━━〔 TEXT 〕━━━━━━━┛",
    "╭───────「 TEXT 」───────╮",
    "╰───────「 TEXT 」───────╯",
    "╔═══༻ TEXT ༺═══╗",
    "╚═══༻ TEXT ༺═══╝",
    "╔═══ ♔ TEXT ♔ ═══╗",
    "╚═══ ♔ TEXT ♔ ═══╝",
    "✦ ── INTRO ── ✦",
    "♡ ── RULES ── ♡",
    "♔ ── ACCESS ── ♔",
    "⟡ ── VERIFY ── ⟡",
    "❀ ── INFO ── ❀",
    "✞ ── STAFF ── ✞",
    "꩜ ── LINKS ── ꩜",
    "〔 ARCHIVIST 〕",
    "「 ARCHIVIST 」",
    "⟡ ARCHIVIST ⟡",
    "✦ ARCHIVIST ✦",
    "♔ ARCHIVIST ♔",
    "♡ ARCHIVIST ♡",
    "꩜ ARCHIVIST ꩜",
    "✞ ARCHIVIST ✞",
    "╔═══════ ⟡ RULES ⟡ ═══════╗",
    "✦・┈┈┈・〔 TEXT 〕・┈┈┈・✦",
    "♡━━━〔 TEXT 〕━━━♡",
    "⟡────────〔 TEXT 〕────────⟡",
    "❀──────〔 TEXT 〕──────❀",
    "♔══════〔 TEXT 〕══════♔",
    "✞──────〔 TEXT 〕──────✞",
    "✦ ── VERIFY ── ✦",
    "╭───────「 ACCESS 」───────╮",
    "┏━━━━━━━〔 STAFF 〕━━━━━━━┓",
    "♡━━━〔 LINKS 〕━━━♡",
    "❀──────〔 INFO 〕──────❀",
  ],
  accent_lines: [
    "𓊆 𓊇 𓊈 𓊉 𓉘 𓉝 𓈖",
    "∘₊✧──────✧₊∘",
    "➽──────────────❥",
    "✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦",
    "✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦ . 　⁺ 　 .",
    "⠂⠄⠄⠂⠁⠁⠂⠄⠄⠂⠁⠁⠂⠄⠄⠂ ⠂⠄⠄⠂☆",
    "꩜ ‧.°. 𖦹.°.‧ ꩜‧.°.𖦹 .°.‧",
    "╭──────────.★..─╮",
    "╰─..★.──────────╯",
    "𓈒⠀𓂃⠀⠀˖⠀𓇬⠀˖⠀⠀𓂃⠀𓈒",
    "⋅•⋅⋅•⋅⋅•⋅⋅•⋅∙∘☽༓☾∘∙•⋅⋅⋅•⋅⋅⋅•⋅⋅",
    "¸¸♬·¯·♩¸¸♪·¯·♫¸¸¸♬·¯·♩¸¸♪·¯·♫¸¸",
    "❀° ┄──────╮",
    "╰──────┄ °❀",
    ".·:·.┏━⋅━⋅━━⋅༻❁༺⋅━━⋅━⋅━┓:·.",
    ".·:·.╰━⋅━⋅━.· ✿༻༺✿·.━⋅━⋅━╯:·.",
    "✧°˖────———- ・・・・・  . ☽ ‧₊˚ ···╮",
    "╰┈ ‧₊˚ ☾. ⋅  ・・・・———-────°˖✧",
    "⊱ ────── {.⋅ ♫ ⋅.} ─────",
    "。✯ ＼｜／。✯ ＼ ｜ ／✯ 。✯ ＼ ｜ ／✯ 。",
    "｡･::･ﾟ★,｡･::･ﾟ☆｡･::･ﾟ★,｡･::･ﾟ☆｡･:*:･ﾟ★",
    "⊱ ────── {⋅. ✯ .⋅} ────── ⊰",
    "✧─── ･ ｡ﾟ★: .✦ . :★. ───✧",
    "┈ ✁✃✁✃✁✃✁✃✁ ┈",
    "━◦○◦━◦○◦━◦○◦━◦○◦━◦○◦━◦○◦━",
    "✦ ▬▰▬ ▬▰▬ ★✦★ ▬▰▬ ▬▰▬ ✦",
    "【☆】★【☆】★【☆】★【☆】★【☆】",
    "• ──────── ⌒⌒⌒ ︶︶︶",
    "★・・・・・・★・・・・・・★・・・・・・★",
  ],
  edgy_dark: [
    "ـــــــــــــــــــﮩ٨ـ",
    "✠ ——— ✠ ——— ✠ ——— ✠",
    "✠ ━━━〔 TEXT 〕━━━ ✠",
    "☠︎ ─────〔 TEXT 〕───── ☠︎",
    "⛧═════〔 TEXT 〕═════⛧",
    "༒──────〔 TEXT 〕──────༒",
    "⚔━━━━━〔 TEXT 〕━━━━━⚔",
    "⛧────────────⛧",
    "༒────────────༒",
    "⚔────────────⚔",
    "✞ ── STAFF ── ✞",
    "✞──────〔 TEXT 〕──────✞",
    "✞ ARCHIVIST ✞",
    "⛧═════〔 DENIED 〕═════⛧",
    ":۩:••:۩:••:۩:••:۩:••:۩:",
    "✠ ───── ✠ ───── ✠",
  ],
  soft_cute: [
    "⊹₊ ˚‧︵‿₊୨୧₊‿︵‧ ˚ ₊⊹",
    "────୨ৎ────",
    ". ݁₊ ⊹ . ݁ ⟡ ݁ . ⊹ ₊ ݁.",
    "°❀⋆.ೃ࿔*:･°❀⋆.ೃ࿔*:･",
    "✦•┈๑⋅⋯ ⋯⋅๑┈•✦",
    "﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉",
    "┈ ┈ ┈ ┈ ୨♡୧ ┈ ┈ ┈ ┈",
    "︶⊹︶︶୨୧︶︶⊹︶︶⊹︶︶୨୧︶︶⊹︶⊹︶︶",
    "︶⊹︶︶୨୧︶︶⊹︶",
    "꒰⁐⁐⁐⁐୨୧⁐⁐⁐⁐꒱",
    "‧˚₊•┈┈┈┈୨୧┈┈┈┈•‧₊˚⊹",
    "⏜︵⊹︵⏜︵୨୧︵⏜︵⊹︵⏜",
    "⏝︶⊹︶⏝︶୨୧︶⏝︶⊹︶⏝",
    "⊹₊ ˚‧︵‿₊୨ ᰔ ୧₊‿︵‧ ˚ ₊⊹",
    "୨୧┈┈┈┈┈┈┈┈┈┈┈┈୨୧",
    "୨୧・┈・୨୧・┈・୨୧",
    "•┈••✦☆✦••┈•",
    "───── ⋆⋅☆⋅⋆ ─────",
    "⊹˚₊‧───────────────‧₊˚⊹",
    "‿︵‿︵‿୨ ୧‿︵‿︵‿",
    "﹒˚ ₊ ︵﹒⊹ ๑ ︵︵ ๑ ⊹﹒︵",
    "•❅──────✧❅✦❅✧──────❅•",
    "╭──────༺♡༻──────╮",
    "╰──────༺♡༻──────╯",
    ".・。.・゜✭・.・✫・゜・。",
    "・・・・☆・・・・☆ ・・・・",
    "✿﹕ ︵︵✧₊︵︵ꕤ₊˚︵ ૮꒰˵• ᵜ •˵꒱ა ﹕ɞ",
    ". ◠ . ◠ . ◠ . ◠. ◠ . ◠ . ◠ . ◠. ◠ . ◠ . ◠ . ◠",
    "˚₊ ˚ ‧₊ .:･˚₊ ˚ ‧₊ .:･˚₊ *˚",
    "─ · ─ · ─ · ─ · ─ ◠ . ◠ . ◠ . ◠",
    "☆゜・。。・゜゜・。。・゜★",
    "°:. *₊ ° . ☆ °:. *₊ ° . ° .•",
    "₊✧˚﹕︶︶︶﹕૮₍ ⸝⸝´ ꒳ `⸝⸝ ₎ა﹕︶︶︶﹕ ˚✧₊",
    "━━━━━━ʕ•㉨•ʔ━━━━━━━",
    "(･ω･)つ ──────────── ⊂(･ω･)",
    "꒦ˎˊ˗ ︶︶︶︶︶︶︶︶︶︶︶︶︶︶ ꒦꒷꒦₊˚",
    "︵‿୨♡୧‿︵‿︵‿୨♡୧‿︵‿︵‿୨♡୧‿︵‿︵‿୨♡୧‿︵",
    ": ・ෆ・┈・┈・ᕱ⑅ᕱ・┈・┈・ෆ・ :",
    "˗ˏˋ ꒰ ♡ ꒱ ˎˊ˗",
    "✧༺✦✮✦༻∞　　∞༺✦✮✦༻✧",
    "❀❁❀☆◉✪◊˚* ˚◊✪◉☆❀❁❀*",
    "●∘◦❀◦∘●∘◦❀◦∘●∘◦❀◦∘●∘◦❀◦∘",
    "»»————-　♡　————-««",
    "୨୧ ━━━━━━━━━━━━━━ ୨୧",
    "•——————•°•✿•°•——————•",
    "☆════ ⋆★⋆ ════☆",
    "♡━━━━━━ ◦ ✤ ◦ ━━━━━━♡",
    "━━━━━━♡♥♡━━━━━━",
    "»» ──────ஓ๑♥๑ஓ ────── ««",
    "• • ┈┈┈┈ ๑ ⋅ ⋯ ୨ ୧ ⋯ ⋅ ๑ ┈┈┈┈ • •",
    "୨・┈・┈・୨ ୧・┈・┈・୧",
    "✧○ꊞ○ꊞ○•̩̩͙✩•̩̩͙○♡๑•୨୧┈┈┈୨୧•๑♡○•̩̩͙✩•̩̩͙ꊞ○ꊞ○✧",
    "～♥～～♡～～♥～～♡～～♥～*～",
    "୨﹒˖˚──﹕♡﹕──˚˖﹒୧",
    "♥♡♥♡♥♡♥♡♥♡♥♡♥",
    "≫≫∘❁♥❁∘≪≪",
    "✦•┈┈┈๑⋅⋯❁⋯⋅๑┈┈┈•✦",
    "✼ •• ┈┈┈┈๑⋅⋯ ୨˚୧ ⋯⋅๑┈┈┈┈ •• ✼",
    "✿————✦————✿",
    "୨୧・┈┈・┈┈・୨୧",
    "⑅୨୧⑅୨୧⑅୨୧⑅୨୧⑅୨୧",
    "╭──────♡──────╮",
    "╰──────♡──────╯",
    "╔═══════☆♡☆═══════╗",
    "╔════◈◉◈════╗",
    "╚════◈◉◈════╝",
    "╔═════ஓ๑♥๑ஓ═════╗",
    "╚═════ஓ๑♥๑ஓ═════╝",
    "──── ୨♡୧ ────",
    "• ───── ✾ ───── •",
    "♡────────♡",
    "❀────────❀",
  ],
  utility_minimal: [
    "______________ ׂׂૢ་༘࿐",
    "• • • • • •",
    "✦ ✦ ✦ ✦ ✦ ✦",
    "⭐ ⭐ ⭐ ⭐ ⭐",
    "<<< >>>",
    "--- • ---",
    "== text ==",
    "-- text --",
    "[ title ]",
    "<< text >>",
    "[OK]",
    "[!]",
    "[INFO]",
    "[LOCK]",
    "═════ ✦ ═════",
    "╶╶╶╶╶ ꩜ ╶╶╶╶╶",
    "⟡────────⟡",
    "✧────────✧",
    "☆════ ⋆★⋆ ════☆",
  ],
};

function normalizeSeed(seed: DecorativeStyleSeed) {
  return typeof seed === "string" ? { value: seed } : seed;
}

function titleCaseCategory(category: DecorativeStyleCategory) {
  return DECORATIVE_STYLE_CATEGORY_META[category].label.replace(" / ", " ");
}

function makeStyleItem(category: DecorativeStyleCategory, seed: DecorativeStyleSeed, index: number): DecorativeStyleItem {
  const normalized = normalizeSeed(seed);
  return {
    id: `decorative-${category}-${String(index + 1).padStart(2, "0")}`,
    label: normalized.label || `${titleCaseCategory(category)} ${String(index + 1).padStart(2, "0")}`,
    category,
    value: normalized.value,
    tags: Array.from(new Set([
      ...DECORATIVE_STYLE_CATEGORY_META[category].tags,
      ...(normalized.tags || []),
    ])),
    notes: normalized.notes,
  };
}

export const DECORATIVE_STYLE_LIBRARY: DecorativeStyleItem[] = DECORATIVE_STYLE_CATEGORY_ORDER.flatMap((category) =>
  DECORATIVE_STYLE_SEEDS[category].map((seed, index) => makeStyleItem(category, seed, index)),
);
