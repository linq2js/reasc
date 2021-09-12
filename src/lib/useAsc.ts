import { storeContext } from "./storeContext";
import * as React from "react";
import {
  Action,
  AsyncComponentContext,
  ErrorCallback,
  LoadingCallback,
  MERGE_STATE_ACTION,
  Store,
  StoreAction,
} from "./types";
import { objectEqual } from "./objectEqual";
import { eventEmitter } from "./eventEmitter";
import { actionDispatchingHandlers } from "./reducer";
import { delay } from "./delay";

interface Context<THookData> extends AsyncComponentContext<THookData> {
  readonly disposed: boolean;
  readonly hookData: THookData;
  cache: Map<any, CacheItem>;
  rendered: boolean;
  setStateTimeout?: NodeJS.Timeout;
  resolved?: { value?: any; error?: Error };
  dispose(): void;
  render<TProps>(
    props: TProps,
    component: (props: TProps, context: AsyncComponentContext<THookData>) => any
  ): any;
}

interface CacheItem {
  value: any;
  payload: any;
}

const DisposedError = () => new Error();
const InvalidHookData = {};
const InvalidSetState = () => {
  throw new Error("Cannot update state inside forked context");
};
const InvalidCache = new Map();

export function useAsyncComponent<TProps, THookData>(
  component: (props: TProps, context: AsyncComponentContext<THookData>) => any,
  props: TProps,
  hookData: THookData,
  loading: LoadingCallback,
  error: ErrorCallback
) {
  const store = React.useContext(storeContext);
  const [state, setState] = React.useState<any>({});
  const contextRef = React.useRef<Context<THookData>>();

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

  const context = createContext(
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

function createContext<THookData>(
  parent: Context<THookData> | undefined,
  hookData: THookData,
  cache: Map<any, CacheItem>,
  store: Store,
  state: any,
  setState: React.SetStateAction<any>,
  loading?: LoadingCallback,
  error?: ErrorCallback
) {
  let disposed = false;
  let unsubscribeStateChange: (() => void) | undefined = undefined;
  let removeActionDispatchingHandler: (() => void) | undefined = undefined;
  const dependencies = new Map<string, any>();
  const whenActionDispatchingHandlers = eventEmitter<StoreAction>();

  const checkAvailable = () => {
    if (context.disposed) throw DisposedError();
  };

  const rerender = () => setState({ ...state });

  const registerActionDispatchingHandler = () => {
    if (removeActionDispatchingHandler) return;
    removeActionDispatchingHandler = actionDispatchingHandlers.on(
      whenActionDispatchingHandlers.emit
    );
  };

  const subscribeStore = () => {
    if (unsubscribeStateChange) return;
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

  const handleAsyncValues = (type: "all" | "race", values: any): any => {
    const entries = Object.entries(values);
    const isArray = Array.isArray(values);
    const results: any = isArray ? [] : {};
    const ct = { cancelled: false };
    const cancels = new Map<any, Function>();
    let doneCount = 0;

    return wrapResult(
      context,
      new Promise((resolve, reject) => {
        const handleResult = (key: any, value: any, error: any) => {
          if (ct.cancelled) return;
          doneCount++;
          cancels.delete(key);
          if (error) {
            ct.cancelled = true;
            cancels.forEach((cancel) => cancel());
            reject(error);
            return;
          }

          results[key] = value;

          if (type === "race" || doneCount >= entries.length) {
            // cancel others
            cancels.forEach((cancel) => cancel());
            resolve(results);
          }
        };

        entries.forEach(([key, value]: [any, any]) => {
          if (value && typeof value.then === "function") {
            if (typeof value.cancel === "function") {
              cancels.set(key, value.cancel);
            }
            value.then(
              (result: any) => handleResult(key, result, undefined),
              (error: any) => handleResult(key, undefined, error)
            );
          } else {
            if (typeof value.cancel === "function") {
              cancels.set(key, value.cancel);
            }
            handleResult(key, value, undefined);
          }
        });
      }),
      ct
    );
  };

  const context: Context<THookData> = {
    hookData,
    cache,
    resolved: undefined,
    setStateTimeout: undefined,
    rendered: false,
    get disposed() {
      return disposed || parent?.disposed || false;
    },

    delay(ms) {
      checkAvailable();
      return wrapResult(context, delay(ms));
    },

    fork<TPayload, TResult>(
      action: Action<TPayload, TResult, any>,
      payload: TPayload
    ) {
      checkAvailable();
      const child = createContext(
        context,
        InvalidHookData,
        InvalidCache,
        store,
        state,
        InvalidSetState,
        undefined,
        undefined
      );
      const result = action(payload, child);
      return wrapResult(child, result);
    },

    all(values: any) {
      return handleAsyncValues("all", values);
    },
    race(values: any) {
      return handleAsyncValues("race", values);
    },
    when(...actions: any[]) {
      checkAvailable();
      registerActionDispatchingHandler();
      let unsubscribe: () => void;
      return Object.assign(
        new Promise<StoreAction>((resolve) => {
          unsubscribe = whenActionDispatchingHandlers.on(
            (action: StoreAction) => {
              const isMatch = actions.some((a) => {
                if (typeof a === "string") {
                  return a === action.type;
                }
                if (typeof a === "function") {
                  return a(action);
                }
                return false;
              });
              if (isMatch) {
                return resolve(action);
              }
            }
          );
        }),
        {
          cancel() {
            unsubscribe?.();
          },
        }
      );
    },

    dispatch(action: any) {
      checkAvailable();
      if (typeof action === "string") {
        action = { type: action };
      }
      return store.dispatch(action);
    },

    call<TPayload, TResult>(
      action: Action<TPayload, TResult, any>,
      payload: TPayload
    ) {
      checkAvailable();
      const child = createContext(
        context,
        hookData,
        context.cache,
        store,
        state,
        setState,
        loading,
        error
      );
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

      const child = createContext(
        context,
        InvalidHookData,
        InvalidCache,
        store,
        state,
        InvalidSetState,
        loading,
        error
      );

      let cache: Map<any, CacheItem> = local
        ? context.cache
        : (store as any).__cache;

      if (cache === InvalidCache) {
        throw DisposedError();
      }
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
      unsubscribeStateChange?.();
    },
  };

  return context;
}

function wrapResult(context: Context<any>, result: any, ct?: any) {
  if (result && typeof result.then === "function") {
    return Object.assign(
      new Promise((resolve, reject) => {
        result
          .then((value: any) => {
            if (context.disposed) return;
            resolve(value);
          })
          .catch((error: Error) => {
            if (context.disposed) return;
            reject(error);
          });
      }),
      {
        cancel() {
          if (ct) ct.cancelled = true;
          result?.cancel();
          context.dispose();
        },
      }
    );
  }
  return result;
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
