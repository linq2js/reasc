import * as React from "react";
import {
  AsyncComponentContext,
  ErrorCallback,
  LoadingCallback,
  StateAccessor,
} from "./types";
import { createAsyncContext, InternalContext } from "./createAsyncContext";
import { useStore } from "./useStore";

export function useAsc<TProps, THookData>(
  component: (props: TProps, context: AsyncComponentContext<THookData>) => any,
  props: TProps,
  hookData: THookData,
  loading: LoadingCallback,
  error: ErrorCallback
) {
  const store = useStore();
  const [, rerender] = React.useState<any>();
  const contextRef = React.useRef<InternalContext<THookData>>();
  const stateRef = React.useRef<StateAccessor>();

  React.useEffect(() => {
    return contextRef.current?.dispose;
  }, [contextRef.current]);

  if (!stateRef.current) {
    let state = {};
    stateRef.current = {
      get: () => state,
      set: (value: any) => (state = value),
    };
  }

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

  const context = createAsyncContext(
    undefined,
    hookData,
    contextRef.current?.cache || new Map(),
    store,
    stateRef.current,
    rerender,
    loading,
    error
  );

  contextRef.current = context;

  return context.render(props, component);
}
