import * as React from "react";
import { Store } from "./types";

export const storeContext = React.createContext<Store>(null as any);
