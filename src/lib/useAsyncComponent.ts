import { Store } from "redux";
import * as React from "react";
import { useStore } from "react-redux";
import {
  Action,
  AsyncContext,
  ErrorCallback,
  LoadingCallback,
  MERGE_STATE_ACTION,
} from "./types";
import { objectEqual } from "./objectEqual";

interface ComponentContext<THookData> extends AsyncContext<THookData> {
  readonly disposed: boolean;
  readonly hookData: THookData;
  cache: Map<any, CacheItem>;
  rendered: boolean;
  setStateTimeout?: NodeJS.Timeout;
  resolved?: { value?: any; error?: Error };
  dispose(): void;
  render<TProps>(
    props: TProps,
    component: (props: TProps, context: AsyncContext<THookData>) => any
  ): any;
}

interface CacheItem {
  value: any;
  payload: any;
}

const DisposedError = new Error();

export function useAsyncComponent<TProps, THookData>(
  component: (props: TProps, context: AsyncContext<THookData>) => any,
  props: TProps,
  hookData: THookData,
  loading: LoadingCallback,
  error: ErrorCallback
) {
  const store = tryGetStore();
  const [state, setState] = React.useState<any>({});
  const contextRef = React.useRef<ComponentContext<THookData>>();

  React.useEffect(() => {
    return contextRef.current?.dispose;
  }, [contextRef.current]);

  // re-render when promise resolved
  if (contextRef.current?.resolved) {
    // context is still alive
    const resolved = contextRef.current.resolved;
    contextRef.current.resolved = undefined;
    contextRef.current.rendered = true;

    if (resolved.error) {
      if (!error) {
        throw resolved.error;
      }
      return error(props, resolved.error);
    }
    return resolved.value;
  }

  const context = createComponentContext(
    undefined,
    hookData,
    contextRef.current?.cache || new Map(),
    store,
    state,
    setState,
    loading,
    error
  );

  contextRef.current = context;

  return context.render(props, component);
}

function createComponentContext<THookData>(
  parent: ComponentContext<THookData> | undefined,
  hookData: THookData,
  cache: Map<any, CacheItem>,
  store: Store,
  state: any,
  setState: React.SetStateAction<any>,
  loading: LoadingCallback,
  error: ErrorCallback
) {
  const childContexts: ComponentContext<THookData>[] = [];
  let disposed = false;
  let unsubscribe: (() => void) | undefined = undefined;
  const dependencies = new Map<string, any>();

  const checkAvailable = () => {
    if (context.disposed) throw DisposedError;
  };

  const rerender = () => setState({ ...state });

  const subscribeStore = () => {
    if (unsubscribe) return;
    store.subscribe(() => {
      if (context.disposed) return;
      const state = store.getState();
      let changed = false;
      dependencies.forEach((value, prop) => {
        if (!changed && state[prop] !== value) {
          changed = true;
        }
      });
      if (changed) {
        rerender();
      }
    });
  };

  const wrapResult = (child: ComponentContext<THookData>, result: any) => {
    if (result && typeof result.then === "function") {
      return Object.assign(
        new Promise((resolve, reject) => {
          result
            .then((value: any) => {
              if (child.disposed) return;
              resolve(value);
            })
            .catch((error: Error) => {
              if (child.disposed) return;
              reject(error);
            });
        }),
        {
          cancel() {
            result?.cancel();
            child.dispose();
          },
        }
      );
    }
    return result;
  };

  const context: ComponentContext<THookData> = {
    hookData,
    cache,
    resolved: undefined,
    setStateTimeout: undefined,
    rendered: false,
    get disposed() {
      return disposed || parent?.disposed || false;
    },
    call<TPayload, TResult>(
      action: Action<TPayload, TResult, THookData>,
      payload: TPayload
    ) {
      checkAvailable();
      const child = createComponentContext(
        context,
        hookData,
        context.cache,
        store,
        state,
        setState,
        loading,
        error
      );
      childContexts.push(child);
      return wrapResult(child, action(payload, child));
    },
    memo(...args: any[]) {
      checkAvailable();
      const [key, action, payload = {}, local] =
        typeof args[0] === "function"
          ? // (action, local)
            typeof args[1] === "boolean"
            ? [args[0], args[0], undefined, args[1]]
            : // (action, payload, local)
              [args[0], ...args]
          : // (key, action, local)
          typeof args[2] === "boolean"
          ? [args[0], args[1], undefined, args[2]]
          : // (key, action, payload, local)
            args;

      const child = createComponentContext(
        context,
        hookData,
        context.cache,
        store,
        state,
        setState,
        loading,
        error
      );

      childContexts.push(child);

      let cache: Map<any, CacheItem> = local
        ? context.cache
        : (store as any).__cache;

      // always global cache
      if (!cache) {
        (store as any).__cache = cache = new Map();
      }

      let item: CacheItem | undefined = cache.get(key);

      if (!item || !objectEqual(item.payload, payload)) {
        item = {
          value: action(payload),
          payload,
        };
        cache.set(key, item);
      }

      return wrapResult(child, item.value);
    },

    store(payload: any, defaultValue?: any) {
      checkAvailable();
      const state = store.getState();
      if (typeof payload === "string") {
        const value = payload in state ? state[payload] : defaultValue;
        dependencies.set(payload, value);
        subscribeStore();
        return value;
      }
      const nextState = mergeState(state, payload);
      if (nextState !== state) {
        store.dispatch({ type: MERGE_STATE_ACTION, nextState });
      }
    },

    state(payload: any, defaultValue?: any) {
      checkAvailable();
      if (typeof payload === "string") {
        return payload in state ? state[payload] : defaultValue;
      }
      const nextState = mergeState(state, payload);

      if (nextState !== state) {
        state = nextState;
        if (context.rendered) {
          context.setStateTimeout && clearTimeout(context.setStateTimeout);
          context.setStateTimeout = setTimeout(setState, 0, state);
        }
      }
    },

    render(props, component) {
      try {
        const result = component(props, context);
        if (result && typeof result.then === "function") {
          const promise = wrapResult(context, result)
            .then((value: any) => {
              context.resolved = { value };
            })
            .catch((error: Error) => {
              context.resolved = { error };
            })
            .finally(rerender);

          if (!loading) throw promise;

          return loading(props);
        }
        context.rendered = true;
        return result;
      } catch (e) {
        context.rendered = true;
        if (!error) throw e;
        return error(props, e as Error);
      }
    },

    dispose() {
      if (disposed) return;
      unsubscribe?.();
    },
  };

  return context;
}

function tryGetStore(): Store {
  try {
    return useStore.call(null);
  } catch {
    return undefined as any;
  }
}

function mergeState(state: any, values: {}) {
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
