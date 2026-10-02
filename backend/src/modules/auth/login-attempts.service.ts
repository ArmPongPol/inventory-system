import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Window {
  failures: number;
  resetAt: number;
}

export const TOO_MANY_ATTEMPTS =
  'Too many failed login attempts for this account. Please try again later.';

// Bounds memory if someone sprays random identifiers.
const MAX_TRACKED = 100_000;

/**
 * Per-account brute-force protection: after LOGIN_MAX_FAILURES wrong passwords
 * for a key within LOGIN_FAILURE_WINDOW_SECONDS, further attempts get 429
 * until the window ends — checked before argon2 runs, so a locked account
 * costs no hashing. AuthService keys it by account (user id), or by the
 * identifier when no account matches, never by IP, so users sharing one NAT
 * address don't lock each other out.
 *
 * In-process: with N cluster workers an attacker gets at most N× the budget,
 * which still bounds guessing to a handful of tries per minute per account.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly windows = new Map<string, Window>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor(config: ConfigService) {
    this.maxFailures = config.get<number>('jwt.loginMaxFailures') ?? 5;
    this.windowMs =
      (config.get<number>('jwt.loginFailureWindowSeconds') ?? 900) * 1000;
  }

  private now() {
    return Date.now();
  }

  private key(key: string) {
    return key.trim().toLowerCase();
  }

  /** Throws 429 while the account is locked. */
  assertAllowed(key: string): void {
    if (this.maxFailures <= 0) return;
    const window = this.windows.get(this.key(key));
    if (!window) return;
    if (window.resetAt <= this.now()) {
      this.windows.delete(this.key(key));
      return;
    }
    if (window.failures >= this.maxFailures) {
      throw new HttpException(TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(rawKey: string): void {
    if (this.maxFailures <= 0) return;
    const key = this.key(rawKey);
    const now = this.now();
    const window = this.windows.get(key);
    if (window && window.resetAt > now) {
      window.failures++;
      return;
    }
    if (this.windows.size >= MAX_TRACKED) this.prune(now);
    this.windows.set(key, { failures: 1, resetAt: now + this.windowMs });
  }

  recordSuccess(key: string): void {
    this.windows.delete(this.key(key));
  }

  private prune(now: number) {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
    // Still full: drop the oldest entries (Map keeps insertion order).
    for (const key of this.windows.keys()) {
      if (this.windows.size < MAX_TRACKED) break;
      this.windows.delete(key);
    }
  }
}
