export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(params: {
    code: ErrorCode;
    status: number;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  return new AppError({
    code: 'INTERNAL',
    status: 500,
    message: 'Unexpected error',
  });
}
