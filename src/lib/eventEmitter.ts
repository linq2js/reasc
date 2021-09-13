export interface EventEmitter<T> {
  on(listener: (payload: T) => void): () => void;
  emit(): void;
  emit(payload: T): void;
}

export function eventEmitter<T = never>(): EventEmitter<T> {
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
    emit(...args: any[]) {
      Array.from(listeners).forEach((listener) => listener(args[0]));
    },
  };
}
