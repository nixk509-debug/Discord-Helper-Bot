export function isConfirmationMatch(input: string | null | undefined, token = "DELETE") {
  return (input || "").trim().toUpperCase() === token.toUpperCase();
}

export function truncateText(value: string, length = 140) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}...`;
}
