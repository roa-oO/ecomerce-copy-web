import { getErrorResponse, readJsonBody, validateGeminiApiKey } from "../src/server/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ valid: false, error: "POST 요청만 사용할 수 있습니다." });
  }

  try {
    const body = await readJsonBody(req);
    const result = await validateGeminiApiKey(body.apiKey);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Gemini API key validation failed:", error);
    const { statusCode, message } = getErrorResponse(error, "API Key 검증 중 오류가 발생했습니다.");
    return res.status(statusCode).json({ valid: false, error: message });
  }
}
