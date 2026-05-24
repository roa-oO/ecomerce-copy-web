import { generateEcommerceCopy, getErrorResponse, readJsonBody } from "../src/server/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 사용할 수 있습니다." });
  }

  try {
    const body = await readJsonBody(req);
    const headerApiKey = req.headers["x-api-key"];
    const apiKey = Array.isArray(headerApiKey) ? headerApiKey[0] : headerApiKey || body.apiKey;
    const result = await generateEcommerceCopy({ ...body, apiKey });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Gemini copy generation failed:", error);
    const { statusCode, message } = getErrorResponse(error, "카피 생성 중 서버 오류가 발생했습니다.");
    return res.status(statusCode).json({ error: message });
  }
}
