import * as React from "react";

import { createAsyncContext, InternalContext } from "./createAsyncContext";
import {
  AsyncComponentContext,
  ErrorCallback,
  LoadingCallback,
  StateAccessor,
} from "./types";
import { useStore } from "./useStore";

export function useAsc<TProps, THookData>(
  component: (props: TProps, context: AsyncComponentContext<THookData>) => any,
  props: TProps,
  useHooks: (props: TProps) => THookData,
  loading: LoadingCallback,
  error: ErrorCallback
) {
  const store = useStore();
  const [, rerender] = React.useState<any>();
  const contextRef = React.useRef<InternalContext<THookData>>();
  const stateRef = React.useRef<StateAccessor>();
  const hookData = useHooks ? useHooks.call(null, props) : (undefined as any);
  let isAsync = false;

  if (!stateRef.current) {
    let state = {};
    stateRef.current = {
      get: () => state,
      set: (value: any) => {
        state = value;
      },
    };
  }

  React.useEffect(() => {
    !isAsync && contextRef.current?.runEffects();
  });

  React.useEffect(() => {
    return () => {
      contextRef.current?.dispose(true);
    };
  }, []);

  // re-render when promise resolved
  if (contextRef.current?.resolved) {
    // context is still alive
    const resolved = contextRef.current.resolved;
    contextRef.current.resolved = undefined;
    contextRef.current.rendered = true;
    isAsync = true;
    setTimeout(contextRef.current.runEffects);
    if (resolved.error) {
      if (!error) {
        throw resolved.error;
      }
      return error(props, resolved.error);
    }
    return resolved.value;
  }

  const prevOnDispose = contextRef.current?.__onDispose;
  contextRef.current?.dispose(false);

  const context = createAsyncContext(
    "component",
    undefined,
    hookData,
    contextRef.current?.cache || new Map(),
    store,
    stateRef.current,
    rerender,
    loading,
    error
  );

  if (prevOnDispose) {
    context.__onDispose = prevOnDispose;
  }

  contextRef.current = context;

  const renderResult = context.render(props, component);
  isAsync = renderResult.async;
  return renderResult.result;
}
