import { act } from "@testing-library/react";
import { delay } from "./delay";

export function delayedAct(ms: number = 0) {
  return act(() => delay(ms));
}
