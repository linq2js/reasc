import * as React from "react";

import { render, fireEvent } from "@testing-library/react";

import { delay } from "./delay";
import { reasc } from "./reasc";
import { delayedAct } from "./testUtils";

const defaultOptions = {
  loading: () => null,
};

test("delayed component", async () => {
  const Component = reasc(defaultOptions, async () => {
    await delay(10);
    return <div data-testid="result">1</div>;
  });

  const { getByTestId } = render(<Component />);
  expect(() => getByTestId("result")).toThrow();
  await delayedAct(15);
  expect(getByTestId("result").innerHTML).toBe("1");
});

test("counter: using state", async () => {
  const Component = reasc(
    {
      useHooks() {
        const [hookValue] = React.useState(2);
        return { hookValue };
      },
    },
    ({ init }: any, { state, hookData: { hookValue } }) => {
      const count = state<number>("count", init + hookValue);
      const increment = () => state({ count: count + 1 });

      return (
        <div data-testid="result" onClick={increment}>
          {count}
        </div>
      );
    }
  );

  const { getByTestId } = render(<Component init={1} />);

  expect(getByTestId("result").innerHTML).toBe("3");

  fireEvent.click(getByTestId("result"));

  await delayedAct();

  expect(getByTestId("result").innerHTML).toBe("4");
});

test("debouncing", async () => {
  const Component = reasc(async ({ count }: any, { delay }) => {
    await delay(10);
    return <div data-testid="result">{count * 2}</div>;
  });
  const App = () => {
    const [count, setCount] = React.useState(0);
    return (
      <>
        <button data-testid="button" onClick={() => setCount(count + 1)} />
        <Component count={count} />
      </>
    );
  };
  const { getByTestId } = render(<App />);

  fireEvent.click(getByTestId("button"));
  fireEvent.click(getByTestId("button"));

  await delayedAct(15);

  expect(getByTestId("result").innerHTML).toBe("4");
});
