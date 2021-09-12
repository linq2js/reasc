import { StoreAction, MERGE_STATE_ACTION } from "./types";
import { eventEmitter } from "./eventEmitter";

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
