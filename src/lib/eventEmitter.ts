export function eventEmitter<T = never>() {
  const listeners = new Set<(payload: T) => void>();

  return {
    on(listener: (payload: T) => void) {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    emit(payload: T) {
      listeners.forEach((listener) => listener(payload));
    },
  };
}
