import { useMemo, useState, type RefObject } from "react";
import { Search, Sparkles } from "lucide-react";
import { getDiscordEmojiAssetUrl, parseDiscordEmojiToken } from "@shared/discord-emoji";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TextTarget = HTMLInputElement | HTMLTextAreaElement;
type InsertCategory = "emoji" | "recent" | "more";
type EmojiView = "unicode" | "server";

interface EmojiOption {
  value: string;
  label: string;
  keywords: string[];
}

interface FormatOption {
  label: string;
  prefix: string;
  suffix: string;
  placeholder?: string;
}

interface StudioInlineInsertMenuProps {
  value: string;
  onChange: (value: string) => void;
  targetRef: RefObject<TextTarget | null>;
  discordEmojis?: Array<{ id: string; name: string; animated?: boolean }>;
  recentKey?: string;
  className?: string;
}

const UNICODE_EMOJIS: EmojiOption[] = [
  { value: "😀", label: "Grinning", keywords: ["happy", "smile", "grin"] },
  { value: "😂", label: "Laughing", keywords: ["joy", "laugh", "funny"] },
  { value: "🥹", label: "Pleading", keywords: ["cute", "please", "soft"] },
  { value: "😎", label: "Cool", keywords: ["cool", "sunglasses"] },
  { value: "🤔", label: "Thinking", keywords: ["think", "hmm"] },
  { value: "🔥", label: "Fire", keywords: ["fire", "hot"] },
  { value: "✨", label: "Sparkles", keywords: ["sparkle", "magic"] },
  { value: "💥", label: "Impact", keywords: ["boom", "impact"] },
  { value: "🎉", label: "Party", keywords: ["party", "celebrate"] },
  { value: "📌", label: "Pin", keywords: ["pin", "note"] },
  { value: "⚠️", label: "Warning", keywords: ["warning", "alert"] },
  { value: "✅", label: "Check", keywords: ["check", "done", "yes"] },
  { value: "❌", label: "Cross", keywords: ["cross", "no", "remove"] },
  { value: "⭐", label: "Star", keywords: ["star", "favorite"] },
  { value: "🧠", label: "Brain", keywords: ["brain", "idea"] },
  { value: "🚀", label: "Rocket", keywords: ["rocket", "launch"] },
  { value: "👀", label: "Eyes", keywords: ["eyes", "look"] },
  { value: "💬", label: "Speech", keywords: ["chat", "message"] },
  { value: "🛠️", label: "Tools", keywords: ["tools", "build"] },
  { value: "🎯", label: "Target", keywords: ["target", "goal"] },
];

const DIVIDER_PRESETS = [
  "────────────",
  "════════════",
  "━━━━━━━━━━━━",
  "• • • • • •",
  "✦ ✦ ✦ ✦ ✦ ✦",
  "⭐ ⭐ ⭐ ⭐ ⭐",
  "<<< >>>",
  "─── • ───",
];

const BORDER_PRESETS = [
  "+--------------+\n|              |\n+--------------+",
  "/--------------\\\\\n|              |\n\\\\--------------/",
  "[ title ]\n[ body ]",
  "╔════════════╗\n║            ║\n╚════════════╝",
  "┌────────────┐\n│            │\n└────────────┘",
];

const ASCII_PRESETS = [
  "->",
  "=>",
  ">>",
  "[OK]",
  "[!]",
  "[INFO]",
  "[LOCK]",
  "<>------------<>",
  "== text ==",
  "-- text --",
];

const SNIPPET_PRESETS = [
  "> Quote block",
  "```txt\ncode block\n```",
  "**Headline**\nShort supporting line.",
  ">>> Multi-line spotlight",
  ":sparkles: Highlight line",
];

const FORMAT_PRESETS: FormatOption[] = [
  { label: "Bold", prefix: "**", suffix: "**", placeholder: "bold text" },
  { label: "Italic", prefix: "*", suffix: "*", placeholder: "italic text" },
  { label: "Underline", prefix: "__", suffix: "__", placeholder: "underlined text" },
  { label: "Strike", prefix: "~~", suffix: "~~", placeholder: "struck text" },
  { label: "Spoiler", prefix: "||", suffix: "||", placeholder: "spoiler" },
  { label: "Quote", prefix: "> ", suffix: "", placeholder: "quoted line" },
  { label: "Inline Code", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "Code Block", prefix: "```txt\n", suffix: "\n```", placeholder: "code block" },
];

function rememberInsert(key: string, value: string) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = [value, ...(Array.isArray(parsed) ? parsed.filter((entry) => entry !== value) : [])].slice(0, 24);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

function readRecent(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [] as string[];
  }
}

function withSelection(
  current: string,
  targetRef: RefObject<TextTarget | null>,
  onChange: (value: string) => void,
  nextValue: string,
  selectionStart: number,
  selectionEnd: number,
) {
  onChange(nextValue);
  requestAnimationFrame(() => {
    const target = targetRef.current;
    if (!target) return;
    target.focus();
    target.setSelectionRange(selectionStart, selectionEnd);
  });
}

function insertAtCursor(
  current: string,
  insertValue: string,
  targetRef: RefObject<TextTarget | null>,
  onChange: (value: string) => void,
) {
  const target = targetRef.current;
  if (!target) {
    onChange(`${current}${insertValue}`);
    return;
  }

  const start = target.selectionStart ?? current.length;
  const end = target.selectionEnd ?? current.length;
  const next = `${current.slice(0, start)}${insertValue}${current.slice(end)}`;
  const cursor = start + insertValue.length;
  withSelection(current, targetRef, onChange, next, cursor, cursor);
}

function wrapSelection(
  current: string,
  option: FormatOption,
  targetRef: RefObject<TextTarget | null>,
  onChange: (value: string) => void,
) {
  const target = targetRef.current;
  if (!target) {
    const filler = option.placeholder || "";
    onChange(`${current}${option.prefix}${filler}${option.suffix}`);
    return;
  }

  const start = target.selectionStart ?? current.length;
  const end = target.selectionEnd ?? current.length;
  const selected = current.slice(start, end);
  const middle = selected || option.placeholder || "";
  const next = `${current.slice(0, start)}${option.prefix}${middle}${option.suffix}${current.slice(end)}`;
  const selectionOffsetStart = start + option.prefix.length;
  const selectionOffsetEnd = selectionOffsetStart + middle.length;
  withSelection(current, targetRef, onChange, next, selectionOffsetStart, selectionOffsetEnd);
}

export function StudioInlineInsertMenu({
  value,
  onChange,
  targetRef,
  discordEmojis = [],
  recentKey = "archivist.studio.insert-recents",
  className,
}: StudioInlineInsertMenuProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<InsertCategory>("emoji");
  const [emojiView, setEmojiView] = useState<EmojiView>("unicode");
  const [emojiQuery, setEmojiQuery] = useState("");
  const recentItems = useMemo(() => readRecent(recentKey), [open, recentKey]);

  const filteredUnicodeEmoji = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase();
    if (!query) return UNICODE_EMOJIS;
    return UNICODE_EMOJIS.filter((emoji) =>
      emoji.label.toLowerCase().includes(query) ||
      emoji.keywords.some((keyword) => keyword.includes(query)) ||
      emoji.value.includes(query),
    );
  }, [emojiQuery]);

  const filteredCustomEmoji = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase();
    if (!query) return discordEmojis;
    return discordEmojis.filter((emoji) => emoji.name.toLowerCase().includes(query));
  }, [discordEmojis, emojiQuery]);

  const handleInsert = (insertValue: string) => {
    insertAtCursor(value, insertValue, targetRef, onChange);
    rememberInsert(recentKey, insertValue);
  };

  const handleFormat = (option: FormatOption) => {
    wrapSelection(value, option, targetRef, onChange);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1 rounded-full border-white/12 bg-white/[0.04] px-3 text-[#d7dce2] hover:bg-white/[0.08] hover:text-white", className)}>
          <Sparkles className="h-3.5 w-3.5" />
          Insert
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="w-[min(92vw,430px)] rounded-[22px] border-white/10 bg-[#0d0f12]/98 p-3 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {([
            ["emoji", "Emoji"],
            ["recent", "Recent"],
            ["more", "More"],
          ] as Array<[InsertCategory, string]>).map(([valueKey, label]) => (
            <button
              key={valueKey}
              type="button"
              onClick={() => setCategory(valueKey)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition",
                category === valueKey
                  ? "border-[#8b2835] bg-[#1b0f13] text-white"
                  : "border-white/10 bg-white/[0.03] text-white/62 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {category === "emoji" ? (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" />
              <Input
                value={emojiQuery}
                onChange={(event) => setEmojiQuery(event.target.value)}
                placeholder="Search emoji"
                className="border-white/10 bg-white/[0.04] pl-9 text-white placeholder:text-white/32"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["unicode", "Unicode"],
                ["server", "Server"],
              ] as Array<[EmojiView, string]>).map(([valueKey, label]) => (
                <button
                  key={valueKey}
                  type="button"
                  onClick={() => setEmojiView(valueKey)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition",
                    emojiView === valueKey
                      ? "border-[#8b2835] bg-[#1b0f13] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/62 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {emojiView === "unicode" ? (
              <div className="grid max-h-[248px] grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-7">
                {filteredUnicodeEmoji.map((emoji) => (
                  <button
                    key={emoji.value}
                    type="button"
                    onClick={() => handleInsert(emoji.value)}
                    className="flex min-h-[58px] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] px-2 py-2 text-center transition hover:border-white/20 hover:bg-white/[0.08]"
                    title={emoji.label}
                  >
                    <span className="text-xl">{emoji.value}</span>
                    <span className="mt-1 text-[10px] text-white/46">{emoji.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid max-h-[248px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {filteredCustomEmoji.length === 0 ? (
                  <p className="col-span-full text-xs text-white/40">No server emoji match the current search.</p>
                ) : (
                  filteredCustomEmoji.map((emoji) => {
                    const token = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
                    const parsedEmoji = parseDiscordEmojiToken(token);
                    const assetUrl = parsedEmoji ? getDiscordEmojiAssetUrl(parsedEmoji, 64) : null;
                    return (
                      <button
                        key={emoji.id}
                        type="button"
                        onClick={() => handleInsert(token)}
                        className="flex min-h-[68px] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] px-2 py-2 text-center transition hover:border-white/20 hover:bg-white/[0.08]"
                        title={emoji.name}
                      >
                        {assetUrl ? (
                          <img
                            src={assetUrl}
                            alt={emoji.name}
                            className="h-7 w-7 rounded-sm object-contain"
                          />
                        ) : (
                          <span className="text-base">{token}</span>
                        )}
                        <span className="mt-1 max-w-full truncate text-[10px] text-white/52">{emoji.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : null}

        {category === "recent" ? (
          <div className="mt-3 flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
            {recentItems.length === 0 ? (
              <p className="text-xs text-white/40">Recent inserts will show up here.</p>
            ) : (
              recentItems.map((item, index) => (
                <button
                  key={`recent-${index}`}
                  type="button"
                  onClick={() => handleInsert(item)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <pre className="whitespace-pre-wrap font-mono text-[11px]">{item}</pre>
                </button>
              ))
            )}
          </div>
        ) : null}

        {category === "more" ? (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Format</p>
              <div className="flex flex-wrap gap-2">
                {FORMAT_PRESETS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleFormat(option)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Dividers</p>
              <div className="flex max-h-[112px] flex-wrap gap-2 overflow-y-auto pr-1">
                {DIVIDER_PRESETS.map((preset, index) => (
                  <button
                    key={`divider-${index}`}
                    type="button"
                    onClick={() => handleInsert(preset)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Borders & snippets</p>
              <div className="grid max-h-[168px] gap-2 overflow-y-auto pr-1">
                {BORDER_PRESETS.concat(SNIPPET_PRESETS).map((preset, index) => (
                  <button
                    key={`more-${index}`}
                    type="button"
                    onClick={() => handleInsert(preset)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <pre className="whitespace-pre-wrap font-mono text-[11px]">{preset}</pre>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">ASCII / symbols</p>
              <div className="flex max-h-[112px] flex-wrap gap-2 overflow-y-auto pr-1">
                {ASCII_PRESETS.map((preset, index) => (
                  <button
                    key={`ascii-${index}`}
                    type="button"
                    onClick={() => handleInsert(preset)}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
