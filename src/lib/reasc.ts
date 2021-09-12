import {
  AsyncComponentOptions,
  LoadingCallback,
  ErrorCallback,
  AsyncComponentContext,
} from "./types";
import { useAsyncComponent } from "./useAsyncComponent";
import * as React from "react";

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

  <TProps extends {}, THookData extends {}>(
    options: AsyncComponentOptions<TProps, THookData>,
    component: (props: TProps, context: AsyncComponentContext<THookData>) => any
  ): React.FC<TProps>;
}

export const reasc: Reasc = (...args: any[]): any => {
  const [options, component] =
    typeof args[1] === "function" ? args : [{}, args[0]];
  const contexts: any[] = [];
  options.error && contexts.push([errorContext, options.error]);
  options.loading && contexts.push([loadingContext, options.loading]);

  const wrapper = (props: any, { loading, error }: ExtraProps) => {
    const hookData = options.useHooks?.(props) || ({} as any);
    return useAsyncComponent(component, props, hookData, loading, error);
  };

  if (options.error && options.loading) {
    return React.memo((props) =>
      React.createElement(
        errorContext.Provider,
        { value: options.error },
        React.createElement(
          loadingContext.Provider,
          { value: options.loading },
          wrapper(props, {
            loading: options.loading as any,
            error: options.error as any,
          })
        )
      )
    );
  }

  if (options.error) {
    return React.memo((props) =>
      React.createElement(
        errorContext.Provider,
        { value: options.error },
        wrapper(props, {
          loading: React.useContext(loadingContext),
          error: options.error as any,
        })
      )
    );
  }

  if (options.loading) {
    return React.memo((props) =>
      React.createElement(
        loadingContext.Provider,
        { value: options.loading },
        wrapper(props, {
          error: React.useContext(errorContext),
          loading: options.loading as any,
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
