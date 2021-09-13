import { isPatternMatch } from "./isPatternMatch";

test("should use strictly comparision if no wildcard", () => {
  expect(isPatternMatch("a", "a")).toBeTruthy();
  expect(isPatternMatch("a", "A")).toBeFalsy();
});

test("wildcard at begining", () => {
  expect(isPatternMatch("*a", "abca")).toBeTruthy();
  expect(isPatternMatch("*a", "abcf")).toBeFalsy();
});

test("wildcard at end", () => {
  expect(isPatternMatch("a*", "abc")).toBeTruthy();
  expect(isPatternMatch("a*", "xabcf")).toBeFalsy();
});
