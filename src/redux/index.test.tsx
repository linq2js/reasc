import * as React from "react";
import { createProvider } from "./createProvider";
import { reasc } from "../lib/reasc";
import { Provider } from "react-redux";
import { render, fireEvent } from "@testing-library/react";
import { delayedAct } from "../lib/testUtils";
import { Action } from "../lib/types";
import { createStore } from "redux";
import { useStore } from "../lib/useStore";

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

test("proxy provider", () => {
  const ProxyProvider = createProvider();
  const store = createStore((state = 1) => state);
  const callback = jest.fn();
  const Component = () => {
    const store = useStore();
    callback(store.getState());
    return null;
  };
  const App = () => (
    <Provider store={store}>
      <ProxyProvider>
        <Component />
      </ProxyProvider>
    </Provider>
  );
  render(<App />);
  expect(callback).toBeCalledWith(1);
});

test("passing store as argument", () => {
  const store = createStore((state = 1) => state);
  const [Provider] = createProvider(store);
  const callback = jest.fn();
  const Component = () => {
    const store = useStore();
    callback(store.getState());
    return null;
  };
  const App = () => (
    <Provider>
      <Component />
    </Provider>
  );
  render(<App />);
  expect(callback).toBeCalledWith(1);
});
