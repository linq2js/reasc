import { createStore, Store } from "redux";

import * as React from "react";

import { render, fireEvent } from "@testing-library/react";

import { AsyncProvider } from "../store/AsyncProvider";
import { reasc } from "./reasc";
import { reducer } from "./reducer";
import { delayedAct } from "./testUtils";
import { Action } from "./types";

test("counter: using store", async () => {
  const [Provider] = createProvider({ count: 0 });
  const Component = reasc(
    {
      useHooks() {
        const [hookValue] = React.useState(2);
        return { hookValue };
      },
    },
    ({ init }: any, { store, hookData: { hookValue } }) => {
      const count = store<number>("count");
      const increment = () => store({ count: count + 1 });

      return (
        <div data-testid="result" onClick={increment}>
          {count}
        </div>
      );
    }
  );

  const { getByTestId } = render(
    <Provider>
      <Component />
    </Provider>
  );

  expect(getByTestId("result").innerHTML).toBe("0");

  fireEvent.click(getByTestId("result"));

  await delayedAct();

  expect(getByTestId("result").innerHTML).toBe("1");

  fireEvent.click(getByTestId("result"));

  await delayedAct();

  expect(getByTestId("result").innerHTML).toBe("2");
});

test("wait store value ready", async () => {
  const [Provider] = createProvider({});
  const LoadData: Action = async (_, { delay, store }) => {
    await delay(10);
    store({ data: 1 });
  };
  const Viewer = reasc(async (props, { storeReady }) => {
    const data = await storeReady<number>("data");
    return <div data-testid="result">{data}</div>;
  });
  const App = reasc(({ children }: any, { fork }) => {
    fork(LoadData);
    return children;
  });
  const { getByTestId } = render(
    <Provider>
      <App>
        <Viewer />
      </App>
    </Provider>
  );
  await delayedAct(15);
  expect(getByTestId("result").innerHTML).toBe("1");
});

function createProvider(initialState: any): [React.FC, Store] {
  const store = createStore(reducer, initialState);
  return [
    (props: any) => (
      <AsyncProvider store={store}>{props.children}</AsyncProvider>
    ),
    store,
  ];
}
