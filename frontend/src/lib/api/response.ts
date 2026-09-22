export async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;
  try {
    return await response.json();
  } catch (jsonParsingError) {
    if (response.ok) {
      // Successful responses other than 204/205 must contain valid JSON.
      throw jsonParsingError;
    }

    // The request failed, and the response body is empty or isn't valid JSON.
    // Return null so the caller throws an error based on the response HTTP status
    // instead of throwing a JSON parsing error here.
    return null;
  }
}
