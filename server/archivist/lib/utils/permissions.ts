import { PermissionsBitField } from "discord.js";

type PermissionKey = keyof typeof PermissionsBitField.Flags;

const permissionEntries = Object.entries(PermissionsBitField.Flags) as [PermissionKey, bigint][];

function normalizePermissionToken(value: string) {
  return value.replace(/[\s_-]+/g, "").toUpperCase();
}

const permissionLookup = new Map<string, { name: PermissionKey; bit: bigint }>(
  permissionEntries.flatMap(([name, bit]) => [[normalizePermissionToken(name), { name, bit }]]),
);

export function parsePermissionList(input?: string | null) {
  if (!input?.trim()) {
    return {
      names: [] as PermissionKey[],
      invalid: [] as string[],
      bitfield: new PermissionsBitField(),
    };
  }

  const names: PermissionKey[] = [];
  const invalid: string[] = [];
  const bits: bigint[] = [];

  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const resolved = permissionLookup.get(normalizePermissionToken(trimmed));
    if (!resolved) {
      invalid.push(trimmed);
      continue;
    }
    names.push(resolved.name);
    bits.push(resolved.bit);
  }

  return {
    names,
    invalid,
    bitfield: new PermissionsBitField(bits),
  };
}

export function formatPermissionList(input: bigint | PermissionsBitField | string[] | readonly string[]) {
  if (Array.isArray(input)) {
    return input.map((name) => formatPermissionName(name)).join(", ");
  }

  const bitfield = input instanceof PermissionsBitField
    ? input
    : new PermissionsBitField(input as bigint);
  return bitfield.toArray().map((name) => formatPermissionName(name)).join(", ");
}

export function formatPermissionName(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
