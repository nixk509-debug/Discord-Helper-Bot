import { useMemo, useState, type RefObject } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SYMBOL_LIBRARY: Record<string, string[]> = {
  borders: [
    "+--------------+\n|              |\n+--------------+",
    "/--------------\\\n|              |\n\\--------------/",
    "[ text ]",
    "<< text >>",
    "== text ==",
    "-- text --",
  ],
  dividers: [
    "--------------",
    "==============",
    "~~~~~~~~~~~~~~",
    "* * * * * * * *",
    "<>------------<>",
    "+=+=+=+=+=+=+=",
  ],
  status: [
    "[OK]",
    "[X]",
    "[!]",
    "[i]",
    "[LOCK]",
    "[UNLOCK]",
    "[PIN]",
    "[NOTE]",
    "[WARN]",
    "[INFO]",
  ],
  arrows: [
    "->",
    "<-",
    "=>",
    "<=",
    "-->",
    "<--",
    "<->",
    "^",
    "v",
    ">>",
  ],
};

function insertAtCursor(
  current: string,
  insertValue: string,
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>,
  onChange: (next: string) => void
) {
  const element = inputRef.current;
  if (!element) {
    onChange(`${current}${insertValue}`);
    return;
  }

  const start = element.selectionStart ?? current.length;
  const end = element.selectionEnd ?? current.length;
  const next = `${current.slice(0, start)}${insertValue}${current.slice(end)}`;
  onChange(next);

  requestAnimationFrame(() => {
    element.focus();
    const nextCursor = start + insertValue.length;
    element.setSelectionRange(nextCursor, nextCursor);
  });
}

interface SymbolInsertMenuProps {
  value: string;
  onChange: (value: string) => void;
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  recentKey?: string;
  buttonLabel?: string;
  testIdPrefix?: string;
}

export function SymbolInsertMenu({
  value,
  onChange,
  targetRef,
  recentKey = "archivist.recentSymbols",
  buttonLabel = "Symbols",
  testIdPrefix = "symbol-menu",
}: SymbolInsertMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recent");

  const recentSymbols = useMemo(() => {
    try {
      const raw = localStorage.getItem(recentKey);
      if (!raw) return [] as string[];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [] as string[];
    }
  }, [open, recentKey]);

  const rememberSymbol = (symbol: string) => {
    try {
      const next = [symbol, ...recentSymbols.filter((item) => item !== symbol)].slice(0, 16);
      localStorage.setItem(recentKey, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  const handleInsert = (symbol: string) => {
    insertAtCursor(value, symbol, targetRef, onChange);
    rememberSymbol(symbol);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1" data-testid={`${testIdPrefix}-trigger`}>
          <Sparkles className="w-3.5 h-3.5" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-3" align="end">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-3">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="borders">Borders</TabsTrigger>
            <TabsTrigger value="dividers">Dividers</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="arrows">Arrows</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-0">
            <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto">
              {recentSymbols.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent symbols yet.</p>
              ) : (
                recentSymbols.map((symbol, index) => (
                  <Button
                    key={`${symbol}-${index}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto py-1.5 whitespace-pre-wrap text-left"
                    onClick={() => handleInsert(symbol)}
                    data-testid={`${testIdPrefix}-recent-${index}`}
                  >
                    {symbol}
                  </Button>
                ))
              )}
            </div>
          </TabsContent>

          {Object.entries(SYMBOL_LIBRARY).map(([category, symbols]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto">
                {symbols.map((symbol, index) => (
                  <Button
                    key={`${category}-${index}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto py-1.5 whitespace-pre-wrap text-left"
                    onClick={() => handleInsert(symbol)}
                    data-testid={`${testIdPrefix}-${category}-${index}`}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
