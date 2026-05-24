const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ valid: false, error: "POST 요청만 사용할 수 있습니다." });
  }

  try {
    const body = await readJsonBody(req);
    const apiKey = normalizeApiKey(body.apiKey);

    if (apiKey.length < 20 || apiKey.toLowerCase().includes("your") || apiKey.toLowerCase().includes("api_key")) {
      return res.status(400).json({
        valid: false,
        error: "API Key 형식이 올바르지 않습니다. Google AI Studio에서 발급받은 키를 입력해 주세요.",
      });
    }

    const response = await fetch(`${GEMINI_API_BASE}/models?key=${encodeURIComponent(apiKey)}`);
    const payload = await readGeminiPayload(response);

    if (!response.ok) {
      return res.status(400).json({
        valid: false,
        error: getGeminiErrorMessage(payload, "Gemini API Key를 확인하지 못했습니다. 키 제한 설정과 사용 권한을 확인해 주세요."),
      });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Gemini API key validation failed:", error);
    return res.status(400).json({
      valid: false,
      error: error instanceof Error ? error.message : "API Key 검증 중 오류가 발생했습니다.",
    });
  }
}

async function readJsonBody(req: any) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body.trim() ? JSON.parse(req.body) : {};
  }

  if (Buffer.isBuffer(req.body)) {
    const text = req.body.toString("utf8").trim();
    return text ? JSON.parse(text) : {};
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    req.on("end", resolve);
    req.on("error", reject);
  });

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

function normalizeApiKey(apiKey: unknown) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Gemini API Key를 입력해 주세요.");
  }

  return apiKey.trim();
}

async function readGeminiPayload(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: { message: text } };
  }
}

function getGeminiErrorMessage(payload: any, fallback: string) {
  const message = payload?.error?.message || fallback;

  if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
    return "Gemini API Key가 올바르지 않습니다. 키를 다시 복사해서 입력해 주세요.";
  }

  if (message.includes("API has not been used") || message.includes("disabled")) {
    return "Google AI Studio/Gemini API 사용 설정이 꺼져 있습니다. Google Cloud에서 Generative Language API를 활성화해 주세요.";
  }

  if (message.includes("referer") || message.includes("referrer") || message.includes("restriction")) {
    return "API Key 제한 설정 때문에 Vercel 서버에서 사용할 수 없습니다. Google Cloud Console에서 키 제한을 해제하거나 Vercel 도메인을 허용해 주세요.";
  }

  return message;
}
