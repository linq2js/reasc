import * as React from "react";

import { storeContext } from "../lib/storeContext";
import { Store } from "../lib/types";
import { createStore } from "./createStore";

export type AsyncProviderProps = {
  store?: Store;
  prop?: string;
  initialState?: any;
  commands?: {};
  storeHook?: () => Store;
};

export const AsyncProvider: React.FC<AsyncProviderProps> = React.memo(
  ({ store, prop, commands, initialState, storeHook, children }) => {
    const inputStore = storeHook ? storeHook() : store;
    const storeWrapper = React.useMemo((): Store => {
      const store = inputStore || createStore(initialState);
      if (!prop && !commands) return store;

      const getState = prop ? () => store.getState()[prop] : store.getState;

      return {
        ...store,
        ...{ __commands: { ...(store as any).__commands, ...commands } },
        getState,
      };
    }, [commands, initialState, inputStore, prop]);

    return React.createElement(
      storeContext.Provider,
      { value: storeWrapper },
      children
    );
  }
);
