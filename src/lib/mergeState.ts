export function mergeState(state: any, values: {}) {
  let nextState = state;
  Object.entries(values).forEach(([key, value]) => {
    const prev = nextState[key];
    const next = typeof value === "function" ? value(prev) : value;
    if (next !== prev) {
      if (nextState === state) {
        nextState = { ...nextState };
      }
      nextState[key] = next;
    }
  });
  return nextState;
}
