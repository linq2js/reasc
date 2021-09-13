import { eventEmitter } from "../lib/eventEmitter";
import { reducer } from "../lib/reducer";
import { Store, StoreAction, StoreReducer } from "../lib/types";

const INIT_ACTION = "INIT_" + Date.now().toString(36).substr(2);

export type DefaultState = { [key: string]: any };

export interface StoreCreator extends Function {
  <TState extends {} = DefaultState>(
    ...reducers: StoreReducer<TState>[]
  ): Store<TState>;
  <TState extends {} = DefaultState>(
    initialState: TState,
    ...reducers: StoreReducer<TState>[]
  ): Store<TState>;
}

export const createStore: StoreCreator = (...args: any[]): any => {
  const reducers = [reducer];
  let state = {};

  if (typeof args[0] === "function") {
    reducers.push(...args);
  } else {
    state = args[0];
    reducers.push(...args.slice(1));
  }

  const emitter = eventEmitter();

  function getState() {
    return state;
  }

  function dispatch(action: StoreAction) {
    const nextState = reducers.reduceRight(
      (state, reducer) => reducer(state, action),
      state
    );
    if (nextState !== state) {
      state = nextState;
      emitter.emit();
    }
  }

  dispatch({ type: INIT_ACTION });

  return {
    getState,
    subscribe: emitter.on,
    dispatch,
  };
};
