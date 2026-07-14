export interface ControllerResult<T = unknown> {
  status?: number;
  body: T;
}

export type Controller = (request: Request) => Promise<ControllerResult> | ControllerResult;
