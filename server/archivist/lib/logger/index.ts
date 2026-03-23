type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class ArchivistLogger {
  constructor(
    private readonly scope = "archivist",
    private readonly level: LogLevel = "info",
  ) {}

  child(scope: string) {
    return new ArchivistLogger(`${this.scope}:${scope}`, this.level);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.emit("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.emit("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.emit("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.emit("error", message, data);
  }

  private emit(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LOG_ORDER[level] < LOG_ORDER[this.level]) return;
    const line = [
      new Date().toISOString(),
      `[${level.toUpperCase()}]`,
      `[${this.scope}]`,
      message,
      data ? JSON.stringify(data) : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}
