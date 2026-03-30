import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { Check, Copy, Search, Sparkles } from "lucide-react";
import { getDiscordEmojiAssetUrl, parseDiscordEmojiToken } from "@shared/discord-emoji";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DECORATIVE_STYLE_CATEGORY_META,
  DECORATIVE_STYLE_CATEGORY_ORDER,
  DECORATIVE_STYLE_LIBRARY,
  type DecorativeStyleCategory,
  type DecorativeStyleItem,
} from "@/components/design-studio/studio-decorative-style-pack";

export type TextTarget = HTMLInputElement | HTMLTextAreaElement;

type InsertCategory = "decorative" | "styles" | "emoji" | "ascii" | "fonts" | "recent";
type DecorativeFilter = "all" | DecorativeStyleCategory;
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

interface DiscordEmojiOption {
  id: string;
  name: string;
  animated?: boolean;
}

interface StudioInlineInsertMenuProps {
  value: string;
  onChange: (value: string) => void;
  targetRef: RefObject<TextTarget | null>;
  discordEmojis?: DiscordEmojiOption[];
  recentKey?: string;
  className?: string;
}

interface StudioInlineInsertPanelProps extends StudioInlineInsertMenuProps {
  targetLabel?: string;
  bodyClassName?: string;
}

interface MessageToolsDockProps extends StudioInlineInsertMenuProps {
  title?: string;
  description?: string;
  targetLabel?: string;
}

const CATEGORY_LABELS: Record<InsertCategory, string> = {
  decorative: "Decor Pack",
  styles: "Discord Styles",
  emoji: "Emoji",
  ascii: "ASCII",
  fonts: "Fonts",
  recent: "Recent",
};

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

const FONT_PRESETS = [
  "𝐇𝐄𝐀𝐃𝐋𝐈𝐍𝐄",
  "𝘚𝘶𝘣𝘵𝘭𝘦 𝘳𝘰𝘰𝘮",
  "𝖈𝖍𝖆𝖕𝖙𝖊𝖗 𝖗𝖔𝖔𝖒",
  "ｆｕｌｌｗｉｄｔｈ",
  "ᴛɪɴʏ ᴄᴀᴘs",
  "S P A C E D  O U T",
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
  withSelection(targetRef, onChange, next, cursor, cursor);
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
  withSelection(targetRef, onChange, next, selectionOffsetStart, selectionOffsetEnd);
}

function matchesDecorativeQuery(item: DecorativeStyleItem, query: string) {
  if (!query) return true;
  const haystack = [
    item.label,
    item.value,
    item.notes || "",
    ...item.tags,
    DECORATIVE_STYLE_CATEGORY_META[item.category].label,
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

async function copyStyleValue(value: string) {
  if (!navigator?.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CategoryButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition",
        active
          ? "border-[#8b2835] bg-[#1b0f13] text-white"
          : "border-white/10 bg-white/[0.03] text-white/62 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function PresetButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-white/82 transition hover:border-white/20 hover:bg-white/[0.08]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function DecorativeStyleCard({
  item,
  targetLabel,
  copied,
  onInsert,
  onCopy,
}: {
  item: DecorativeStyleItem;
  targetLabel?: string;
  copied: boolean;
  onInsert: () => void;
  onCopy: () => void;
}) {
  const categoryMeta = DECORATIVE_STYLE_CATEGORY_META[item.category];

  return (
    <article className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(9,11,15,0.86))] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">{categoryMeta.label}</p>
          <h4 className="mt-1 text-sm font-semibold text-white">{item.label}</h4>
          {item.notes ? <p className="mt-1 text-xs leading-5 text-white/52">{item.notes}</p> : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          onClick={onCopy}
          aria-label={`Copy ${item.label}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <button
        type="button"
        onClick={onInsert}
        className="mt-3 w-full rounded-[18px] border border-white/10 bg-[#0b0d10] p-3 text-left transition hover:border-white/20 hover:bg-[#11141a]"
      >
        <pre className="overflow-hidden whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-white/88">
          {item.value}
        </pre>
      </button>

      <div className="mt-3 flex flex-wrap gap-1">
        {item.tags.slice(0, 4).map((tag) => (
          <span
            key={`${item.id}-${tag}`}
            className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/42"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/38">
        <span className="leading-4">{targetLabel ? `Tap preview to insert into ${targetLabel}.` : "Tap preview to insert at the cursor."}</span>
        <span className={cn("shrink-0 uppercase tracking-[0.18em]", copied ? "text-emerald-300" : "text-white/28")}>
          {copied ? "Copied" : "Copy Ready"}
        </span>
      </div>
    </article>
  );
}

function StudioInlineInsertBody({
  value,
  onChange,
  targetRef,
  discordEmojis = [],
  recentKey = "archivist.studio.insert-recents",
  targetLabel,
  bodyClassName,
}: StudioInlineInsertPanelProps) {
  const [category, setCategory] = useState<InsertCategory>("decorative");
  const [emojiView, setEmojiView] = useState<EmojiView>("unicode");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [decorativeQuery, setDecorativeQuery] = useState("");
  const [decorativeFilter, setDecorativeFilter] = useState<DecorativeFilter>("all");
  const [insertVersion, setInsertVersion] = useState(0);
  const [copiedStyleId, setCopiedStyleId] = useState<string | null>(null);

  const recentItems = useMemo(() => readRecent(recentKey), [insertVersion, recentKey]);

  const filteredUnicodeEmoji = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase();
    if (!query) return UNICODE_EMOJIS;
    return UNICODE_EMOJIS.filter((emoji) =>
      emoji.label.toLowerCase().includes(query)
      || emoji.keywords.some((keyword) => keyword.includes(query))
      || emoji.value.includes(query),
    );
  }, [emojiQuery]);

  const filteredCustomEmoji = useMemo(() => {
    const query = emojiQuery.trim().toLowerCase();
    if (!query) return discordEmojis;
    return discordEmojis.filter((emoji) => emoji.name.toLowerCase().includes(query));
  }, [discordEmojis, emojiQuery]);

  const filteredDecorativeStyles = useMemo(() => {
    const query = decorativeQuery.trim().toLowerCase();
    return DECORATIVE_STYLE_LIBRARY.filter((item) => {
      if (decorativeFilter !== "all" && item.category !== decorativeFilter) return false;
      return matchesDecorativeQuery(item, query);
    });
  }, [decorativeFilter, decorativeQuery]);

  const decorativeGroups = useMemo(() => {
    if (decorativeFilter !== "all") {
      return [{
        category: decorativeFilter,
        items: filteredDecorativeStyles,
      }];
    }

    return DECORATIVE_STYLE_CATEGORY_ORDER
      .map((nextCategory) => ({
        category: nextCategory,
        items: filteredDecorativeStyles.filter((item) => item.category === nextCategory),
      }))
      .filter((group) => group.items.length > 0);
  }, [decorativeFilter, filteredDecorativeStyles]);

  const handleInsert = (insertValue: string) => {
    insertAtCursor(value, insertValue, targetRef, onChange);
    rememberInsert(recentKey, insertValue);
    setInsertVersion((current) => current + 1);
  };

  const handleFormat = (option: FormatOption) => {
    wrapSelection(value, option, targetRef, onChange);
  };

  const handleCopy = async (item: DecorativeStyleItem) => {
    const success = await copyStyleValue(item.value);
    if (!success) return;
    rememberInsert(recentKey, item.value);
    setInsertVersion((current) => current + 1);
    setCopiedStyleId(item.id);
    window.setTimeout(() => {
      setCopiedStyleId((current) => (current === item.id ? null : current));
    }, 1600);
  };

  return (
    <div className={cn("space-y-3", bodyClassName)}>
      {targetLabel ? (
        <div className="rounded-[18px] border border-white/8 bg-[#0b0d11] px-3 py-2 text-xs text-white/58">
          Inserting into <span className="font-semibold text-white">{targetLabel}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_LABELS) as InsertCategory[]).map((valueKey) => (
          <CategoryButton
            key={valueKey}
            active={category === valueKey}
            label={CATEGORY_LABELS[valueKey]}
            onClick={() => setCategory(valueKey)}
          />
        ))}
      </div>

      {category === "decorative" ? (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,12,16,0.9))] p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Archivist Decorative Library</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Mega border, text, and divider pack</h3>
                <p className="text-xs leading-5 text-white/48">
                  Browse by mood, tap the preview to insert, or copy a style when you want to reuse it elsewhere.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/54">
                {filteredDecorativeStyles.length} styles
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" />
            <Input
              value={decorativeQuery}
              onChange={(event) => setDecorativeQuery(event.target.value)}
              placeholder="Search headers, borders, cute lines, dark dividers..."
              className="border-white/10 bg-white/[0.04] pl-9 text-white placeholder:text-white/32"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <CategoryButton
              active={decorativeFilter === "all"}
              label="All Packs"
              onClick={() => setDecorativeFilter("all")}
            />
            {DECORATIVE_STYLE_CATEGORY_ORDER.map((nextCategory) => (
              <CategoryButton
                key={nextCategory}
                active={decorativeFilter === nextCategory}
                label={DECORATIVE_STYLE_CATEGORY_META[nextCategory].label}
                onClick={() => setDecorativeFilter(nextCategory)}
              />
            ))}
          </div>

          <div className="max-h-[430px] overflow-y-auto pr-1">
            {decorativeGroups.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                <p className="text-sm text-white/70">No styles match that search yet.</p>
                <p className="mt-1 text-xs text-white/40">Try a broader keyword like header, cute, dark, or minimal.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {decorativeGroups.map((group) => (
                  <section key={group.category} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                          {DECORATIVE_STYLE_CATEGORY_META[group.category].label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/44">
                          {DECORATIVE_STYLE_CATEGORY_META[group.category].description}
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/46">
                        {group.items.length} options
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <DecorativeStyleCard
                          key={item.id}
                          item={item}
                          targetLabel={targetLabel}
                          copied={copiedStyleId === item.id}
                          onInsert={() => handleInsert(item.value)}
                          onCopy={() => {
                            void handleCopy(item);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {category === "emoji" ? (
        <div className="space-y-3">
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
              <CategoryButton
                key={valueKey}
                active={emojiView === valueKey}
                label={label}
                onClick={() => setEmojiView(valueKey)}
              />
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
                        <img src={assetUrl} alt={emoji.name} className="h-7 w-7 rounded-sm object-contain" />
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

      {category === "styles" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Discord messaging styles</p>
            <div className="flex flex-wrap gap-2">
              {FORMAT_PRESETS.map((option) => (
                <PresetButton key={option.label} onClick={() => handleFormat(option)}>
                  {option.label}
                </PresetButton>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/34">Ready-made snippets</p>
            <div className="grid max-h-[168px] gap-2 overflow-y-auto pr-1">
              {SNIPPET_PRESETS.map((preset, index) => (
                <PresetButton key={`snippet-${index}`} onClick={() => handleInsert(preset)}>
                  <pre className="whitespace-pre-wrap font-mono text-[11px]">{preset}</pre>
                </PresetButton>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {category === "ascii" ? (
        <div className="flex max-h-[112px] flex-wrap gap-2 overflow-y-auto pr-1">
          {ASCII_PRESETS.map((preset, index) => (
            <PresetButton key={`ascii-${index}`} onClick={() => handleInsert(preset)}>
              {preset}
            </PresetButton>
          ))}
        </div>
      ) : null}

      {category === "fonts" ? (
        <div className="grid max-h-[168px] gap-2 overflow-y-auto pr-1">
          {FONT_PRESETS.map((preset, index) => (
            <PresetButton key={`font-${index}`} onClick={() => handleInsert(preset)}>
              <span className="block whitespace-pre-wrap">{preset}</span>
            </PresetButton>
          ))}
        </div>
      ) : null}

      {category === "recent" ? (
        <div className="flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
          {recentItems.length === 0 ? (
            <p className="text-xs text-white/40">Recent inserts and copied styles will show up here.</p>
          ) : (
            recentItems.map((item, index) => (
              <PresetButton key={`recent-${index}`} onClick={() => handleInsert(item)}>
                <pre className="whitespace-pre-wrap font-mono text-[11px]">{item}</pre>
              </PresetButton>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StudioInlineInsertPanel({ bodyClassName, ...props }: StudioInlineInsertPanelProps) {
  return <StudioInlineInsertBody {...props} bodyClassName={bodyClassName} />;
}

export function MessageToolsDock({
  value,
  onChange,
  targetRef,
  discordEmojis = [],
  recentKey = "archivist.studio.insert-recents",
  title = "Message Tools",
  description = "Browse decorative packs, Discord formatting, emoji, headers, borders, and quick text helpers without leaving the editor.",
  targetLabel,
  className,
}: MessageToolsDockProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-between rounded-[18px] border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
          onClick={() => setOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Message Tools
          </span>
          <span className="truncate text-xs text-white/52">{targetLabel || "Selected field"}</span>
        </Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[88vh] border-white/10 bg-[#090b0f] text-white">
            <DrawerHeader className="border-b border-white/8">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 pt-4">
              <StudioInlineInsertPanel
                value={value}
                onChange={onChange}
                targetRef={targetRef}
                discordEmojis={discordEmojis}
                recentKey={recentKey}
                targetLabel={targetLabel}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <aside className={cn("rounded-[24px] border border-white/8 bg-[#101318] p-4", className)}>
      <div className="space-y-2 border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[rgba(255,74,102,0.2)] bg-[rgba(177,18,38,0.16)] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-xs leading-5 text-white/48">{description}</p>
          </div>
        </div>
      </div>
      <StudioInlineInsertPanel
        value={value}
        onChange={onChange}
        targetRef={targetRef}
        discordEmojis={discordEmojis}
        recentKey={recentKey}
        targetLabel={targetLabel}
        bodyClassName="mt-4"
      />
    </aside>
  );
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1 rounded-full border-white/12 bg-white/[0.04] px-3 text-[#d7dce2] hover:bg-white/[0.08] hover:text-white", className)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Insert
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="w-[min(92vw,430px)] rounded-[22px] border-white/10 bg-[#0d0f12]/98 p-3 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <StudioInlineInsertPanel
          value={value}
          onChange={onChange}
          targetRef={targetRef}
          discordEmojis={discordEmojis}
          recentKey={recentKey}
        />
      </PopoverContent>
    </Popover>
  );
}
