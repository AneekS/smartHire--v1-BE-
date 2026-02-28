type Reply = { status: (code: number) => Reply; send: (body: unknown) => unknown };

export function success<T>(
  reply: Reply,
  data: T,
  statusCode: number = 200,
  message?: string
) {
  return reply.status(statusCode).send({
    status: 'success',
    ...(message && { message }),
    data,
  });
}

export function error(
  reply: Reply,
  message: string,
  statusCode: number = 500,
  errors?: unknown
) {
  const body: Record<string, unknown> = { status: 'error', message };
  if (errors != null) body.errors = errors;
  return reply.status(statusCode).send(body);
}

export function paginated<T>(
  reply: Reply,
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return reply.send({
    status: 'success',
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
