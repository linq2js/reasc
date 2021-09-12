export function delay(ms: number) {
  let timeout: NodeJS.Timeout;
  return Object.assign(
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, ms);
    }),
    {
      cancel() {
        clearTimeout(timeout);
      },
    }
  );
}
