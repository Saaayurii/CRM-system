/**
 * Lightweight per-key circuit breaker (in-memory, no external deps).
 *
 * Protects the gateway from a single hung/dead downstream taking the whole
 * process down: after `failureThreshold` consecutive infra failures the circuit
 * for that key "opens" and subsequent calls are short-circuited (fail fast)
 * until `resetTimeoutMs` elapses, after which a single trial request is allowed
 * (half-open). A success closes the circuit; a failure re-opens it.
 *
 * Only infrastructure failures (network errors, timeouts, upstream 5xx) should
 * be recorded as failures — 4xx business responses must NOT trip the breaker.
 */
export type BreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive infra failures before the circuit opens. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing a half-open trial (ms). */
  resetTimeoutMs: number;
}

interface BreakerEntry {
  failures: number;
  state: BreakerState;
  openedAt: number;
}

export class CircuitBreaker {
  private readonly entries = new Map<string, BreakerEntry>();

  constructor(private readonly options: CircuitBreakerOptions) {}

  private entry(key: string): BreakerEntry {
    let e = this.entries.get(key);
    if (!e) {
      e = { failures: 0, state: 'closed', openedAt: 0 };
      this.entries.set(key, e);
    }
    return e;
  }

  /**
   * Returns true if a request may proceed. When the circuit is open but the
   * reset window has elapsed, it transitions to half-open and allows one trial.
   */
  canRequest(key: string): boolean {
    const e = this.entry(key);
    if (e.state === 'open') {
      if (Date.now() - e.openedAt >= this.options.resetTimeoutMs) {
        e.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // closed or half-open
  }

  recordSuccess(key: string): void {
    const e = this.entry(key);
    e.failures = 0;
    e.state = 'closed';
  }

  recordFailure(key: string): void {
    const e = this.entry(key);
    e.failures += 1;
    // A failed half-open trial, or crossing the threshold, opens the circuit.
    if (e.state === 'half-open' || e.failures >= this.options.failureThreshold) {
      e.state = 'open';
      e.openedAt = Date.now();
    }
  }

  getState(key: string): BreakerState {
    return this.entry(key).state;
  }
}
