import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronsUpDown, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDiscordContext } from "@/hooks/use-bot";
import { getChannelKindLabel, inferChannelKind, type GuildChannelKind } from "@/lib/discord-channels";

const DEFAULT_KINDS: GuildChannelKind[] = ["text", "announcement", "forum", "category", "voice", "stage"];

type ChannelOption = {
  id: string;
  name: string;
  kind: GuildChannelKind;
  label: string;
  keywords: string;
};

function useChannelOptions(serverId: number) {
  const query = useDiscordContext(serverId);

  const channels = useMemo<ChannelOption[]>(() => {
    const raw = query.data?.channels || [];
    return raw
      .filter((channel) => !channel.isThread)
      .map((channel) => {
        const kind = inferChannelKind(channel);
        return {
          id: channel.id,
          name: channel.name,
          kind,
          label: `#${channel.name}`,
          keywords: `${channel.name} ${kind} ${channel.id}`.toLowerCase(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data?.channels]);

  return {
    ...query,
    channels,
    channelById: Object.fromEntries(channels.map((channel) => [channel.id, channel])) as Record<string, ChannelOption>,
  };
}

interface BaseChannelPickerProps {
  serverId: number;
  label?: string;
  placeholder?: string;
  manualPlaceholder?: string;
  emptyMessage?: string;
  allowedKinds?: GuildChannelKind[];
  disabled?: boolean;
  className?: string;
  testIdPrefix?: string;
}

interface SingleChannelPickerProps extends BaseChannelPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function DiscordChannelPicker({
  serverId,
  value,
  onChange,
  label,
  placeholder = "Select channel...",
  manualPlaceholder = "Channel ID",
  emptyMessage = "No matching channels found.",
  allowedKinds = DEFAULT_KINDS,
  disabled,
  className,
  testIdPrefix = "channel-picker",
}: SingleChannelPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeKinds, setActiveKinds] = useState<GuildChannelKind[]>(allowedKinds);
  const { channels, channelById, refetch, isFetching } = useChannelOptions(serverId);

  const filteredChannels = useMemo(
    () => channels.filter((channel) => activeKinds.includes(channel.kind)),
    [activeKinds, channels]
  );
  const selected = channelById[value];
  const missing = Boolean(value) && !selected;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm">{label}</Label>}

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={disabled}
              className="w-full justify-between bg-background"
              data-testid={`${testIdPrefix}-select`}
            >
              <span className="truncate text-left">
                {selected ? `${selected.label} (${getChannelKindLabel(selected.kind)})` : value ? value : placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <div className="border-b border-white/5 p-2 flex flex-wrap gap-1.5">
              {allowedKinds.map((kind) => {
                const active = activeKinds.includes(kind);
                return (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setActiveKinds((prev) => {
                        if (active) return prev.filter((value) => value !== kind);
                        return [...prev, kind];
                      });
                    }}
                    data-testid={`${testIdPrefix}-filter-${kind}`}
                  >
                    {getChannelKindLabel(kind)}
                  </Button>
                );
              })}
            </div>
            <Command>
              <CommandInput placeholder="Search channels..." />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {filteredChannels.map((channel) => (
                    <CommandItem
                      key={channel.id}
                      value={`${channel.label} ${channel.id} ${channel.keywords}`}
                      onSelect={() => {
                        onChange(channel.id);
                        setOpen(false);
                      }}
                      data-testid={`${testIdPrefix}-option-${channel.id}`}
                    >
                      <Check className={cn("h-4 w-4", value === channel.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{channel.label}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {getChannelKindLabel(channel.kind)}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || isFetching}
          onClick={() => void refetch()}
          data-testid={`${testIdPrefix}-refresh`}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${manualPlaceholder} (fallback)`}
        disabled={disabled}
        className="bg-background"
        data-testid={`${testIdPrefix}-manual`}
      />

      {missing && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Channel no longer exists or is inaccessible: {value}
        </div>
      )}
    </div>
  );
}

interface MultiChannelPickerProps extends BaseChannelPickerProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function DiscordChannelListPicker({
  serverId,
  values,
  onChange,
  label,
  placeholder = "Add channel...",
  manualPlaceholder = "Channel ID",
  emptyMessage = "No additional channels available.",
  allowedKinds = DEFAULT_KINDS,
  disabled,
  className,
  testIdPrefix = "channel-list-picker",
}: MultiChannelPickerProps) {
  const [open, setOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [activeKinds, setActiveKinds] = useState<GuildChannelKind[]>(allowedKinds);
  const { channels, channelById, refetch, isFetching } = useChannelOptions(serverId);

  const addValue = (value: string) => {
    const next = value.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next]);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((entry) => entry !== value));
  };

  const available = channels
    .filter((channel) => activeKinds.includes(channel.kind))
    .filter((channel) => !values.includes(channel.id));

  const missing = values.filter((value) => !channelById[value]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm">{label}</Label>}

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={disabled}
              className="w-full justify-between bg-background"
              data-testid={`${testIdPrefix}-select`}
            >
              <span className="truncate text-left">{placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <div className="border-b border-white/5 p-2 flex flex-wrap gap-1.5">
              {allowedKinds.map((kind) => {
                const active = activeKinds.includes(kind);
                return (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setActiveKinds((prev) => {
                        if (active) return prev.filter((value) => value !== kind);
                        return [...prev, kind];
                      });
                    }}
                    data-testid={`${testIdPrefix}-filter-${kind}`}
                  >
                    {getChannelKindLabel(kind)}
                  </Button>
                );
              })}
            </div>
            <Command>
              <CommandInput placeholder="Search channels..." />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {available.map((channel) => (
                    <CommandItem
                      key={channel.id}
                      value={`${channel.label} ${channel.id} ${channel.keywords}`}
                      onSelect={() => {
                        addValue(channel.id);
                        setOpen(false);
                      }}
                      data-testid={`${testIdPrefix}-option-${channel.id}`}
                    >
                      <Plus className="h-4 w-4 opacity-80" />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{channel.label}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {getChannelKindLabel(channel.kind)}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || isFetching}
          onClick={() => void refetch()}
          data-testid={`${testIdPrefix}-refresh`}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addValue(manualValue);
              setManualValue("");
            }
          }}
          placeholder={`${manualPlaceholder} (fallback)`}
          disabled={disabled}
          className="bg-background"
          data-testid={`${testIdPrefix}-manual`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            addValue(manualValue);
            setManualValue("");
          }}
          disabled={disabled}
          data-testid={`${testIdPrefix}-manual-add`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const channel = channelById[value];
            return (
              <Badge key={value} variant="secondary" className="gap-1">
                <span className="max-w-[260px] truncate">
                  {channel ? `${channel.label} (${value})` : value}
                </span>
                <button type="button" onClick={() => removeValue(value)} data-testid={`${testIdPrefix}-remove-${value}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {missing.length} selected channel{missing.length === 1 ? "" : "s"} no longer exist or are inaccessible.
          </div>
          <div className="mt-1 font-mono">{missing.join(", ")}</div>
        </div>
      )}
    </div>
  );
}
