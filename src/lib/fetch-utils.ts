/**
 * Safely parse JSON from a Response, returning a fallback on failure.
 * Prevents "Unexpected end of JSON input" crashes when the server returns
 * non-JSON responses (e.g., HTML error pages, empty bodies).
 */
export async function safeJson<T = Record<string, unknown>>(
  res: Response,
  fallback: T
): Promise<T> {
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}
