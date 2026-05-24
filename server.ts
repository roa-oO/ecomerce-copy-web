/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized or dynamic Gemini Client
function getGeminiClientForRequest(userApiKey?: string): GoogleGenAI {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key가 누락되었습니다. 카피 작업 공간 사용을 위해 화면 상단의 Gemini API Key 입력을 완료해주세요.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Route to validate Gemini API Key in real-time
app.post("/api/validate-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({ error: "검증할 API Key를 입력해주세요." });
    }

    const key = apiKey.trim();
    
    // Quick validation of trivial/invalid keys like 'A' or simple short placeholders
    if (key.length < 20 || key === 'A' || key.toLowerCase().includes("your") || key.toLowerCase().includes("api_key")) {
      return res.status(400).json({ 
        valid: false, 
        error: "형식이 올바르지 않은 API Key입니다. (형식 불일치 혹은 너무 짧음)" 
      });
    }

    // Initialize temporary client to test key validity with a very fast request
    const testAi = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Make an extremely lightweight call to verify the key
    await testAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hi",
      config: {
        maxOutputTokens: 1,
      },
    });

    return res.json({ valid: true });
  } catch (error: any) {
    console.error("Gemini API Key validation error:", error);
    
    let reason = "유효하지 않은 API Key이거나 네트워크 및 권한에 에러가 존재합니다.";
    if (error.message) {
      if (error.message.includes("API_KEY_INVALID")) {
        reason = "입력하신 Gemini API Key가 유효하지 않습니다 (API_KEY_INVALID).";
      } else if (error.message.includes("quota") || error.message.includes("QUOTA_EXCEEDED")) {
        reason = "API Key는 유효하지만 할당량 초과(QUOTA_EXCEEDED) 오류가 발생했습니다.";
      } else {
        reason = `API Key 검증 오류: ${error.message}`;
      }
    }
    
    return res.status(400).json({ valid: false, error: reason });
  }
});

// API Route for E-commerce copy generation
app.post("/api/generate", async (req, res) => {
  try {
    const {
      brandName,
      category,
      feature1,
      feature2,
      feature3,
      targetAudience,
      brandConcept,
      priceRange,
      additionalNotes,
      angle,
      channels = ["coupang", "naver", "d2c"],
      apiKey,
    } = req.body;

    if (!brandName || !category || !feature1) {
      return res.status(400).json({ error: "브랜드명, 상품 카테고리, 핵심 특징 1은 필수 입력 항목입니다." });
    }

    const clientApiKey = req.headers["x-api-key"] as string || apiKey;
    const ai = getGeminiClientForRequest(clientApiKey);

    // Constructing detailed prompt instructions for Gemini 3.5 Flash
    let angleNameText = "";
    let angleDetailText = "";

    if (angle === "A") {
      angleNameText = "A. 소재/성분 강조형 (Efficacy/Ingredient Focused)";
      angleDetailText = `핵심 원료, 소재, 기술 및 성분의 효능을 전면에 배치하여 이성적이고 분석적으로 소구합니다. 기술적 원리와 과학적 데이터(제시된 정보 범위 내)를 신뢰성 있는 언어로 표현합니다.`;
    } else if (angle === "B") {
      angleNameText = "B. 타겟 공감형 (Target Experience Focused)";
      angleDetailText = `고객이 일상에서 마주하는 구체적 고민, 상황, Pain Point에서 시작하여 사용자의 감정과 공감을 이끌어냅니다. 친근하고 대화체 같은 문체로 심리적 연결고리를 형성합니다.`;
    } else {
      angleNameText = "C. 결과/변화 강조형 (Result/Transformation Focused)";
      angleDetailText = `제품 사용 후 기대되는 놀라운 시각적 변화, 삶의 질 향상 및 명확한 직간접적 이점을 비포&애프터가 그려지듯이 역동적이고 긍정적인 언어로 최우선 소구합니다.`;
    }

    const systemInstruction = `당신은 국내 이커머스(쿠팡·네이버 스마트스토어·자사몰)의 노출 알고리즘과 구매 전환 심리를 깊이 이해하는 베테랑 이커머스 MD 겸 카피라이팅 디렉터입니다. 
제공되는 상품 정보와 지정된 카피라이팅 각도(Angle)를 분석하여 각 이커머스 플랫폼의 채널 특성과 타켓 심리에 완벽히 격이 다른 초일류 최적화 카피 패키지를 생성해 내야 합니다. 

[중요 지침 - 광고법 및 안전 가이드 준수]
1. 허위·과대광고 표현은 철저히 배제하십시오.
   - 절대 사용 불가 표현 (❌): "100% 완치", "즉각 치료", "의학적으로 증명", "무조건 효과 보장", "전 세계 1위", "최초", "유일"
   - 권장 대체 표현 (✅): "피부과 테스트 완료", "사용자 만족도 높은", "공식 인증 기관 검증 완료", "체계적인 품질 관리"
2. 무조건 없는 효능이나 성분, 허구의 데이터를 새롭게 창작하여 적지 마십시오. 오직 제공된 특징 범위 내에서 신뢰성 있게 묘사해야 합니다.

[채널별 카피라이팅 가이드라인 및 서식 요구사항]

1. 쿠팡 최적화 카피 세트 (coupang):
   - 목표: 검색 알고리즘 상위 노출 및 혜택·가성비·직관성을 갈망하는 쿠팡 고객 심리 저격
   - 추천 상품명 (5안): 브랜드명 + 성분/소재 + 용도 + 용량/수량 + 단위 순서의 나열형. 특수문자 최소화, 공백 포함 30~50자. 단독/기획 등 각 유형에 맞춰 고르게 가공.
   - 핵심 셀링 포인트: 구체적 근거, 가성비, 실용 기능 위주 3가지 (문장 1줄씩).
   - 상세페이지 카피: 모바일 가동성이 우수하고 3초 안에 구매 전환을 돕게끔 숫자, 수치, 가시적 효과를 전면에 배치한 직관적인 5~6문단 구성. 빠른 배송(로켓배송), 묶음 할인 가능 언급 포함.

2. 네이버 스마트스토어 최적화 카피 세트 (naver):
   - 목표: 네이버 쇼핑 SEO 친화적 태그 및 정보 신뢰 기반 이성+감성 균형 카피
   - 추천 상품명 (5안): 공백 포함 20~30자 이내 준수. 브랜드명 + 주요타겟 + 소재/성분 + 기능 순서. 불필요한 특수문자, 중복 키워드는 철저히 제거할 것.
   - 핵심 셀링 포인트: 반드시 "[핵심 키워드 태그] + 2~3문장 설명" 포맷 가이드라인 준수. 라이프스타일 연계 스토리 + 기능적 신뢰 정보 제공.
   - 상세페이지 카피: 블로그 리뷰를 보는 듯한 친근한 구체적 사용 후기 문체. 자연스럽게 실구매자의 경험을 대변하며 검색 키워드가 매끄럽게 녹아든 5~6문단 구성.

3. 자사몰(D2C) 브랜드 카피 세트 (d2c):
   - 목표: [SECTION 3] 자사몰(D2C) 브랜드 카피 패키지
   - 추천 상품명 (5안): 브랜드 고유 톤앤매너 유지. 검색 최적화보다 브랜드 일관성 우선.
   - 핵심 셀링 포인트: 브랜드 신뢰 → 성분/소재 차별성 → 고객 혜택(멤버십·무료배송·적립금 등) 순서의 3가지 구성.
   - 상세페이지 카피: 공백 포함 250~350자 내외. 타겟 고객의 일상 상황·감정에 공명하는 오프닝 - 기존 제품이 해결하지 못한 구체적 불편 지적 - 핵심 특징을 브랜드 언어로 자연스럽게 녹여낸 해결책 제시 - 자사몰 단독 혜택 또는 소장 욕구를 자극하는 행동 유도 문장 구조. 브랜드 스토리 연결 및 제품 개발 배경·철학 포함. 재구매 유도를 위한 멤버십·정기구독 혜택 연계 문구 삽입. 반드시 블록체 따옴표(>) 형식으로 출력해야 함. 광고법 위반 표현, 근거 없는 최상급·비교 표현 절대 금지.

최종적으로, 위의 모든 내용을 깔끔하게 구분한 마크다운 원본('rawMarkdown')도 JSON 결과 객체에 포함하여 함께 리턴하십시오. 'rawMarkdown' 영역은 사용자가 한 번에 복사해서 사용할 수 있도록 서론이나 수식어 없이 바로 결과물로 시작해야 합니다.
`;

    const userPrompt = `
[상품 상세 정보]
- 브랜드명: ${brandName}
- 상품 카테고리: ${category}
- 핵심 특징 1: ${feature1}
${feature2 ? `- 핵심 특징 2: ${feature2}` : ""}
${feature3 ? `- 핵심 특징 3: ${feature3}` : ""}
${targetAudience ? `- 타겟 고객층: ${targetAudience}` : ""}
${brandConcept ? `- 브랜드 컨셉: ${brandConcept}` : ""}
${priceRange ? `- 가격대: ${priceRange}` : ""}
${additionalNotes ? `- 추가 특이사항 및 프로모션: ${additionalNotes}` : ""}

[생성 방식 지정]
- 카피라이팅 각도(Angle): ${angleNameText} (${angleDetailText})
- 생성 대상 채널: ${channels.join(", ")}

지정된 각도에 맞추어 플랫폼별 특성에 최적화된 콘텐츠 세트를 풍부하게 생성해 주세요.
`;

    // Setting up the Response Schema using Type enum from modern SDK (@google/genai)
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        coupang: {
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
            recommendedTitles: {
              type: Type.OBJECT,
              properties: {
                seo: { type: Type.STRING },
                target: { type: Type.STRING },
                efficacy: { type: Type.STRING },
                promo: { type: Type.STRING },
                limited: { type: Type.STRING },
              },
              required: ["seo", "target", "efficacy", "promo", "limited"],
            },
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
          required: ["channelName", "channelLabel", "angle", "angleLabel", "targetKeywords", "recommendedTitles", "sellingPoints", "detailPageCopy"],
        },
        naver: {
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
            recommendedTitles: {
              type: Type.OBJECT,
              properties: {
                seo: { type: Type.STRING },
                target: { type: Type.STRING },
                efficacy: { type: Type.STRING },
                promo: { type: Type.STRING },
                limited: { type: Type.STRING },
              },
              required: ["seo", "target", "efficacy", "promo", "limited"],
            },
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
          required: ["channelName", "channelLabel", "angle", "angleLabel", "targetKeywords", "recommendedTitles", "sellingPoints", "detailPageCopy"],
        },
        d2c: {
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
            recommendedTitles: {
              type: Type.OBJECT,
              properties: {
                seo: { type: Type.STRING },
                target: { type: Type.STRING },
                efficacy: { type: Type.STRING },
                promo: { type: Type.STRING },
                limited: { type: Type.STRING },
              },
              required: ["seo", "target", "efficacy", "promo", "limited"],
            },
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
          required: ["channelName", "channelLabel", "angle", "angleLabel", "targetKeywords", "recommendedTitles", "sellingPoints", "detailPageCopy"],
        },
        rawMarkdown: {
          type: Type.STRING,
          description: "전체 패키지를 완벽히 가공한 이커머스 카피라이팅 통합 마크다운 텍스트입니다. 채널별로 구분선(---)을 지니며 각 채널 요구사항(예: 자사몰 따옴표 및 글자수)을 100% 충족시켜 바로 복사해 쓸 수 있어야 합니다.",
        },
      },
      required: ["coupang", "naver", "d2c", "rawMarkdown"],
    };

    // Requesting content generation
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
      },
    });

    const outputJsonString = response.text;
    if (!outputJsonString) {
      throw new Error("AI가 유효한 카피 데이터를 생성하지 못했습니다. 다시 시도해 주세요.");
    }

    const resultData = JSON.parse(outputJsonString.trim());
    return res.json(resultData);

  } catch (error: any) {
    console.error("Gemini Copy Generation Error:", error);
    return res.status(500).json({ error: error.message || "카피 생성 도중 서버 에러가 발생했습니다." });
  }
});

// Vite middleware integration for asset and routing resolution
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite's dev middlewares
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static files in production
    app.use(express.static(distPath));
    // SPA catch-all routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`E-commerce Copywriter Server is running on port ${PORT}`);
  });
}

startServer();
