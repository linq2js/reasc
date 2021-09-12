import * as React from "react";
import { Provider } from "react-redux";
import {
  StoreCreator,
  createStore,
  Store,
  Reducer,
  StoreEnhancer,
} from "redux";
import { reducer } from "./reducer";

export type CreateProviderResult<TState = any> = [React.FC, Store<TState>];

interface CreateProvider {
  <TState>(
    initialState: TState,
    enhancer?: StoreEnhancer
  ): CreateProviderResult<TState>;
  (...args: Parameters<StoreCreator>): CreateProviderResult;
}

export const createProvider: CreateProvider = (...args: any[]): any => {
  let store: Store;
  if (typeof args[0] === "object") {
    store = createStore(reducer, ...args);
  } else {
    const originalReducer: Reducer = args[0];
    store = createStore((state, action) => {
      return reducer(originalReducer(state, action), action);
    }, ...args.slice(1));
  }

  return [
    ({ children }: any) => React.createElement(Provider, { store }, children),
    store,
  ];
};
