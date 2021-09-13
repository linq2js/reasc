import * as React from "react";
import { storeContext } from "./storeContext";

export function useStore() {
  return React.useContext(storeContext);
}
