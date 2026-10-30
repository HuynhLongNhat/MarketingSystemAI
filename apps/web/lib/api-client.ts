const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3002";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${API_URL}/v1${path}`,
    {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}