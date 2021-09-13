import * as React from "react";

import { render } from "@testing-library/react";

import { delayedAct } from "../lib/testUtils";
import { MERGE_STATE_ACTION } from "../lib/types";
import { useStore } from "../lib/useStore";
import { AsyncProvider } from "./AsyncProvider";

test("default store", async () => {
  const App = () => {
    const [, rerender] = React.useState<any>();
    const store = useStore();
    React.useEffect(() => {
      setTimeout(() => {
        store.dispatch({ type: MERGE_STATE_ACTION, nextState: { value: 1 } });
        rerender({});
      }, 10);
    }, [store]);
    return <div data-testid="result">{store.getState().value}</div>;
  };
  const { getByTestId } = render(
    <AsyncProvider>
      <App />
    </AsyncProvider>
  );
  expect(getByTestId("result").innerHTML).toBe("");
  await delayedAct(15);
  expect(getByTestId("result").innerHTML).toBe("1");
});
