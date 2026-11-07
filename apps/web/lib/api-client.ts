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
    const payload = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" ")
      : payload?.message;

    throw new ApiError(
      response.status,
      message || `API request failed: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
