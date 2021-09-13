import { eventEmitter } from "./eventEmitter";
import { objectEqual } from "./objectEqual";
import { StoreAction, StoreReducer, MERGE_STATE_ACTION } from "./types";

const DEFAULT_STATE = {};

export const actionDispatchingHandlers = eventEmitter<StoreAction>();

export const reducer: StoreReducer = (
  state = DEFAULT_STATE,
  action: StoreAction
) => {
  Promise.resolve().then(() => actionDispatchingHandlers.emit(action));

  if (action.type === MERGE_STATE_ACTION) {
    if (objectEqual(state, action.nextState)) return state;
    return {
      ...state,
      ...action.nextState,
    };
  }
  return state;
};
