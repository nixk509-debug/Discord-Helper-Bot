import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface DiscordEntityOption {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
}

interface DiscordEntityPickerProps {
  value: string;
  onChange: (value: string) => void;
  options?: DiscordEntityOption[];
  label?: string;
  placeholder?: string;
  manualPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  testIdPrefix?: string;
}

export function DiscordEntityPicker({
  value,
  onChange,
  options = [],
  label,
  placeholder = "Select option...",
  manualPlaceholder = "Enter ID manually",
  emptyMessage = "No server context options found.",
  disabled,
  className,
  testIdPrefix = "entity-picker",
}: DiscordEntityPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.id === value), [options, value]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm">{label}</Label>}

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
              {selected ? `${selected.label} (${selected.id})` : value ? value : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.label} ${option.id} ${option.keywords || ""}`.trim()}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    data-testid={`${testIdPrefix}-option-${option.id}`}
                  >
                    <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p className="truncate">{option.label}</p>
                      {option.description && <p className="text-xs text-muted-foreground truncate">{option.description}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${manualPlaceholder} (fallback)`}
        disabled={disabled}
        className="bg-background"
        data-testid={`${testIdPrefix}-manual`}
      />
    </div>
  );
}

interface DiscordEntityListPickerProps {
  values: string[];
  onChange: (values: string[]) => void;
  options?: DiscordEntityOption[];
  label?: string;
  placeholder?: string;
  manualPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  testIdPrefix?: string;
}

export function DiscordEntityListPicker({
  values,
  onChange,
  options = [],
  label,
  placeholder = "Add option...",
  manualPlaceholder = "Enter ID manually",
  emptyMessage = "No additional options available.",
  disabled,
  className,
  testIdPrefix = "entity-list-picker",
}: DiscordEntityListPickerProps) {
  const [open, setOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.label])),
    [options]
  );

  const availableOptions = useMemo(
    () => options.filter((option) => !values.includes(option.id)),
    [options, values]
  );

  const addValue = (raw: string) => {
    const nextValue = raw.trim();
    if (!nextValue || values.includes(nextValue)) return;
    onChange([...values, nextValue]);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm">{label}</Label>}

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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.label} ${option.id} ${option.keywords || ""}`.trim()}
                    onSelect={() => {
                      addValue(option.id);
                      setOpen(false);
                    }}
                    data-testid={`${testIdPrefix}-option-${option.id}`}
                  >
                    <Plus className="h-4 w-4 opacity-80" />
                    <div className="min-w-0">
                      <p className="truncate">{option.label}</p>
                      {option.description && <p className="text-xs text-muted-foreground truncate">{option.description}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              <span className="max-w-[240px] truncate">
                {labelById[value] ? `${labelById[value]} (${value})` : value}
              </span>
              <button type="button" onClick={() => removeValue(value)} data-testid={`${testIdPrefix}-remove-${value}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
