export interface ControllerResult<T = unknown> {
  status?: number;
  body: T;
}

export type Controller = (
  request: Request,
  params: Record<string, string>,
) => Promise<ControllerResult> | ControllerResult;
