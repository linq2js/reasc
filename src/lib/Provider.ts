import * as React from "react";

import { storeContext } from "./storeContext";
import { Store } from "./types";

export const Provider: React.FC<{ store: Store }> = (props) =>
  React.createElement(
    storeContext.Provider,
    { value: props.store },
    props.children
  );
