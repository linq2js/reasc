export interface AsyncContext<THookData = { [key: string]: any }> {
  hookData: THookData;

  state<T>(name: string, defaultValue?: T): T;
  state(values: { [key: string]: any }): void;

  store<T>(name: string, defaultValue?: T): T;
  store(values: { [key: string]: any }): void;

  call<TPayload, TResult>(
    action: Action<TPayload, TResult, THookData>,
    payload?: TPayload
  ): TResult;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    payload?: TPayload
  ): TResult;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    payload?: TPayload,
    local?: boolean
  ): TResult;

  memo<TPayload extends {}, TResult>(
    action: (payload: TPayload) => TResult,
    local: boolean
  ): TResult;

  memo<TPayload extends {}, TResult>(
    key: any,
    action: Action<TPayload, TResult, THookData>,
    payload?: TPayload,
    local?: boolean
  ): TResult;

  memo<TPayload extends {}, TResult>(
    key: any,
    action: Action<TPayload, TResult, THookData>,
    local: boolean
  ): TResult;
}

export type LoadingCallback<TProps = {}> = (props: TProps) => any;
export type ErrorCallback<TProps = {}> = (props: TProps, error: Error) => any;

export type Action<TPayload, TResult, THookData> = (
  payload: TPayload,
  context: AsyncContext<THookData>
) => TResult;

export interface AsyncComponentOptions<TProps, THookData = any> {
  loading?: LoadingCallback<TProps>;
  error?: ErrorCallback<TProps>;
  useHooks?: (props: TProps) => THookData;
}

export const MERGE_STATE_ACTION = "REASC_MERGE_STATE";
