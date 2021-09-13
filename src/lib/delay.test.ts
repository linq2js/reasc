import { delay } from "./delay";

test("cancellable delay", async () => {
  const callback = jest.fn();
  const t = delay(10);
  t.then(callback);
  t.cancel();
  await delay(15);
  expect(callback).not.toBeCalled();
});
