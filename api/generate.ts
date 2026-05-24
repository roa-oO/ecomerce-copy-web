const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type ChannelName = "coupang" | "naver" | "d2c";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 사용할 수 있습니다." });
  }

  try {
    const body = await readJsonBody(req);
    const headerApiKey = req.headers["x-api-key"];
    const apiKey = normalizeApiKey(Array.isArray(headerApiKey) ? headerApiKey[0] : headerApiKey || body.apiKey);

    validateInput(body);

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemInstruction(normalizeChannels(body.channels)) }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildUserPrompt(body, normalizeChannels(body.channels)) }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: buildResponseSchema(),
            temperature: 0.75,
          },
        }),
      }
    );

    const payload = await readGeminiPayload(response);

    if (!response.ok) {
      return res.status(response.status).json({
        error: getGeminiErrorMessage(payload, "Gemini 카피 생성 요청이 실패했습니다."),
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini가 비어 있는 응답을 보냈습니다. 다시 시도해 주세요." });
    }

    try {
      return res.status(200).json(JSON.parse(stripJsonFence(text)));
    } catch {
      return res.status(500).json({ error: "Gemini 응답을 JSON으로 해석하지 못했습니다. 다시 시도해 주세요." });
    }
  } catch (error) {
    console.error("Gemini copy generation failed:", error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : "카피 생성 중 서버 오류가 발생했습니다.",
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

function validateInput(body: any) {
  if (!body.brandName?.trim()) {
    throw new Error("브랜드명을 입력해 주세요.");
  }

  if (!body.category?.trim()) {
    throw new Error("상품 카테고리를 입력해 주세요.");
  }

  if (!body.feature1?.trim()) {
    throw new Error("핵심 특징 1은 필수 입력값입니다.");
  }
}

function normalizeChannels(channels?: string[]): ChannelName[] {
  const allowed: ChannelName[] = ["coupang", "naver", "d2c"];
  const selected = Array.isArray(channels)
    ? channels.filter((channel): channel is ChannelName => allowed.includes(channel as ChannelName))
    : allowed;

  return selected.length ? selected : allowed;
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

  if (message.includes("quota") || message.includes("QUOTA_EXCEEDED")) {
    return "Gemini API 사용량 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 키를 사용해 주세요.";
  }

  if (message.includes("referer") || message.includes("referrer") || message.includes("restriction")) {
    return "API Key 제한 설정 때문에 Vercel 서버에서 사용할 수 없습니다. Google Cloud Console에서 키 제한을 해제하거나 Vercel 도메인을 허용해 주세요.";
  }

  return message;
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildSystemInstruction(channels: ChannelName[]) {
  return `
당신은 국내 이커머스 상세페이지와 상품명 카피를 만드는 전문 카피 디렉터입니다.
사용자가 입력한 상품 정보를 바탕으로 선택된 채널(${channels.join(", ")})에 맞는 카피를 생성하세요.

규칙:
- 과장 광고, 의학적 치료 보장, 100% 효과 보장 같은 표현은 금지합니다.
- 실제로 입력된 특징 안에서만 장점을 설명합니다.
- 한국어로 작성합니다.
- 반드시 JSON만 반환합니다. 설명 문장, 마크다운 코드블록, 주석은 넣지 마세요.
- rawMarkdown에는 선택된 채널 결과를 사람이 바로 복사해 쓸 수 있게 정리한 전체 원본을 넣습니다.
`;
}

function buildUserPrompt(input: any, channels: ChannelName[]) {
  const angleLabel =
    input.angle === "A"
      ? "소재/성분 강조형"
      : input.angle === "B"
        ? "타겟 공감 소구형"
        : "결과/변화 강조형";

  return `
[상품 정보]
- 브랜드명: ${input.brandName}
- 상품 카테고리: ${input.category}
- 핵심 특징 1: ${input.feature1}
${input.feature2 ? `- 핵심 특징 2: ${input.feature2}` : ""}
${input.feature3 ? `- 핵심 특징 3: ${input.feature3}` : ""}
${input.targetAudience ? `- 타겟 고객: ${input.targetAudience}` : ""}
${input.brandConcept ? `- 브랜드 콘셉트: ${input.brandConcept}` : ""}
${input.priceRange ? `- 가격대: ${input.priceRange}` : ""}
${input.additionalNotes ? `- 추가 요청사항: ${input.additionalNotes}` : ""}

[생성 조건]
- 카피 각도: ${input.angle}. ${angleLabel}
- 생성 채널: ${channels.join(", ")}

[채널별 작성 가이드]
- coupang: 검색 노출을 고려한 30~50자 상품명 5개, 빠른 구매 결정을 돕는 실용적 장점, 모바일 상세페이지 카피.
- naver: 20~30자 안팎의 자연스러운 상품명 5개, 검색 키워드와 리뷰형 설명이 어울리는 카피.
- d2c: 브랜드 자사몰에 어울리는 감성적 상품명 5개, 브랜드 스토리와 멤버십/공식몰 혜택을 연결한 카피.
`;
}

function buildResponseSchema() {
  const titleSchema = {
    type: "OBJECT",
    properties: {
      seo: { type: "STRING" },
      target: { type: "STRING" },
      efficacy: { type: "STRING" },
      promo: { type: "STRING" },
      limited: { type: "STRING" },
    },
    required: ["seo", "target", "efficacy", "promo", "limited"],
  };

  const channelSchema = {
    type: "OBJECT",
    properties: {
      channelName: { type: "STRING" },
      channelLabel: { type: "STRING" },
      angle: { type: "STRING" },
      angleLabel: { type: "STRING" },
      targetKeywords: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      recommendedTitles: titleSchema,
      sellingPoints: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            pointNumber: { type: "INTEGER" },
            title: { type: "STRING" },
            description: { type: "STRING" },
          },
          required: ["pointNumber", "title", "description"],
        },
      },
      detailPageCopy: { type: "STRING" },
    },
    required: [
      "channelName",
      "channelLabel",
      "angle",
      "angleLabel",
      "targetKeywords",
      "recommendedTitles",
      "sellingPoints",
      "detailPageCopy",
    ],
  };

  return {
    type: "OBJECT",
    properties: {
      coupang: channelSchema,
      naver: channelSchema,
      d2c: channelSchema,
      rawMarkdown: { type: "STRING" },
    },
    required: ["rawMarkdown"],
  };
}
