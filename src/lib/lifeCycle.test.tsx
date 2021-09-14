import * as React from "react";

import { render } from "@testing-library/react";

import { reasc } from "./reasc";
import { delayedAct } from "./testUtils";

test("effect sync", () => {
  const callback = jest.fn();
  const Component = reasc((props, { effect }) => {
    effect(callback);
    return null;
  });
  render(<Component />);
  expect(callback).toBeCalledTimes(1);
});

test("effect async", async () => {
  const callback = jest.fn();
  const Component = reasc(async (props, { effect, delay }) => {
    await delay(10);
    effect(callback);
    return null;
  });
  render(<Component />);
  expect(callback).toBeCalledTimes(0);
  await delayedAct(15);
  expect(callback).toBeCalledTimes(1);
});

test("cleanup sync", () => {
  const callback = jest.fn();
  const Component = reasc<{ value: number }>((_, { effect }) => {
    effect(() => callback);
    return null;
  });
  const { rerender } = render(<Component value={1} />);
  rerender(<Component value={2} />);
  expect(callback).toBeCalledTimes(1);
});

test("cleanup async", async () => {
  const callback = jest.fn();
  const Component = reasc<{ value: number }>(async (_, { effect, delay }) => {
    await delay(10);
    effect(() => callback);
    return null;
  });
  const { rerender } = render(<Component value={1} />);
  await delayedAct(15);
  rerender(<Component value={2} />);
  expect(callback).toBeCalledTimes(1);
});

test("dispose sync", () => {
  const callback = jest.fn();
  const Component = reasc<{ value: number }>((_, { effect }) => {
    effect(() => () => callback);
    return null;
  });
  const { unmount } = render(<Component value={1} />);
  unmount();
  expect(callback).toBeCalledTimes(1);
});

test("dispose async", async () => {
  const callback = jest.fn();
  const Component = reasc<{ value: number }>(async (_, { effect, delay }) => {
    await delay(10);
    effect(() => () => callback);
    return null;
  });
  const { unmount } = render(<Component value={1} />);
  await delayedAct(15);
  unmount();
  expect(callback).toBeCalledTimes(1);
});
