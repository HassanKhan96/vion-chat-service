export class CustomError extends Error {
  code = "";

  constructor(code: string, message: string, stack?: string) {
    super(message);
    this.code = code;
  }
}

export class QueryError extends CustomError {
  constructor(
    message: string = "Could not complete database operation",
    code: string = "QUERY_FAILED",
  ) {
    super(code, message);
  }
}
