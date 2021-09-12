import { AnyAction } from "redux";
import { MERGE_STATE_ACTION } from "./types";

const DEFAULT_STATE = {};

export function reducer(state: any = DEFAULT_STATE, action: AnyAction) {
  if (action.type === MERGE_STATE_ACTION) {
    return {
      ...state,
      ...action.nextState,
    };
  }
  return state;
}
