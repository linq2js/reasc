import * as React from "react";

import {
  AsyncComponentOptions,
  LoadingCallback,
  ErrorCallback,
  AsyncComponentContext,
} from "./types";
import { useAsc } from "./useAsc";

const loadingContext = React.createContext<any>(null as any);
const errorContext = React.createContext<any>(null as any);

interface ExtraProps {
  loading: LoadingCallback<any>;
  error: ErrorCallback<any>;
}

export interface Reasc {
  <TProps extends {}>(
    component: (props: TProps, context: AsyncComponentContext<{}>) => any
  ): React.FC<TProps>;

  <TProps extends {}, THookData extends {} = any>(
    options: AsyncComponentOptions<TProps, THookData>,
    component: (props: TProps, context: AsyncComponentContext<THookData>) => any
  ): React.FC<TProps>;
}

export const reasc: Reasc = (...args: any[]): any => {
  const [options, component] =
    typeof args[1] === "function" ? args : [{}, args[0]];
  const contexts: any[] = [];
  options.error && contexts.push([errorContext.Provider, options.error]);
  options.loading && contexts.push([loadingContext.Provider, options.loading]);

  const wrapper = (props: any, { loading, error }: ExtraProps) => {
    const hookData = options.useHooks?.(props) || ({} as any);
    return useAsc(component, props, hookData, loading, error);
  };

  if (contexts.length) {
    return React.memo((props) =>
      contexts.reduce(
        (children, [provider, value]) =>
          React.createElement(provider, { value }, children),
        wrapper(props, {
          loading: options.loading || React.useContext(loadingContext),
          error: options.error || React.useContext(errorContext),
        })
      )
    );
  }

  return React.memo((props) =>
    wrapper(props, {
      loading: React.useContext(loadingContext),
      error: React.useContext(errorContext),
    })
  );
};
