import * as React from "react";
import { createProvider } from ".";
import { reasc } from "../lib/reasc";
import { render, fireEvent } from "@testing-library/react";
import { delayedAct } from "../lib/testUtils";

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
});
