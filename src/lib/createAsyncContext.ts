import { delay } from "./delay";
import { eventEmitter } from "./eventEmitter";
import { isPatternMatch } from "./isPatternMatch";
import { mergeState } from "./mergeState";
import { objectEqual } from "./objectEqual";
import { actionDispatchingHandlers } from "./reducer";
import {
  Action,
  AsyncComponentContext,
  CacheItem,
  ErrorCallback,
  LoadingCallback,
  MERGE_STATE_ACTION,
  StateAccessor,
  Store,
  StoreAction,
} from "./types";

export interface InternalContext<THookData>
  extends AsyncComponentContext<THookData> {
  readonly disposed: boolean;
  readonly hookData: THookData;
  cache: Map<any, CacheItem>;
  rendered: boolean;
  resolved?: { value?: any; error?: Error };
  dispose(): void;
  render<TProps>(
    props: TProps,
    component: (props: TProps, context: AsyncComponentContext<THookData>) => any
  ): any;
}

const DisposedError = () => new Error();
const ForkedStateError = () =>
  new Error("Cannot access state inside forked context");
const InvalidHookData = {};
const InvalidCache = new Map();
const InvalidState = {
  get: () => {
    throw DisposedError();
  },
  set: () => {
    throw DisposedError();
  },
};
const ForkedState = {
  get: () => {
    throw ForkedStateError();
  },
  set: () => {
    throw ForkedStateError();
  },
};

export function createAsyncContext<THookData>(
  type: "component" | "forked",
  parent: InternalContext<THookData> | undefined,
  hookData: THookData,
  cache: Map<any, CacheItem>,
  store: Store,
  stateAccessor: StateAccessor,
  originalRerender: Function,
  loading?: LoadingCallback,
  error?: ErrorCallback
) {
  let disposed = false;
  let unsubscribeStateChange: (() => void) | undefined = undefined;
  let removeActionDispatchingHandler: (() => void) | undefined = undefined;
  let setStateTimeout: NodeJS.Timeout;
  const dependencies = new Map<string, any>();
  const whenActionDispatchingHandlers = eventEmitter<StoreAction>();

  const checkAvailable = () => {
    if (context.disposed) {
      throw DisposedError();
    }
  };

  const rerender = () => {
    checkAvailable();
    originalRerender({});
  };

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
    checkAvailable();
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

  const context: InternalContext<THookData> = {
    hookData,
    cache,
    resolved: undefined,
    rendered: false,
    get disposed() {
      return disposed || parent?.disposed || false;
    },

    callback(func: Function, defaultPayload?: any): any {
      return (payload: any = defaultPayload) => {
        const child = createAsyncContext(
          type,
          undefined,
          InvalidHookData,
          InvalidCache,
          store,
          stateAccessor,
          originalRerender,
          loading,
          error
        );

        if (defaultPayload && payload !== defaultPayload) {
          payload = { ...defaultPayload, ...payload };
        }

        return func(child, payload);
      };
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
      const child = createAsyncContext(
        "forked",
        context,
        InvalidHookData,
        InvalidCache,
        store,
        ForkedState,
        originalRerender,
        undefined,
        undefined
      );
      return wrapResult(child, action(payload, child));
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
                  return a === "*" || isPatternMatch(a, action.type);
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
    call(action: any, payload?: any): any {
      checkAvailable();
      const child = createAsyncContext(
        type,
        context,
        hookData,
        context.cache,
        store,
        stateAccessor,
        originalRerender,
        loading,
        error
      );
      if (typeof action === "string") {
        const command = (store as any).__commands[action];
        if (!command) {
          throw new Error(`No command "${action}" provided`);
        }
        action = command;
      }
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

      const child = createAsyncContext(
        "forked",
        context,
        InvalidHookData,
        InvalidCache,
        store,
        InvalidState,
        originalRerender,
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
          value: action(payload, child),
          payload,
        };
        cache.set(key, item);
      }

      return wrapResult(child, item.value);
    },

    async storeReady(name: string, valueCheck = isNotNil) {
      const getValue = () => store.getState()[name];
      const value = getValue();
      if (valueCheck(value)) return value;
      await context.when(() => valueCheck(getValue()));
      return getValue();
    },

    store(payload: any, defaultValue?: any) {
      checkAvailable();
      const state = store.getState();
      if (typeof payload === "string") {
        const value = payload in state ? state[payload] : defaultValue;
        if (type === "component") {
          dependencies.set(payload, value);
          subscribeStore();
        }
        return value;
      }
      const nextState = mergeState(state, payload);
      if (nextState !== state) {
        store.dispatch({ type: MERGE_STATE_ACTION, nextState });
      }
    },

    state(payload: any, defaultValue?: any) {
      checkAvailable();
      if (type !== "component") {
        throw new Error("Invalid Operation");
      }
      const state = stateAccessor.get();
      if (typeof payload === "string") {
        return payload in state ? state[payload] : defaultValue;
      }
      const nextState = mergeState(state, payload);

      if (nextState !== state) {
        stateAccessor.set(nextState);
        if (context.rendered) {
          setStateTimeout && clearTimeout(setStateTimeout);
          setStateTimeout = setTimeout(rerender, 0);
        }
      }
    },

    render(props, component) {
      try {
        const result = component(props, context);
        if (result && typeof result.then === "function") {
          wrapResult(context, result)
            .then((value: any) => {
              context.resolved = { value };
            })
            .catch((error: Error) => {
              context.resolved = { error };
            })
            .finally(rerender);

          return loading ? loading(props) : null;
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
      disposed = true;
      setStateTimeout && clearTimeout(setStateTimeout);
      unsubscribeStateChange?.();
    },
  };

  return context;
}

function isNotNil(value: any) {
  return value !== null && typeof value !== "undefined";
}

function wrapResult(context: InternalContext<any>, result: any, ct?: any): any {
  if (typeof result === "function") {
    return wrapResult(context, result(context), ct);
  }

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
