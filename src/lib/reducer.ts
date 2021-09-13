import { eventEmitter } from "./eventEmitter";
import { StoreAction, MERGE_STATE_ACTION } from "./types";

const DEFAULT_STATE = {};

export const actionDispatchingHandlers = eventEmitter<StoreAction>();

export function reducer(state: any = DEFAULT_STATE, action: StoreAction) {
  Promise.resolve().then(() => actionDispatchingHandlers.emit(action));

  if (action.type === MERGE_STATE_ACTION) {
    return {
      ...state,
      ...action.nextState,
    };
  }
  return state;
}
