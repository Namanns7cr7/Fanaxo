/**
 * Client helper: turn a failed API response into a user-facing message.
 *
 * The server returns a stable ApiError shape with an optional `issues` array
 * of field-level problems. Surfacing those is far more useful than the
 * generic top-level message ("The request payload is invalid").
 */

interface ApiErrorBody {
  message?: string;
  issues?: Array<{ path: string; message: string }>;
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  let body: ApiErrorBody;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    return fallback;
  }
  if (body.issues !== undefined && body.issues.length > 0) {
    // Show the specific field problems, e.g. "MFA code must be 6 digits".
    return body.issues.map((issue) => issue.message).join(' ');
  }
  return body.message ?? fallback;
}
