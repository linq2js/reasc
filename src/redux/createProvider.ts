import {
  StoreCreator,
  createStore,
  Store,
  Reducer,
  StoreEnhancer,
} from "redux";

import * as React from "react";
import { Provider as ReduxProvider, useStore } from "react-redux";

import { Provider as ReascProvider } from "../lib/Provider";
import { reducer } from "../lib/reducer";

export type CreateProviderResult<TState = any> = [React.FC, Store<TState>];

interface CreateProvider {
  (): React.FC;
  <TState>(store: Store<TState>): CreateProviderResult<TState>;
  <TState>(
    initialState: TState,
    enhancer?: StoreEnhancer
  ): CreateProviderResult<TState>;
  (...args: Parameters<StoreCreator>): CreateProviderResult;
}

export const createProvider: CreateProvider = (...args: any[]): any => {
  if (!args.length) {
    const Provider: React.FC = (props) => {
      const store = useStore();
      return React.createElement(ReascProvider, { store }, props.children);
    };
    return Provider;
  }
  let store: Store;
  if (args[0] && typeof args[0] === "object") {
    if (
      typeof args[0].getState === "function" &&
      typeof args[0].dispatch === "function" &&
      typeof args[0].dispatch === "function"
    ) {
      store = args[0];
    } else {
      store = createStore(reducer, ...args);
    }
  } else {
    const originalReducer: Reducer = args[0];
    store = createStore((state, action) => {
      return reducer(originalReducer(state, action), action);
    }, ...args.slice(1));
  }
  const Provider = ({ children }: any) =>
    // support both redux and reasc providers
    React.createElement(
      ReduxProvider,
      { store },
      React.createElement(ReascProvider, { store }, children)
    );

  return [Provider, store];
};
