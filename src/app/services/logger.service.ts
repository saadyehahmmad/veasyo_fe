import { Injectable } from '@angular/core';

/**
 * Log levels matching Winston's log levels
 * Lower numbers have higher priority
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Logger service that provides Winston-like logging functionality
 * Works in browser environment with configurable log levels
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  // Current log level - only messages at or below this level will be logged
  private _currentLevel: LogLevel = LogLevel.DEBUG;

  /**
   * Set the minimum log level
   * Only messages at or below this level will be logged
   */
  setLevel(level: LogLevel): void {
    this._currentLevel = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this._currentLevel;
  }

  /**
   * Log error messages
   * Use for errors that need immediate attention
   */
  error(message: string, ...meta: unknown[]): void {
    if (this._currentLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  }

  /**
   * Log warning messages
   * Use for warnings that should be noticed but aren't critical
   */
  warn(message: string, ...meta: unknown[]): void {
    if (this._currentLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  }

  /**
   * Log informational messages
   * Use for general information about application flow
   */
  info(message: string, ...meta: unknown[]): void {
    if (this._currentLevel >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...meta);
    }
  }

  /**
   * Log debug messages
   * Use for detailed debugging information
   */
  debug(message: string, ...meta: unknown[]): void {
    if (this._currentLevel >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...meta);
    }
  }

  /**
   * Log messages (alias for info)
   * Provides compatibility with console.log usage
   */
  log(message: string, ...meta: unknown[]): void {
    this.info(message, ...meta);
  }
}

