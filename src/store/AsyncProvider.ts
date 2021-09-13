import * as React from "react";

import { storeContext } from "../lib/storeContext";
import { Store } from "../lib/types";
import { createStore } from "./createStore";

export type AsyncProviderProps = {
  store?: Store;
  prop?: string;
  storeHook?: () => Store;
};

export const AsyncProvider: React.FC<AsyncProviderProps> = React.memo(
  ({ store, prop, storeHook, children }) => {
    const inputStore = storeHook ? storeHook() : store;
    const storeWrapper = React.useMemo((): Store => {
      const store = inputStore || createStore();
      if (!prop) return store;
      return {
        ...store,
        getState: () => store.getState()[prop],
      };
    }, [inputStore, prop]);

    return React.createElement(
      storeContext.Provider,
      { value: storeWrapper },
      children
    );
  }
);
