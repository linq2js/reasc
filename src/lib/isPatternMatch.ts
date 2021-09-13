export function isPatternMatch(pattern: string, value: string): boolean {
  if (pattern[0] === "*") {
    return value.endsWith(pattern.substr(1));
  }
  if (pattern[pattern.length - 1] === "*") {
    return value.startsWith(pattern.substr(0, pattern.length - 1));
  }
  return pattern === value;
}
