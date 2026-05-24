import { GoogleGenAI, Type } from "@google/genai";
import type { ChannelOutput, InputParams } from "../types";

type ChannelName = "coupang" | "naver" | "d2c";

export interface GenerateCopyRequest extends InputParams {
  apiKey?: string;
}

export interface GenerateCopyResponse {
  coupang?: ChannelOutput;
  naver?: ChannelOutput;
  d2c?: ChannelOutput;
  rawMarkdown: string;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function readJsonBody(req: any): Promise<Record<string, any>> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body.trim() ? JSON.parse(req.body) : {};
  }

  if (Buffer.isBuffer(req.body)) {
    const body = req.body.toString("utf8").trim();
    return body ? JSON.parse(body) : {};
  }

  if (typeof req.on !== "function") {
    return {};
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    req.on("end", resolve);
    req.on("error", reject);
  });

  const body = Buffer.concat(chunks).toString("utf8").trim();
  return body ? JSON.parse(body) : {};
}

export function getErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage || fallbackMessage;

  if (message.includes("API_KEY_INVALID") || message.includes("invalid")) {
    return {
      statusCode: 400,
      message: "Gemini API Key가 올바르지 않습니다. 키를 다시 확인해 주세요.",
    };
  }

  if (message.includes("quota") || message.includes("QUOTA_EXCEEDED")) {
    return {
      statusCode: 429,
      message: "Gemini API 사용량 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 키를 사용해 주세요.",
    };
  }

  return { statusCode: 500, message };
}

export async function validateGeminiApiKey(apiKey: unknown) {
  const key = normalizeApiKey(apiKey);

  if (key.length < 20 || key.toLowerCase().includes("your") || key.toLowerCase().includes("api_key")) {
    throw new ApiError(400, "API Key 형식이 올바르지 않습니다. Google AI Studio에서 발급받은 키를 입력해 주세요.");
  }

  const ai = createGeminiClient(key);

  await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: "Return OK.",
    config: {
      maxOutputTokens: 3,
    },
  });

  return { valid: true };
}

export async function generateEcommerceCopy(input: GenerateCopyRequest): Promise<GenerateCopyResponse> {
  validateGenerateInput(input);

  const ai = createGeminiClient(input.apiKey);
  const channels = normalizeChannels(input.channels);
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents: buildUserPrompt(input, channels),
    config: {
      systemInstruction: buildSystemInstruction(channels),
      responseMimeType: "application/json",
      responseSchema: buildResponseSchema(),
      temperature: 0.75,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini가 비어 있는 응답을 보냈습니다. 입력 내용을 조금 더 구체적으로 적고 다시 시도해 주세요.");
  }

  try {
    return JSON.parse(stripJsonFence(text)) as GenerateCopyResponse;
  } catch {
    throw new Error("Gemini 응답을 JSON으로 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function normalizeApiKey(apiKey: unknown) {
  const key = typeof apiKey === "string" ? apiKey.trim() : process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new ApiError(400, "Gemini API Key를 입력해 주세요.");
  }
  return key;
}

function createGeminiClient(apiKey: unknown) {
  return new GoogleGenAI({
    apiKey: normalizeApiKey(apiKey),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function validateGenerateInput(input: GenerateCopyRequest) {
  if (!input.brandName?.trim()) {
    throw new ApiError(400, "브랜드명을 입력해 주세요.");
  }
  if (!input.category?.trim()) {
    throw new ApiError(400, "상품 카테고리를 입력해 주세요.");
  }
  if (!input.feature1?.trim()) {
    throw new ApiError(400, "핵심 특징 1은 필수 입력값입니다.");
  }
}

function normalizeChannels(channels?: string[]): ChannelName[] {
  const allowed: ChannelName[] = ["coupang", "naver", "d2c"];
  const selected = Array.isArray(channels)
    ? channels.filter((channel): channel is ChannelName => allowed.includes(channel as ChannelName))
    : allowed;

  return selected.length ? selected : allowed;
}

function stripJsonFence(text: string) {
  return text
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
- 각 채널 결과에는 channelName, channelLabel, angle, angleLabel, targetKeywords, recommendedTitles, sellingPoints, detailPageCopy를 포함합니다.
- rawMarkdown에는 선택된 채널 결과를 사람이 바로 복사해 쓸 수 있게 정리한 전체 원본을 넣습니다.
`;
}

function buildUserPrompt(input: GenerateCopyRequest, channels: ChannelName[]) {
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

선택되지 않은 채널은 생략해도 됩니다.
`;
}

function buildResponseSchema() {
  const titleSchema = {
    type: Type.OBJECT,
    properties: {
      seo: { type: Type.STRING },
      target: { type: Type.STRING },
      efficacy: { type: Type.STRING },
      promo: { type: Type.STRING },
      limited: { type: Type.STRING },
    },
    required: ["seo", "target", "efficacy", "promo", "limited"],
  };

  const channelSchema = {
    type: Type.OBJECT,
    properties: {
      channelName: { type: Type.STRING },
      channelLabel: { type: Type.STRING },
      angle: { type: Type.STRING },
      angleLabel: { type: Type.STRING },
      targetKeywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      recommendedTitles: titleSchema,
      sellingPoints: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pointNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["pointNumber", "title", "description"],
        },
      },
      detailPageCopy: { type: Type.STRING },
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
    type: Type.OBJECT,
    properties: {
      coupang: channelSchema,
      naver: channelSchema,
      d2c: channelSchema,
      rawMarkdown: { type: Type.STRING },
    },
    required: ["rawMarkdown"],
  };
}
