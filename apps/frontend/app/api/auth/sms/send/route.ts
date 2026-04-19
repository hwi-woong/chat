import { buildBackendHeaders, API_URL, toJsonResponse, toProxyErrorResponse } from "@/lib/server/backend-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/auth/sms/send`, {
      method: "POST",
      headers: buildBackendHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    return toJsonResponse(response);
  } catch {
    return toProxyErrorResponse();
  }
}
