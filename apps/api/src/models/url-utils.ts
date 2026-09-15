/**
 * Remove trailing `/` characters from a URL/endpoint string.
 *
 * Implemented as a plain character scan (not a `/+$/`-style regex) because a
 * regex quantifier anchored at the end can be driven into quadratic
 * backtracking on adversarial, attacker-controlled input (e.g. long runs of
 * `/` that don't reach the end of the string), which is a polynomial ReDoS
 * risk when this input comes from a user-configurable endpoint.
 */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47 /* '/' */) {
    end -= 1;
  }
  return value.slice(0, end);
}
