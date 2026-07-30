/**
 * Structured logging contract, owned by the application layer.
 *
 * The application decides what a log entry means; infrastructure decides where
 * it goes and how it is redacted. No transport type appears in this file.
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Fields attached to a log entry.
 *
 * `unknown` rather than a loose `any`: a caller may pass whatever context it
 * has, and the implementation is responsible for rendering it safely.
 */
export type LogContext = Record<string, unknown>;

export interface Logger {
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}
