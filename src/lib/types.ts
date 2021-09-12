export interface StoreAction {
  type: string;
  [key: string]: any;
}

export interface Store<TState = any> {
  getState(): TState;
  subscribe(listener: () => void): any;
  dispatch(action: StoreAction): any;
}

export interface AsyncComponentContext<THookData = { [key: string]: any }>
  extends AsyncContext {
  hookData: THookData;

  state<T>(name: string, defaultValue?: T): T;
  state(values: { [key: string]: any }): void;
}

export interface CancellablePromise<T = void> extends Promise<T> {
  cancel(): void;
}

export type InferCancellablePromise<T> = T extends Promise<infer TResolved>
  ? CancellablePromise<TResolved>
  : T;

export interface AsyncContext {
  callback<TPayload, TResult>(
    func: (context: AsyncContext, payload: TPayload) => TResult
  ): (payload: TPayload) => TResult;

  callback<TPayload, TResult>(
    func: (context: AsyncContext, payload: TPayload) => TResult,
    transform: (payload: any) => TPayload
  ): (payload: TPayload) => TResult;

  dispatch(action: string | StoreAction): any;

  delay(ms: number): CancellablePromise;

  all(asyncValues: any[]): CancellablePromise<any[]>;
  all<T extends { [key: string]: any }>(
    asyncValues: T
  ): CancellablePromise<{ [key in keyof T]: any }>;

  race(asyncValues: any[]): CancellablePromise<any[]>;
  race<T extends { [key: string]: any }>(
    asyncValues: T
  ): CancellablePromise<{ [key in keyof T]: any }>;

  when(
    ...actions: (string | ((action: StoreAction) => boolean))[]
  ): CancellablePromise<StoreAction>;

  store<T>(name: string, defaultValue?: T): T;
  store(values: { [key: string]: any }): void;

  fork<TPayload, TResult>(
    action: Action<TPayload, TResult, AsyncContext>,
    payload?: TPayload
  ): InferCancellablePromise<TResult>;

  call<TPayload, TResult>(
    action: Action<TPayload, TResult, this>,
    payload?: TPayload
  ): InferCancellablePromise<TResult>;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    payload?: TPayload
  ): InferCancellablePromise<TResult>;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    payload?: TPayload,
    local?: boolean
  ): InferCancellablePromise<TResult>;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    local: boolean
  ): InferCancellablePromise<TResult>;

  memo<TPayload extends {}, TResult>(
    key: any,
    action: Action<TPayload, TResult, this>,
    payload?: TPayload,
    local?: boolean
  ): InferCancellablePromise<TResult>;

  memo<TPayload extends {}, TResult>(
    key: any,
    action: Action<TPayload, TResult, this>,
    local: boolean
  ): InferCancellablePromise<TResult>;
}

export type LoadingCallback<TProps = {}> = (props: TProps) => any;
export type ErrorCallback<TProps = {}> = (props: TProps, error: Error) => any;

export type Action<
  TPayload,
  TResult,
  TContext extends AsyncContext = AsyncContext
> = (payload: TPayload, context: TContext) => TResult;

export type ActionListener = (action: StoreAction) => void;

export interface AsyncComponentOptions<TProps, THookData = any> {
  loading?: LoadingCallback<TProps>;
  error?: ErrorCallback<TProps>;
  useHooks?: (props: TProps) => THookData;
}

export const MERGE_STATE_ACTION = "REASC_MERGE_STATE";
