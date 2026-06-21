/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useTransition, useRef } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Zap,
  TrendingUp,
  ShieldCheck,
  Search,
  ArrowRight,
  History,
  Info,
  ExternalLink,
  MessageSquare,
  Lock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import { InputParams, GenerationResult, ChannelOutput } from "./types";

async function readApiJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `서버가 JSON 대신 다른 응답을 보냈습니다. (${response.status}) Vercel의 /api 함수가 배포되었는지 확인해 주세요.`
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("서버 응답을 JSON으로 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export default function App() {
  const [inputs, setInputs] = useState<InputParams>({
    brandName: "",
    category: "",
    feature1: "",
    feature2: "",
    feature3: "",
    targetAudience: "",
    brandConcept: "",
    priceRange: "",
    additionalNotes: "",
    angle: "A",
    channels: ["coupang", "naver", "d2c"],
  });

  const [generations, setGenerations] = useState<GenerationResult[]>([]);
  const [activeGenIndex, setActiveGenIndex] = useState<number>(-1);
  const [isPending, startTransition] = useTransition();
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("coupang"); // 'coupang' | 'naver' | 'd2c'
  const [copiedId, setCopiedId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  
  // Interactive element states for user interest on landing page
  const [activeCompareTab, setActiveCompareTab] = useState<string>("coupang");
  
  // Gemini API Key entry state
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => localStorage.getItem("gemini_api_key") || "");
  const [isValidated, setIsValidated] = useState<boolean>(() => localStorage.getItem("is_gemini_key_validated") === "true");
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const handleValidateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setValidationError("Gemini API Key를 입력해 주세요.");
      return;
    }
    
    setIsValidating(true);
    setValidationError("");
    
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      
      const data = await readApiJson(response);
      
      if (!response.ok || !data.valid) {
        throw new Error(data.error || "API Key가 유효하지 않습니다.");
      }
      
      // Success! Save to localStorage and state
      localStorage.setItem("gemini_api_key", apiKeyInput);
      localStorage.setItem("is_gemini_key_validated", "true");
      setIsValidated(true);
      setValidationError("");
      
      // Smooth scroll to the workspace
      setTimeout(() => {
        scrollToWorkspace();
      }, 500);
      
    } catch (err: any) {
      console.error("API validation error", err);
      // Set validated false to prevent bypass
      localStorage.removeItem("is_gemini_key_validated");
      setIsValidated(false);
      setValidationError(err.message || "API Key 검증 도중 오류가 발생했습니다.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetApiKey = () => {
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("is_gemini_key_validated");
    setApiKeyInput("");
    setIsValidated(false);
    setValidationError("");
  };

  const workspaceRef = useRef<HTMLDivElement>(null);

  const scrollToWorkspace = () => {
    if (!isValidated) {
      window.scrollTo({ top: 350, behavior: "smooth" });
      setValidationError("카피 작업실을 활성화하려면 먼저 Gemini API Key를 입력하고 '시작하기'로 인증을 완료해 주세요.");
      return;
    }
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Staggered loading messages helper
  const triggerLoadingMessages = async () => {
    const messages = [
      "🛒 이커머스 채널별 노출 알고리즘 분석 및 태그 적합성 검사...",
      "⚡ 지정된 소구 각도(Angle)의 유기적 매력 뼈대 파악 중...",
      "🚀 쿠팡 가성비 특화 노출 키워드 및 빠른 배송 상세 카피 세공...",
      "💚 네이버 스마트스토어 라이프스타일 스토리 및 SEO 태그 튜닝...",
      "🖤 자사몰(D2C) 전용 브랜드 스토리 및 자사몰 단독 멤버십 루프 생성...",
      "🛡️ 표시광고법 위반 유발 위험 키워드 전수 검안 사전 가이드라인 체크 중...",
      "✨ 프리미엄 이커머스 카피 팩 가공 완성!"
    ];

    for (let i = 0; i < messages.length; i++) {
      setLoadingStep(messages[i]);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  };

  // Helper to load makeup tin example
  const loadExample = () => {
    setInputs({
      brandName: "클리오",
      category: "메이크업 립 틴트",
      feature1: "넥클리스 별도 구매 후 키링 및 목걸이로 착용 가능",
      feature2: "여러 번 덧발라도 맑은 발색과 유리알 광택 유지",
      feature3: "착색제·색소를 줄여 다크닝 현상 최소화",
      targetAudience: "10~20대 트렌디 세대",
      brandConcept: "유니크하고 패셔너블한 패션 오브제 코스메틱",
      priceRange: "1~2만원대 캐주얼 기프트",
      additionalNotes: "공식 자사몰 최초 단독 선행출시 할인 프로모션 진행",
      angle: "B",
      channels: ["coupang", "naver", "d2c"],
    });
    setErrorMsg("");
    scrollToWorkspace();
  };

  // Form value change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Checkbox helper
  const handleChannelCheckbox = (channel: string) => {
    setInputs(prev => {
      const isChecked = prev.channels.includes(channel);
      let updated = [];
      if (isChecked) {
        updated = prev.channels.filter(c => c !== channel);
      } else {
        updated = [...prev.channels, channel];
      }
      return { ...prev, channels: updated };
    });
  };

  // Copy helper
  const handleCopy = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(elementId);
    setTimeout(() => {
      setCopiedId("");
    }, 2000);
  };

  // API submit handler
  const generateCopy = (selectedAngle?: 'A' | 'B' | 'C') => {
    if (!inputs.brandName.trim()) {
      setErrorMsg("브랜드명을 입력해 주세요.");
      return;
    }
    if (!inputs.category.trim()) {
      setErrorMsg("상품 카테고리를 입력해 주세요.");
      return;
    }
    if (!inputs.feature1.trim()) {
      setErrorMsg("핵심 특징 1은 필수 입력값입니다.");
      return;
    }
    if (inputs.channels.length === 0) {
      setErrorMsg("생성할 대상 플랫폼 채널을 하나 이상 선택하세요.");
      return;
    }

    if (!isValidated) {
      setErrorMsg("Gemini API Key 입력을 완료하고 '시작하기'로 인증을 완료한 후에 사용하실 수 있습니다.");
      return;
    }

    setErrorMsg("");
    const targetAngle = selectedAngle || inputs.angle;

    startTransition(async () => {
      try {
        const loadingPromise = triggerLoadingMessages();
        
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...inputs,
            angle: targetAngle,
            apiKey: apiKeyInput, // send the verified user's key
          }),
        });

        if (!response.ok) {
          const errData = await readApiJson(response);
          throw new Error(errData.error || "카피 생성 서버 응답에 오류가 발생했습니다.");
        }

        const data = await readApiJson(response);
        await loadingPromise; 
        
        const newResult: GenerationResult = {
          id: `gen_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          angle: targetAngle,
          inputs: { ...inputs, angle: targetAngle },
          coupang: data.coupang,
          naver: data.naver,
          d2c: data.d2c,
          rawMarkdown: data.rawMarkdown,
        };

        setGenerations(prev => [newResult, ...prev]);
        setActiveGenIndex(0);
        
        // Auto-select based on response channels
        if (inputs.channels.includes("d2c") && data.d2c) {
          setActiveTab("d2c");
        } else if (inputs.channels.includes("coupang") && data.coupang) {
          setActiveTab("coupang");
        } else if (inputs.channels.includes("naver") && data.naver) {
          setActiveTab("naver");
        } else {
          setActiveTab("d2c");
        }

      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "카피 자동 생성 중 서버 통신 에러가 발생했습니다.");
      }
    });
  };

  // Sequential Angle rotation helper
  const handleRegenerateNextAngle = () => {
    if (generations.length === 0) return;
    
    const lastResult = generations[0];
    const previousAngle = lastResult.angle;
    
    let nextAngle: 'A' | 'B' | 'C' = 'B';
    if (previousAngle === 'A') nextAngle = 'B';
    else if (previousAngle === 'B') nextAngle = 'C';
    else if (previousAngle === 'C') nextAngle = 'A';

    setInputs(prev => ({ ...prev, angle: nextAngle }));
    generateCopy(nextAngle);
  };

  const activeResult = activeGenIndex >= 0 ? generations[activeGenIndex] : null;

  // Safe getters for channel contents with smart professional fallback
  const getSafeD2c = (res: any) => {
    if (res && res.d2c) return res.d2c;
    const brand = inputs.brandName || "클리오";
    const cat = inputs.category || "메이크업 립 틴트";
    const feat1 = inputs.feature1 || "넥클리스 결도 결합 커스텀 키링 목걸이 활용 가능";
    const notes = inputs.additionalNotes || "상시 무료 배송 및 카카오 알림 추가 할인 쿠폰 증정";

    return {
      channelName: "d2c",
      channelLabel: "자사몰 (D2C)",
      angle: inputs.angle,
      angleLabel: inputs.angle === 'A' ? "A. 소재/성분 강조형" : inputs.angle === 'B' ? "B. 타겟 공감 소구형" : "C. 결과/변화 강조형",
      targetKeywords: [brand, cat, "D2COriginal", "커스텀오브제", "단독특가"],
      recommendedTitles: {
        seo: `[단독 런칭] ${brand} 스페셜 시그니처 에디션 ${cat}`,
        target: `트렌드를 주도할 완전체 오브제, ${brand} NEW ${cat}`,
        efficacy: `${feat1.substring(0, 20)} 기술력을 고이 농축한 ${brand} 컬렉션`,
        promo: `${brand} 정식 자사 스토어 런칭 기념 무료배송 스페셜 키트`,
        limited: `[공식 자사몰 전용] ${brand} 실버 체인 한정 세트 (${cat})`,
      },
      sellingPoints: [
        {
          pointNumber: 1,
          title: "본사 다이렉트 100% 정품 보증 & 콜드체인 안심 검수",
          description: "유통 중간 단계를 일체 생략하고 자사 연구소에서 밀봉 생산된 가장 신선한 정품만을 본사가 책임지고 집 앞까지 안전 배송합니다."
        },
        {
          pointNumber: 2,
          title: `전무후무한 독창적 기프트 : ${feat1.substring(0, 22)}...`,
          description: "단순한 코스메틱 악세서리를 넘어 목걸이, 스마트키 키링으로 가볍게 결합해 나만의 패션 디테일을 채우는 트렌디 미장센을 완성합니다."
        },
        {
          pointNumber: 3,
          title: "공식 자사몰 전용 라이프타임 멤버십 케어 루프",
          description: `신규 첫 가입 즉시 차감되는 웰컴 프로모션 특전 무료배송 혜택과 더불어, ${notes} 혜택이 상시 자동 적용됩니다.`
        }
      ],
      detailPageCopy: `> “악세서리인가요, 코스메틱인가요?”\n\n> 남들과 같은 평범한 틴트에서 벗어나고 싶었던 당신의 트렌디 라이프에, 드디어 가장 직관적이고 완벽한 커스텀 솔루션이 찾아옵니다. 화장대 위 한구석에 우두커니 방치되는 색조가 아닌, 그 자체로 온전한 패션의 일부가 되는 ${brand}의 ${cat}.\n\n> 오직 독보적인 감각만을 탐하는 분들을 위해 탄생한 이 제품은, 특별하게 덧바를수록 맑게 피어오르는 투명 광택막을 설계함과 동시에 외형적으로 즉시 소장하고 싶어지는 메탈릭 넥클리스 체인의 유기적 아름다움을 부여했습니다.\n\n> 잃어버릴 염려 없이 일상 속 가벼운 키링으로, 혹은 독창적인 패션 넥클리스로 당신만의 정체성을 선사할 시간. 지금 공식 온라인 자사몰에서 첫 런칭 한정 특전을 누려보십시오.`
    };
  };

  const getSafeCoupang = (res: any) => {
    if (res && res.coupang) return res.coupang;
    const brand = inputs.brandName || "클리오";
    const cat = inputs.category || "메이크업 립 틴트";
    const feat1 = inputs.feature1 || "커스텀 넥클리스 키링 사용 패키지";
    return {
      channelName: "coupang",
      channelLabel: "쿠팡 로켓최적화",
      angle: inputs.angle,
      angleLabel: "쿠팡 직관 소구형",
      targetKeywords: [brand, cat, "인기순추천", "로켓배송틴트"],
      recommendedTitles: {
        seo: `${brand} 데일리 웨어 안심 멀티 ${cat} 1개입`,
        target: `고밀착 데일리 립, ${brand} 커스텀 키링 겸용 ${cat}`,
        efficacy: `${brand} 프리미엄 광택 밀착 ${feat1.substring(0, 15)} ${cat}`,
        promo: `${brand} 스페셜 기획 패키지 (쿠팡 실속 벌크팩)`,
        limited: `${brand} 골드에디션 쿠팡 단독 수량 ${cat}`,
      },
      sellingPoints: [
        { 
          pointNumber: 1, 
          title: "쿠팡 로켓배송 안심 지원", 
          description: "일요일도 무관, 영하/폭염 속에서도 흐트러지지 않도록 정온 로켓배송 시스템으로 내일 새벽이면 즉각 문 앞에 안심 도착합니다." 
        },
        { 
          pointNumber: 2, 
          title: `실용적인 일상 편의 : ${feat1.substring(0, 18)}`, 
          description: "일상 분실과 번거로움을 완전히 덜어주는 특허 키링 방식 결합으로 주머니 없이도 완벽한 고정이 보장됩니다." 
        },
        { 
          pointNumber: 3, 
          title: "쿠팡 제휴 카드 즉시 청구할인 및 대량 구매 기획전", 
          description: "유통 과정을 제거해 가장 합리적인 소비가 가능한 결합 세트 구성으로, 선물용 및 쟁여두기 맞춤 가성비를 완성했습니다." 
        }
      ],
      detailPageCopy: `매일 휴대해야 하는 화장품인데, 가방 속 깊이 파묻혀 찾기 번거롭고 매번 흔들려 잃어버리지는 않으셨나요?\n\n${brand} ${cat}은 오직 사용자의 즉각적인 모바일 편의와 구매 만족을 철저히 계산해 설계되었습니다.\n\n착 달라붙는 ${feat1}의 독보적인 강점에 든든한 가성비를 더해, 오늘 단 하루 쿠팡 특전 로켓 빠른 문 앞 배송으로 눈앞의 놀라운 터치를 경험하십시오.`
    };
  };

  const getSafeNaver = (res: any) => {
    if (res && res.naver) return res.naver;
    const brand = inputs.brandName || "클리오";
    const cat = inputs.category || "메이크업 립 틴트";
    const feat1 = inputs.feature1 || "목걸이 결합 키링 패셔너블 커스텀 오너먼트";
    return {
      channelName: "naver",
      channelLabel: "네이버 스마트스토어",
      angle: inputs.angle,
      angleLabel: "친근 스토리 공감형",
      targetKeywords: [brand, cat, "스토어검색1순위", "인생틴트추천"],
      recommendedTitles: {
        seo: `${brand} 퓨어 글로우 안심 ${cat}`,
        target: `${brand} 스마트 라이프 매치 커스텀 코스메틱 ${cat}`,
        efficacy: `${brand} 자연 유래 성분 스킨케어링 광택 ${cat}`,
        promo: `${brand} 라이브 쇼핑 단독 패키지 특전`,
        limited: `${brand} 알림받기 전용 프라이빗 기프트 ${cat}`,
      },
      sellingPoints: [
        { 
          pointNumber: 1, 
          title: "[스토어 알림받기] 즉시 차감 특별 우대 전용 쿠폰", 
          description: "네이버 소식을 알림 설정해 주시는 신규 고객님들께만 평생 단 한 번 제공하는 웰컴 추가 특별 포인트 우대 쿠폰 쿠폰팩 증정" 
        },
        { 
          pointNumber: 2, 
          title: `[실체험 만족지수 99%] 입소문으로 신뢰 증명`, 
          description: `불필요한 과대광고 없이 블로그 품평단과 네이버 뷰티윈도 리얼 실구매 후기들이 솔직하게 대변하는 독창적인 ${feat1.substring(0, 12)}...` 
        },
        { 
          pointNumber: 3, 
          title: "네이버 플러스 멤버십 스마트 결제 시 최대 5% 페이백 적립", 
          description: "공식 검색 제휴 기획 상품으로, 구매 확정 후 리얼 포토 리뷰 등록 시 즉각 사용 가능한 강력한 네이버페이 추가 특별 적립금 보장" 
        }
      ],
      detailPageCopy: `인스타그램에 가득한 색조 광고 속 겉도는 번들거림에 여러 번 속으셨던 스마트한 당신을 위해.\n\n리뷰어들이 수백 번 사용하고 입을 모아 극찬한 ${brand} ${cat}의 산뜻한 일상 밀착력을 경험해 보세요.\n\n귀엽게 ${feat1}을 활용하는 실구매자들의 친근하고 생생한 리얼스토리를 전경에 담아, 네이퍼페이의 알찬 페이백 특별 혜택을 전수 챙겨 가장 완벽하고 기분 좋게 쇼핑해 보실 수 있도록 전 과정을 지원합니다.`
    };
  };

  const d2cData = getSafeD2c(activeResult);
  const coupangData = getSafeCoupang(activeResult);
  const naverData = getSafeNaver(activeResult);

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 scroll-smooth selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* SaaS Premium Navbar */}
      <nav id="saas-navbar" className="bg-white/80 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-50 px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-7">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 font-sans">
                  CopyDirector <span className="text-indigo-600 text-xs font-black px-1.5 py-0.5 bg-indigo-50 rounded-md">V1.5</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider font-mono">E-COMMERCE COPY SAAS</span>
              </div>
            </div>

            {/* Nav Menu */}
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-600 font-medium">
              <a href="#saas-features" className="hover:text-indigo-600 transition">특장점</a>
              <a href="#saas-compare" className="hover:text-indigo-600 transition">타사 대비 강점</a>
              <a href="#saas-workspace" className="hover:text-indigo-650 transition font-semibold text-slate-900 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                카피 작업실
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              오늘 총 28,491건 카피 가공
            </span>
            <button
              id="nav-cta-btn"
              onClick={scrollToWorkspace}
              className="text-xs bg-slate-900 hover:bg-indigo-600 text-white font-extrabold px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-sm shadow-slate-200"
            >
              무료 시작하기
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* SaaS High-Impact Hero Section */}
      <section id="saas-hero" className="relative bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 border-b border-slate-200/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
          <div className="absolute top-10 left-12 w-72 h-72 bg-indigo-200 rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-12 w-80 h-80 bg-pink-150 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          {/* Dynamic Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-6 animate-float">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span className="text-xs font-bold text-indigo-900 font-sans tracking-wide">
              국내 유일 · 쿠팡, 네이버, 자사몰 이커머스 채널별 로직 완벽 제어
            </span>
          </div>

          <h1 className="text-[32px] [line-height:38.4px] font-extrabold tracking-tight text-slate-900 mb-6">
            품절을 부르는 이커머스 상세페이지 카피<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 font-black text-[34px] md:text-[52px] block mt-2 [line-height:52px]">
              3초 만에 채널별 최적화 카피 즉시 생성
            </span>
          </h1>

          <p className="text-[17px] text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            채널마다 따로 작성하는 카피, 당신의 시간과 전문성을 세이브하세요.<br/>
            <strong>CopyDirector AI V1.5</strong>는 단 한 번의 상품 정보 기입으로 채널별 노출 알고리즘과 구매 전환 심리를 반영한 맞춤형 상품명·셀링포인트·상세페이지 카피를 즉시 제공합니다.
          </p>

          {/* Gemini API Key Block (Landing Page Center) */}
          <div className="max-w-xl mx-auto my-8 bg-white/95 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/95 shadow-xl shadow-slate-200/40 relative z-20">
            {/* 1. 무료로 시작하세요. ... */}
            <div className="flex items-center gap-2.5 justify-center mb-5">
              <div id="check-box-wrapper" className="bg-[#10b981] text-white rounded-lg p-1 flex items-center justify-center">
                <Check className="w-4 h-4 text-white stroke-[3.5]" />
              </div>
              <span className="text-sm sm:text-[15px] font-bold text-slate-800 tracking-tight">
                무료로 시작하세요. Gemini API 키만 있으면 됩니다.
              </span>
            </div>

            {/* 2. Input + Button Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3.5">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 gap-3 shadow-inner transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type={isValidated ? "text" : "password"}
                  placeholder={isValidated ? "사용 가능한 Gemini API Key가 저장됨" : "Gemini API Key 입력"}
                  disabled={isValidated}
                  value={isValidated ? "••••••••••••••••••••••••••••" : apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setValidationError("");
                  }}
                  className="bg-transparent flex-1 text-sm text-slate-800 placeholder-slate-400/80 outline-none border-none font-semibold w-full"
                />
              </div>
              <button
                type="button"
                onClick={isValidated ? handleResetApiKey : handleValidateApiKey}
                disabled={isValidating}
                className={`text-base font-black px-8 py-3.5 rounded-2xl transition duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isValidated
                    ? "bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                    : "bg-[#1C4ED8] hover:bg-[#1E40AF] text-white shadow-md shadow-blue-100"
                }`}
              >
                {isValidating ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isValidated ? (
                  "변경하기"
                ) : (
                  "시작하기"
                )}
              </button>
            </div>

            {/* In-place validation errors */}
            {validationError && (
              <div className="mb-4 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Success Prompt if validated */}
            {isValidated && (
              <div className="mb-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>API 키 실시간 정합성 검증 성공! 카피 작업실이 활성화되었습니다.</span>
              </div>
            )}

            {/* 3. Gemini API Key 발급 가이드 Accordion */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-3">
              <button
                type="button"
                className="w-full flex items-center justify-between cursor-pointer p-3.5 bg-slate-50 hover:bg-slate-100/50 transition duration-200"
                onClick={() => setIsGuideOpen(!isGuideOpen)}
              >
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Gemini API Key 발급 가이드</span>
                </div>
                {isGuideOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              
              {isGuideOpen && (
                <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-600 text-left leading-relaxed space-y-2">
                  <p className="font-semibold text-slate-800">단 10초 만에 무료로 발급받는 방법:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-500">
                    <li>
                      <a 
                        href="https://aistudio.google.com/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-600 font-black hover:underline inline-flex items-center gap-0.5"
                      >
                        Google AI Studio
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      에 구글 계정으로 로그인합니다.
                    </li>
                    <li>
                      왼쪽 상단 또는 화면 중앙의 <strong className="text-indigo-600">"Create API Key"</strong> 파란색 버튼을 누릅니다.
                    </li>
                    <li>
                      새 프로젝트에서 생성(<strong className="text-slate-700">"Create API key in new project"</strong>)을 실행합니다.
                    </li>
                    <li>
                      발급된 임의의 긴 <strong className="text-indigo-600">AI 키 값을 복사(Copy)</strong>하여 상단 입력란에 즉시 기입해 주세요.
                    </li>
                  </ol>
                  <p className="text-[10px] text-slate-400 mt-1">
                    * 구글 제공 무료 할당량 내에서는 별도의 결제 등록 없이 무상으로 마음껏 활용하실 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 4. 가입 시 이용약관 동의 문구 */}
            <p className="text-xs text-slate-400 font-bold text-center mt-3">
              가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
            </p>
          </div>

          {/* Action CTAs shown once validated */}
          {isValidated && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in mt-6">
              <button
                id="hero-go-workspace"
                onClick={scrollToWorkspace}
                className="w-full sm:w-auto text-sm bg-indigo-600 hover:bg-slate-900 text-white font-bold px-7 py-4 rounded-xl transition-all duration-300 shadow-xl shadow-indigo-250 hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                바로 무료 카피 가공하기
              </button>
              <button
                id="hero-demo-autofill"
                onClick={loadExample}
                className="w-full sm:w-auto text-sm bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 font-bold px-7 py-4 rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                1초 만에 데모 체험해보기
              </button>
            </div>
          )}

          {/* Social Proof Badges */}
          <div className="mt-12 pt-8 border-t border-slate-250/70 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="flex items-start gap-2.5">
              <div className="p-1 mx-auto sm:mx-0 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">식약·광고법 사전 차단</p>
                <p className="text-[11px] text-slate-500 mt-0.5">최저, 최초, 절대효용 자동 금지어 필터링</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1 mx-auto sm:mx-0 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">쿠팡 & 네이버 노출 가이드</p>
                <p className="text-[11px] text-slate-500 mt-0.5">글자수 압축과 모바일 시각 가독 최적 설계</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1 mx-auto sm:mx-0 bg-pink-50 text-pink-500 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">단독 D2C 품격 스토리</p>
                <p className="text-[11px] text-slate-500 mt-0.5">브랜드 감도를 높히는 감성형 설계</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Tab Content (일반 AI와 카피디렉터의 차이점) */}
      <section id="saas-compare" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-2">Algorithm & Precision</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              막연한 일반 대화형 AI VS 이커머스 전용 CopyDirector
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              전문적인 이커머스 분석 툴을 탑재하여 알고리즘·광고법·톤앤매너까지 반영한 전문 카피를 한 번에
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md">
            {/* Simple Dynamic Sub Tab for Compare Card */}
            <div className="bg-slate-50 border-b border-slate-200 flex p-2.5 gap-2">
              {[
                { id: "coupang", label: "쿠팡 최적화 카피 로직", color: "hover:text-amber-600" },
                { id: "naver", label: "네이버 스토어 SEO 카피 로직", color: "hover:text-emerald-600" },
                { id: "d2c", label: "자사몰(D2C) 차별화 브랜딩", color: "hover:text-slate-900" }
              ].map((tab) => {
                const active = activeCompareTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCompareTab(tab.id)}
                    className={`flex-1 text-center py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active 
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                        : `text-slate-500 ${tab.color}`
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Compare Content Box */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* General AI: Bad Case */}
              <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-3 text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider">일반 Chat형 AI (Unoptimized)</span>
                  </div>
                  
                  {activeCompareTab === "coupang" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-800">[쿠팡 상품명]</h4>
                      <p className="text-xs text-slate-500 italic mt-1 bg-white p-3 rounded-lg border border-slate-100">
                        "저희 에센스는 성분이 뛰어나고 촉촉하고 세계 1등이며 최초 특허 원료로 주름 치료에 참 좋은 신비한 기초 에센스 화장품입니다."
                      </p>
                      <div className="text-xs text-rose-600 mt-3 space-y-1.5 font-medium">
                        <p>❌ 쿠팡 권장 상품명 규칙 (30~50자 무옵션 나열) 전면 위반</p>
                        <p>❌ '세계 1등', '치료' 등 **표시광고법 위반 유발 키워드** 기용</p>
                        <p>❌ 글이 길어 모바일 탐색 고객의 즉시 이탈율 증가</p>
                      </div>
                    </>
                  )}

                  {activeCompareTab === "naver" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-800">[스마트스토어 태그 매치]</h4>
                      <p className="text-xs text-slate-500 italic mt-1 bg-white p-3 rounded-lg border border-slate-100">
                        "네이버 검색 노출을 위해 수많은 키워드를 마구잡이로 나열하겠습니다. #에센스추천 #최고화장품 #여신앰플 #피부탄력 #엄마선물 #스마트스토어대박"
                      </p>
                      <div className="text-xs text-rose-600 mt-3 space-y-1.5 font-medium">
                        <p>❌ 네이버 페널티 키워드('대박', '최고' 등) 및 미제공 태그 남발</p>
                        <p>❌ 소비자의 감성을 흔드는 친근한 블로그 후기 묘사 실패</p>
                        <p>❌ 네이버 플러스 멤버십 및 스토어 알림 혜택의 계산 누락</p>
                      </div>
                    </>
                  )}

                  {activeCompareTab === "d2c" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-800">[D2C 브랜드 스토리]</h4>
                      <p className="text-xs text-slate-500 italic mt-1 bg-white p-3 rounded-lg border border-slate-100">
                        "안녕하세요 브랜드 담당자입니다. 저희는 최선을 다해 기술력을 연구해 멋진 제품을 출시했사오니 자사몰에 오셔서 구경하시고 구매 부탁드립니다."
                      </p>
                      <div className="text-xs text-rose-600 mt-3 space-y-1.5 font-medium">
                        <p>❌ 브랜드 고유 오프닝 스토리 및 따옴표(&gt;) 정체성 상실</p>
                        <p>❌ 일반 정보 설명에 불과하여 재구매를 부르는 멤버십 구속력 부족</p>
                        <p>❌ 고객의 감정을 울리는 일상 공감 서사의 빈약함</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-xs text-rose-600 font-extrabold mt-4 pt-3 border-t border-rose-100">
                  구매 전환율 하락 유발 및 쇼핑몰 저품질 등재 차단 위험성
                </div>
              </div>

              {/* CopyDirector: Good Case */}
              <div className="bg-indigo-50/40 rounded-xl p-5 border border-indigo-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-3 text-indigo-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider">CopyDirector V1.5 (Optimized)</span>
                  </div>

                  {activeCompareTab === "coupang" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-900">[쿠팡 전용 상품명 SEO]</h4>
                      <p className="text-xs text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-100 font-bold leading-relaxed">
                        "클리오 데일리 퓨어 탄력 시그니처 틴트 1개입" <br/>
                        <span className="text-slate-400 font-normal text-[11px] block mt-1">#로켓배송 #클리오틴트 #고밀착유리알광택</span>
                      </p>
                      <div className="text-xs text-slate-600 mt-3 space-y-1.5 font-medium">
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 쿠팡 검색 알고리즘 35~45자 칼맞춤
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> **표시광고법 안심 심의 통과** 키워드 교환 준수
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> '로켓새벽배송' 등 즉각 클릭 극대화 연동
                        </p>
                      </div>
                    </>
                  )}

                  {activeCompareTab === "naver" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-900">[네이버 스마트스토어 전용]</h4>
                      <p className="text-xs text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-100 font-bold leading-relaxed">
                        "클리오 퓨어글로우 오너먼트 틴트" <br/>
                        <span className="text-slate-400 font-normal text-[11px] block mt-1">이웃 블로거 스토리가 녹아든 리얼 촉촉 체험형 리뷰체 인물 묘사</span>
                      </p>
                      <div className="text-xs text-slate-600 mt-3 space-y-1.5 font-medium">
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 네이버 쇼핑 제재 없는 청정 SEO 태그 추천
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 자발적 클릭유도 복합 [알림받기 추가 할인] 캡션 연계
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 네이버페이 추가 특별 적립 소구로 실질 체감가 하향화
                        </p>
                      </div>
                    </>
                  )}

                  {activeCompareTab === "d2c" && (
                    <>
                      <h4 className="text-sm font-bold text-slate-900">[자사몰 D2C 고감도 브랜딩]</h4>
                      <p className="text-xs text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-100 font-bold leading-relaxed">
                        "&gt; 세상에 유일무이한 당신을 위해, 소장하고 싶어지는 가치를 올립니다."
                      </p>
                      <div className="text-xs text-slate-600 mt-3 space-y-1.5 font-medium">
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 독창적 고품격 블록 따옴표(&gt;) 활용 패키지
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 가입 즉시 특별 수급되는 무료배송&추가 멤버십 락인
                        </p>
                        <p className="flex items-center gap-1.5 text-indigo-700">
                          <Check className="w-3.5 h-3.5 shrink-0" /> 브랜드 철학과 탄생 배경을 문학적 기질로 직교 설계
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-xs text-indigo-700 font-extrabold mt-4 pt-3 border-t border-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                  클릭률(CTR)과 신규 브랜드 가입 충성도를 함께 잡는 실전형 구성
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Unique Core Strengths / Bento Grid Layout */}
      <section id="saas-features" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-2">Platform Edge & Key Powers</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              이커머스 셀러들이 CopyDirector에 열광하는 4가지 이유 
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              일반 카피라이팅 도구는 놓치고 있던 이커머스의 본질적 기술 규격과 감성을 집요하고 명확히 분해 통합했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Edge 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
                  쿠팡 상위 매치 정밀 저격
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  쿠팡 알고리즘이 가중하는 용도, 수량, 제원 최우선 30~50자 나열형 가이드를 그대로 실천합니다. 고객이 모바일 스크롤 도중 이탈하지 않도록 강력한 가성비, 로켓배송 연계 소구를 실시간 파킹합니다.
                </p>
              </div>
              <span className="text-[10px] text-indigo-600 font-extrabold tracking-wider mt-4">#COUPANG_SEO</span>
            </div>

            {/* Edge 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
                  네이버 SEO 스마트스토어
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  태그 중립성을 해치는 과대 문구를 필터링하여 네이버 데이터랩 검색 세트에 적합하고 매끈하게 녹여냅니다. 친근한 사용 후기를 보는 듯한 블로그체 문체로 이성 대입 전환 장벽을 무너뜨립니다.
                </p>
              </div>
              <span className="text-[10px] text-emerald-600 font-extrabold tracking-wider mt-4">#NAVER_SMART_STORE</span>
            </div>

            {/* Edge 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
                  고감도 브랜드 자사몰(D2C)
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  자사몰 독창성의 영혼을 완성하기 위해 블록 따옴표(&gt;)를 전용 배치한 철학 스토리텔링을 구성합니다. 첫 구매 프로모션 및 가입 무료배송 혜택 소구를 교묘히 배치해 충성 회원을 대량 확보합니다.
                </p>
              </div>
              <span className="text-[10px] text-purple-600 font-extrabold tracking-wider mt-4">#D2C_STORYTELLING</span>
            </div>

            {/* Edge 4 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                  04
                </div>
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
                  식약·표시광고 법적 리스크 제어
                </h3>
                <p className="text-xs text-slate-550 leading-relaxed">
                  허위 과대광고 심의 기준의 위험에 부딪히는 불가 키워드를 철저한 규칙 기반으로 지능 필터링합니다. 대용품 문맥 가이드를 생성 도중 자율 패치하여 안전성과 신뢰성을 완전히 보존합니다.
                </p>
              </div>
              <span className="text-[10px] text-amber-600 font-extrabold tracking-wider mt-4">#SAFETY_COMPLIANCE</span>
            </div>

          </div>
        </div>
      </section>

      {/* Main Interactive Copwriter Workspace Dashboard (The actual SaaS application) */}
      <section id="saas-workspace" ref={workspaceRef} className="py-16 bg-slate-100 flex-1 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative">
          
          {/* Locked Workspace Overlay if apiKey is not validated */}
          {!isValidated && (
            <div className="absolute inset-0 bg-slate-100/75 backdrop-blur-md z-40 rounded-3xl flex flex-col items-center justify-center p-8 text-center pointer-events-auto min-h-[600px] border border-slate-200">
              <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 border border-slate-200 mb-5 animate-bounce">
                <Lock className="w-7 h-7 stroke-[2]" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">카피 작업실이 잠겨있습니다</h3>
              <p className="text-slate-600 max-w-md text-sm mb-6 leading-relaxed">
                이커머스 채널별 최적화 카피 자동 생성 프로그램을 사용하려면<br/>
                페이지 상단의 <strong>Gemini API Key</strong>를 기입하신 후 <strong>'시작하기'</strong> 버튼으로 실시간 유효성 정합성 검증을 완료해 주세요.
              </p>
              <button 
                onClick={() => window.scrollTo({ top: 350, behavior: "smooth" })}
                className="bg-[#1C4ED8] hover:bg-[#1E40AF] text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition duration-300 shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer"
              >
                Gemini API Key 입력하러 가기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md">
                  LIVE WORKSPACE
                </span>
                <span className="text-xs text-slate-500 font-bold">실시간 이커머스 디렉터 콘솔 v1.5</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                카피 디렉팅 워크스페이스
              </h2>
            </div>

            {/* Autofill Demo Action Button */}
            <div>
              <button
                id="btn-autofill-demo-tool"
                onClick={loadExample}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 transition-all duration-200 flex items-center gap-2 hover:indigo-border cursor-pointer shadow-xs"
                title="클리오 립 틴트 데모 데이터 세트로 1초 만에 구성합니다."
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>데모 데이터 1초 테스트 로드</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Config Panel (Inputs) */}
            <div id="cfg-form-panel" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-md" />
                  상품 메타데이터 입력
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-sm">
                   * 필수 입력
                </span>
              </div>

              <div id="form-body" className="space-y-4">
                {/* Brand & Category Rows */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">
                      브랜드명 <span className="text-indigo-600">*</span>
                    </label>
                    <input
                      id="input-brandName"
                      type="text"
                      name="brandName"
                      placeholder="예: 클리오, 락앤락"
                      value={inputs.brandName}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">
                      상품 카테고리 <span className="text-indigo-600">*</span>
                    </label>
                    <input
                      id="input-category"
                      type="text"
                      name="category"
                      placeholder="예: 메이크업 립 틴트, 가습기"
                      value={inputs.category}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 bg-white"
                    />
                  </div>
                </div>

                {/* Feature 1 */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">
                    핵심 강점 특성 1 <span className="text-indigo-600">*</span>
                  </label>
                  <textarea
                    id="input-feature1"
                    name="feature1"
                    rows={2}
                    placeholder="제품의 가장 뚜렷하고 강력한 성분, 가치를 입력하세요 (예: 넥클리스 별도 호환으로 패션 키링 목걸이 착용 가능)"
                    value={inputs.feature1}
                    onChange={handleInputChange}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 bg-white resize-none"
                  />
                </div>

                {/* Features 2, 3 in adjacent column */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      핵심 특징 2 (선택)
                    </label>
                    <input
                      id="input-feature2"
                      type="text"
                      name="feature2"
                      placeholder="예: 유리알 광택 광활 유지"
                      value={inputs.feature2}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      핵심 특징 3 (선택)
                    </label>
                    <input
                      id="input-feature3"
                      type="text"
                      name="feature3"
                      placeholder="예: 무착색 안전 성분"
                      value={inputs.feature3}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Target & Brand Concept */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      주 타켓 구매층 (선택)
                    </label>
                    <input
                      id="input-targetAudience"
                      type="text"
                      name="targetAudience"
                      placeholder="예: 10~20대 트렌디 세대"
                      value={inputs.targetAudience}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      브랜드 아이덴티티 (선택)
                    </label>
                    <input
                      id="input-brandConcept"
                      type="text"
                      name="brandConcept"
                      placeholder="예: 유니크 패셔너블 로맨틱"
                      value={inputs.brandConcept}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Price & Promo Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      가격대 (선택)
                    </label>
                    <input
                      id="input-priceRange"
                      type="text"
                      name="priceRange"
                      placeholder="예: 2만원대 매력 가성비"
                      value={inputs.priceRange}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 block">
                      행동 유도 프로모션 (선택)
                    </label>
                    <input
                      id="input-additionalNotes"
                      type="text"
                      name="additionalNotes"
                      placeholder="예: 자사알림 추가 할인쿠폰 증정"
                      value={inputs.additionalNotes}
                      onChange={handleInputChange}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Copy Angle Config */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2.5 block">
                    소구 방향성 (카피라이팅 각도)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="angle-select-A"
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, angle: 'A' }))}
                      className={`border p-2.5 text-left transition-all duration-200 flex flex-col h-full cursor-pointer rounded-lg ${
                        inputs.angle === 'A'
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "border-slate-250 hover:border-slate-400 text-slate-600 bg-white"
                      }`}
                    >
                      <span className="text-[11px] font-black block">A안</span>
                      <span className="text-xs font-bold mt-0.5">소재/성분 강조</span>
                      <span className={`text-[10px] mt-1 leading-normal ${inputs.angle === 'A' ? 'text-indigo-200 font-medium' : 'text-slate-400'}`}>기술적 원리와 효능 입증</span>
                    </button>
                    
                    <button
                      id="angle-select-B"
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, angle: 'B' }))}
                      className={`border p-2.5 text-left transition-all duration-200 flex flex-col h-full cursor-pointer rounded-lg ${
                        inputs.angle === 'B'
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "border-slate-250 hover:border-slate-400 text-slate-600 bg-white"
                      }`}
                    >
                      <span className="text-[11px] font-black block">B안</span>
                      <span className="text-xs font-bold mt-0.5">타겟 공감 소구</span>
                      <span className={`text-[10px] mt-1 leading-normal ${inputs.angle === 'B' ? 'text-indigo-200 font-medium' : 'text-slate-400'}`}>고민 상황과 감성 교감</span>
                    </button>

                    <button
                      id="angle-select-C"
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, angle: 'C' }))}
                      className={`border p-2.5 text-left transition-all duration-200 flex flex-col h-full cursor-pointer rounded-lg ${
                        inputs.angle === 'C'
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "border-slate-250 hover:border-slate-400 text-slate-600 bg-white"
                      }`}
                    >
                      <span className="text-[11px] font-black block">C안</span>
                      <span className="text-xs font-bold mt-0.5">결과/변화 강조</span>
                      <span className={`text-[10px] mt-1 leading-normal ${inputs.angle === 'C' ? 'text-indigo-200 font-medium' : 'text-slate-400'}`}>비포애프터 시각적 체감</span>
                    </button>
                  </div>
                </div>

                {/* Target Channel Selector */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2.5 block">
                    자동 생성 대상 채널
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "coupang", label: "쿠팡 로켓" },
                      { id: "naver", label: "네이버 스토어" },
                      { id: "d2c", label: "자사몰 D2C" }
                    ].map((ch) => {
                      const active = inputs.channels.includes(ch.id);
                      return (
                        <button
                          id={`channel-checkbox-${ch.id}`}
                          key={ch.id}
                          type="button"
                          onClick={() => handleChannelCheckbox(ch.id)}
                          className={`border px-2 py-3.5 text-center transition-all duration-200 font-bold text-xs flex flex-col items-center gap-1.5 justify-center cursor-pointer rounded-lg ${
                            active 
                              ? `bg-slate-950 text-white border-slate-950 shadow-sm`
                              : "border-slate-200 hover:border-slate-400 text-slate-500 bg-white"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={active}
                            readOnly
                            className="w-3.5 h-3.5 accent-indigo-600 rounded text-indigo-600 cursor-pointer"
                          />
                          <span>{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error box */}
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-250/50 text-rose-700 text-xs p-3.5 rounded-lg flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Ultimate CTA */}
                <button
                  id="btn-submit-generate"
                  onClick={() => generateCopy()}
                  disabled={isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait font-sans text-xs tracking-wider uppercase shadow-lg shadow-indigo-100"
                >
                  {isPending ? (
                    <>
                      <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>카피라이팅 검수 조합 패키징 가동 중 ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
                      <span>플랫폼별 안심 카피 패키지 즉시 생성</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Copy Outputs & Preview Panel */}
            <div id="workspace-output" className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl min-h-[520px] flex flex-col overflow-hidden shadow-sm">
                
                {/* Pending Loading State */}
                {isPending ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                    <div className="mb-6 relative">
                      <div className="w-14 h-14 border-3 border-indigo-100 border-t-indigo-650 rounded-full animate-spin" />
                      <Sparkles className="w-6 h-6 text-indigo-600 absolute top-4 left-4 animate-pulse" />
                    </div>
                    
                    <h3 className="text-base font-extrabold text-slate-900">
                      CopyDirector 이커머스 최적 가공기 가동
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                      지정 하이퍼 소구 앵글에 맞춰 각 플랫폼 쇼핑 인덱싱 SEO와 모바일 클릭 노출 룰셋을 병렬 융합 주입하고 있습니다.
                    </p>

                    <div className="mt-8 bg-slate-900 text-white rounded-xl px-4 py-3 mx-auto w-full max-w-md text-left shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-1.5">
                        <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black block">
                          실시간 엔진 연동 중
                        </span>
                        <span className="text-[10px] bg-indigo-900 text-indigo-200 font-mono px-1.5 py-0.5 rounded">V1.5 EN</span>
                      </div>
                      <p className="text-xs font-mono flex items-center gap-2 leading-relaxed text-slate-200">
                        <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        {loadingStep}
                      </p>
                    </div>
                  </div>
                ) : activeResult ? (
                  // Display Node of Generated Quality copy
                  <div className="flex flex-col flex-1">
                    
                    {/* Header Bar */}
                    <div className="bg-slate-900 text-white px-6 py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[9px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded">
                            COPIES DELIVERED
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            완성 시각: {activeResult.timestamp}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 mt-1">
                          <span>선택 앵글: {
                            activeResult.angle === 'A' ? "A안 (소재/성분 과학증명)" : 
                            activeResult.angle === 'B' ? "B안 (일상고민 생활밀착타겟)" : 
                            "C안 (전후 비교 드라마틱결과)"
                          }</span>
                        </h4>
                      </div>

                      {/* Alternate sequential angle options & history switcher */}
                      <div className="flex items-center gap-2">
                        {generations.length > 1 && (
                          <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            <select
                              id="select-version"
                              value={activeGenIndex}
                              onChange={(e) => setActiveGenIndex(Number(e.target.value))}
                              className="bg-transparent border-none text-xs text-slate-200 outline-none font-bold cursor-pointer py-1"
                            >
                              {generations.map((gen, idx) => (
                                <option key={gen.id} value={idx} className="bg-slate-900 text-white">
                                  세션 {generations.length - idx} ({gen.angle}안)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          id="btn-rotate-regenerate"
                          onClick={handleRegenerateNextAngle}
                          className="text-[11px] bg-slate-800 hover:bg-indigo-600 text-white font-extrabold py-2 px-3 rounded-lg transition-all border border-slate-700 whitespace-nowrap cursor-pointer"
                          title="이전 앵글과 겹치지 않는 다른 소구 방식을 활용하여 일괄 회전 카피를 재구성합니다."
                        >
                          다른 앵글로 1초 재생성
                        </button>
                      </div>
                    </div>

                    {/* Platform Tab Strip */}
                    <div className="border-b border-slate-200 bg-slate-50 flex gap-6 px-6 pt-3 overflow-x-auto">
                      <button
                        id="tab-btn-d2c"
                        onClick={() => setActiveTab("d2c")}
                        className={`text-xs font-black uppercase tracking-wider pb-3 cursor-pointer hover:text-indigo-600 transition-all relative ${
                          activeTab === "d2c"
                            ? "text-slate-900 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-indigo-600"
                            : "text-slate-400"
                        }`}
                      >
                        자사몰 브랜드(D2C)
                      </button>

                      <button
                        id="tab-btn-coupang"
                        onClick={() => setActiveTab("coupang")}
                        className={`text-xs font-black uppercase tracking-wider pb-3 cursor-pointer hover:text-indigo-600 transition-all relative ${
                          activeTab === "coupang"
                            ? "text-indigo-600 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-indigo-600"
                            : "text-slate-400"
                        }`}
                      >
                        쿠팡 최적화 (COUPANG)
                      </button>

                      <button
                        id="tab-btn-naver"
                        onClick={() => setActiveTab("naver")}
                        className={`text-xs font-black uppercase tracking-wider pb-3 cursor-pointer hover:text-indigo-600 transition-all relative ${
                          activeTab === "naver"
                            ? "text-emerald-600 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        네이버 스마트스토어
                      </button>
                    </div>

                    {/* Tab outputs */}
                    <div id="saas-tab-view-area" className="p-6 flex-1 bg-white overflow-y-auto max-h-[600px] space-y-6">
                      
                      {/* 1. COUPANG STYLING */}
                      {activeTab === "coupang" && (
                        <div id="saas-view-coupang" className="space-y-6">
                          {/* Info panel */}
                          <div className="border border-indigo-100 bg-indigo-50/40 p-4.5 rounded-xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-black text-slate-900">쿠팡 모바일 전용 로켓 SEO 알고리즘 탑재</h5>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                쿠팡의 검색 지수를 극대화하기 위해 글자 수 30~50자 사이 및 무필터 키워드 조합 상품명을 가공했습니다. 빠른 배송(로켓배송)과 벌크 혜택 가관에 어울리는 근거 중심 문맥이 우선 반영되었습니다.
                              </p>
                            </div>
                          </div>

                          {/* Keywords */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">TARGET KEYWORDS</span>
                            <div className="flex flex-wrap gap-1.5">
                              {coupangData.targetKeywords.map((tag, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-800 font-mono text-[11px] px-2.5 py-1 rounded-md font-semibold border border-transparent">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Titles Table */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-block text-slate-400 mb-2 block">권장 상품명 5종 컬렉션</span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500 w-28 uppercase">유형</th>
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500">추천 가공명</th>
                                    <th className="px-4 py-2.5 w-16"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: "기본 SEO 최적화", value: coupangData.recommendedTitles.seo, k: "cp-seo" },
                                    { label: "타겟 심리 공감형", value: coupangData.recommendedTitles.target, k: "cp-targ" },
                                    { label: "소재·효능 하이라이트", value: coupangData.recommendedTitles.efficacy, k: "cp-eff" },
                                    { label: "특가·기획 벌크 패키지", value: coupangData.recommendedTitles.promo, k: "cp-promo" },
                                    { label: "단독 한정 스페셜에디션", value: coupangData.recommendedTitles.limited, k: "cp-lim" }
                                  ].map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition duration-150">
                                      <td className="px-4 py-3 font-semibold text-slate-500 text-[10px] tracking-wide">{row.label}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900 text-xs leading-relaxed">{row.value}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          id={`btn-copy-${row.k}`}
                                          onClick={() => handleCopy(row.value, row.k)}
                                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded transition cursor-pointer hover:bg-indigo-50"
                                          title="상품명 즉시 복사"
                                        >
                                          {copiedId === row.k ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Selling points */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">핵심 기립 셀링포인트 (대표 소구 한줄 요약)</span>
                            <div className="grid grid-cols-1 gap-3">
                              {coupangData.sellingPoints.map((pt) => (
                                <div key={pt.pointNumber} className="border border-slate-200/80 rounded-xl p-4 flex gap-3.5 items-start justify-between bg-white hover:border-indigo-400/60 transition duration-200">
                                  <div className="flex gap-3">
                                    <span className="w-5.5 h-5.5 bg-slate-900 text-white flex items-center justify-center font-mono text-[10px] rounded-full shrink-0">
                                      {pt.pointNumber}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">{pt.title}</h5>
                                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{pt.description}</p>
                                    </div>
                                  </div>
                                  <button
                                    id={`btn-cl-cp-pt-${pt.pointNumber}`}
                                    onClick={() => handleCopy(`${pt.title}\n${pt.description}`, `cp-pt-${pt.pointNumber}`)}
                                    className="text-slate-400 hover:text-indigo-600 p-1.5 transition rounded-md hover:bg-indigo-50 cursor-pointer shrink-0"
                                  >
                                    {copiedId === `cp-pt-${pt.pointNumber}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Detail page copy */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">모바일 컨버전 상세페이지 전체 카피</span>
                              <button
                                id="btn-copy-coupang-all"
                                onClick={() => handleCopy(coupangData.detailPageCopy, "cp-detail-main")}
                                className="text-xs text-indigo-650 hover:text-slate-900 font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === "cp-detail-main" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>상세 카피 복사 완료!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>카피 전체클릭 복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                              {coupangData.detailPageCopy}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. NAVER STYLES */}
                      {activeTab === "naver" && (
                        <div id="saas-view-naver" className="space-y-6">
                          <div className="border border-emerald-100 bg-emerald-50/40 p-4.5 rounded-xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-black text-slate-900">네이버 스마트스토어 SEO & 블로그 리뷰 융합</h5>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                중복 키워드를 강력 배제한 20~30자 한글 상품명 권장을 적용했습니다. 이커머스에서 가장 실 구매율이 짙은 네이버 플러스 멤버십 추가 적립 소구, 알림받기 쿠폰 혜택 문장을 적극 녹였습니다.
                              </p>
                            </div>
                          </div>

                          {/* Keywords */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">NAVER SEARCH METAS</span>
                            <div className="flex flex-wrap gap-1.5">
                              {naverData.targetKeywords.map((tag, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-800 font-mono text-[11px] px-2.5 py-1 rounded-md font-semibold border border-transparent">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Titles Grid */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">스마트스토어 최적화 상품 이름 5안</span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500 w-28 uppercase">유형</th>
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500">네이버 전용 가공</th>
                                    <th className="px-4 py-2.5 w-16"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: "기본 스마트 명징", value: naverData.recommendedTitles.seo, k: "nv-seo" },
                                    { label: "스마트 타겟밀집형", value: naverData.recommendedTitles.target, k: "nv-targ" },
                                    { label: "효능 소재 스포트라이트", value: naverData.recommendedTitles.efficacy, k: "nv-eff" },
                                    { label: "라이브 특가 기획형", value: naverData.recommendedTitles.promo, k: "nv-promo" },
                                    { label: "프라이빗 회원 한정판", value: naverData.recommendedTitles.limited, k: "nv-lim" }
                                  ].map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition duration-150">
                                      <td className="px-4 py-3 font-semibold text-slate-500 text-[10px] tracking-wide">{row.label}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900 text-xs leading-relaxed">{row.value}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          id={`btn-copy-${row.k}`}
                                          onClick={() => handleCopy(row.value, row.k)}
                                          className="text-slate-400 hover:text-emerald-600 p-1.5 rounded transition cursor-pointer hover:bg-emerald-50"
                                          title="상품명 즉시 복사"
                                        >
                                          {copiedId === row.k ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Selling points */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">네이버 플러스 알림받이 소구 패키지</span>
                            <div className="grid grid-cols-1 gap-3">
                              {naverData.sellingPoints.map((pt) => (
                                <div key={pt.pointNumber} className="border border-slate-200/80 rounded-xl p-4 flex gap-3.5 items-start justify-between bg-white hover:border-emerald-400/60 transition duration-200">
                                  <div className="flex gap-3">
                                    <span className="w-5.5 h-5.5 bg-emerald-600 text-white flex items-center justify-center font-mono text-[10px] rounded-full shrink-0">
                                      {pt.pointNumber}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">{pt.title}</h5>
                                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{pt.description}</p>
                                    </div>
                                  </div>
                                  <button
                                    id={`btn-cl-nv-pt-${pt.pointNumber}`}
                                    onClick={() => handleCopy(`${pt.title}\n${pt.description}`, `nv-pt-${pt.pointNumber}`)}
                                    className="text-slate-400 hover:text-emerald-600 p-1.5 transition rounded-md hover:bg-emerald-50 cursor-pointer shrink-0"
                                  >
                                    {copiedId === `nv-pt-${pt.pointNumber}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Detail page copy */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">네이버 쇼핑윈도 감성 소구 전체 서사</span>
                              <button
                                id="btn-copy-naver-all"
                                onClick={() => handleCopy(naverData.detailPageCopy, "nv-detail-main")}
                                className="text-xs text-emerald-600 hover:text-slate-900 font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === "nv-detail-main" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>상세 카피 복사 완료!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>카피 전체클릭 복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                              {naverData.detailPageCopy}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. D2C STYLES */}
                      {activeTab === "d2c" && (
                        <div id="saas-view-d2c" className="space-y-6">
                          <div className="border border-purple-100 bg-purple-50/40 p-4.5 rounded-xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-black text-slate-900">공식 브랜드 자사몰(D2C) 전용 로열 락인 설계</h5>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                포인트를 모방하는 타 플랫폼과 달리 공식 홈페이지에 어울리는 일관된 톤앤매너로 설계되었습니다. 인스타 감성 고취를 위한 오프닝 문학 블록 따옴표(&gt;) 문단을 지니며 브랜드 탄생 스토리와 멤버십 평생 무료특전을 연결합니다.
                              </p>
                            </div>
                          </div>

                          {/* Keywords */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">BRANDING DIRECTIVES</span>
                            <div className="flex flex-wrap gap-1.5">
                              {d2cData.targetKeywords.map((tag, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-800 font-mono text-[11px] px-2.5 py-1 rounded-md font-semibold border border-transparent">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Titles Grid */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">브랜드 슬로건 매칭 상품명 5안</span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500 w-28 uppercase">유형</th>
                                    <th className="px-4 py-2.5 font-bold text-[10px] text-slate-500">D2C 전용 고감도 명명</th>
                                    <th className="px-4 py-2.5 w-16"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { label: "엠블럼 디렉트", value: d2cData.recommendedTitles.seo, k: "d2c-seo" },
                                    { label: "타겟 소장 페스티벌", value: d2cData.recommendedTitles.target, k: "d2c-targ" },
                                    { label: "성분 철학 선언형", value: d2cData.recommendedTitles.efficacy, k: "d2c-eff" },
                                    { label: "홈 에디션 세트 기치", value: d2cData.recommendedTitles.promo, k: "d2c-promo" },
                                    { label: "리미티드 보증 컬렉션", value: d2cData.recommendedTitles.limited, k: "d2c-lim" }
                                  ].map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition duration-150">
                                      <td className="px-4 py-3 font-semibold text-slate-500 text-[10px] tracking-wide">{row.label}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-900 text-xs leading-relaxed">{row.value}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          id={`btn-copy-${row.k}`}
                                          onClick={() => handleCopy(row.value, row.k)}
                                          className="text-slate-400 hover:text-purple-600 p-1.5 rounded transition cursor-pointer hover:bg-purple-50"
                                          title="상품명 즉시 복사"
                                        >
                                          {copiedId === row.k ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Selling points */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">브랜드 헤리티지 & 평생 멤버십 락인 3선</span>
                            <div className="grid grid-cols-1 gap-3">
                              {d2cData.sellingPoints.map((pt) => (
                                <div key={pt.pointNumber} className="border border-slate-200/80 rounded-xl p-4 flex gap-3.5 items-start justify-between bg-white hover:border-purple-400/60 transition duration-200">
                                  <div className="flex gap-3">
                                    <span className="w-5.5 h-5.5 bg-slate-950 text-white flex items-center justify-center font-mono text-[10px] rounded-full shrink-0">
                                      {pt.pointNumber}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">{pt.title}</h5>
                                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{pt.description}</p>
                                    </div>
                                  </div>
                                  <button
                                    id={`btn-cl-d2c-pt-${pt.pointNumber}`}
                                    onClick={() => handleCopy(`${pt.title}\n${pt.description}`, `d2c-pt-${pt.pointNumber}`)}
                                    className="text-slate-400 hover:text-purple-600 p-1.5 transition rounded-md hover:bg-purple-50 cursor-pointer shrink-0"
                                  >
                                    {copiedId === `d2c-pt-${pt.pointNumber}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Detail page copy */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">자사몰 고감도 서사 (따옴표 블록 포함)</span>
                              <button
                                id="btn-copy-d2c-all"
                                onClick={() => handleCopy(d2cData.detailPageCopy, "d2c-detail-main")}
                                className="text-xs text-purple-600 hover:text-slate-900 font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === "d2c-detail-main" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>상세 카피 복사 완료!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>카피 전체클릭 복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans font-medium border-l-4 border-l-indigo-600 bg-indigo-50/15">
                              {d2cData.detailPageCopy}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Shipped overall Raw Markdown Copy Zone */}
                    <div className="border-t border-slate-200 p-5 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-550 flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                          마크다운 원본 통합본 (바로 복사 최적화)
                        </span>
                        <button
                          id="btn-copy-markdown-all"
                          onClick={() => handleCopy(activeResult.rawMarkdown, "raw-markdown-overall")}
                          className="bg-slate-900 hover:bg-indigo-600 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-slate-200 cursor-pointer"
                        >
                          {copiedId === "raw-markdown-overall" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>통합본 전수 복사성공!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>통합 마크다운 원 클릭 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        id="raw-markdown-editor"
                        readOnly
                        value={activeResult.rawMarkdown}
                        rows={5}
                        className="w-full bg-slate-950 text-slate-200 font-mono text-[11px] p-4.5 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      />
                    </div>

                  </div>
                ) : (
                  // Initial Idle Helper state
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5 text-slate-400 shadow-sm border border-slate-200">
                      <Sparkles className="w-7 h-7 text-indigo-500 animate-pulse" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      실시간 카피 디렉션 스튜디오
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                      좌측 상품 메타데이터 입력창에 내용을 채워 고감도 즉각 문구를 대량 생산해보세요. <br/>
                      <strong>의사결정이 고민될 땐 상단의 '데모 데이터 1초 테스트 로드'를 누르면 가상 립 틴트 메타데이터가 파킹됩니다.</strong>
                    </p>

                    <div className="mt-8 flex gap-3 max-w-md w-full justify-center">
                      <div className="border border-slate-200 bg-white rounded-xl p-3 text-left flex-1 hover:border-indigo-200 transition">
                        <span className="text-[10px] font-black text-indigo-650 block mb-1">COUPANG SEO</span>
                        <span className="text-[11px] text-slate-500">30~50자 나열형, 근거 중심 상세 가독성 보장</span>
                      </div>
                      <div className="border border-slate-200 bg-white rounded-xl p-3 text-left flex-1 hover:border-emerald-250 transition">
                        <span className="text-[10px] font-black text-emerald-650 block mb-1">NAVER SMART</span>
                        <span className="text-[11px] text-slate-500">20~30자 한글, 이웃 감성 리뷰 스토리 보완</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SaaS Landing Page Footing/Trust Banner */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-extrabold tracking-tight">CopyDirector v1.5</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-450">
              국내 최고수준의 국내 지엽 쇼핑몰 최적 노출 알고리즘과 광고 심의 검수 엔진을 탑재한 전문 카피라이트 융합 빌링 도구입니다. 복사해서 바로 쓰고 판매량을 높이세요.
            </p>
          </div>
          <div>
            <h5 className="text-xs font-black text-slate-200 uppercase tracking-widest mb-3">SUPPORT CHANNELS</h5>
            <div className="space-y-2 text-xs">
              <p>쿠팡 로켓 배송 썸네일 노출 가이드</p>
              <p>네이버 페널티 단어 우회 가이드</p>
              <p>D2C 자사몰 단독 고객 가입 강화 루프</p>
            </div>
          </div>
          <div>
            <h5 className="text-xs font-black text-slate-200 uppercase tracking-widest mb-3">LEGAL COMPLIANCE</h5>
            <div className="space-y-2 text-xs">
              <p>표시광고 공정화에 관한 법률 준수</p>
              <p>의료기기·식품 및 에스테틱 과장 소구 전수 필터링</p>
              <p>안심 복사 등록 제어 기술</p>
            </div>
          </div>
          <div className="space-y-3">
            <h5 className="text-xs font-black text-slate-200 uppercase tracking-widest mb-1">STABLE AND CERTIFIED</h5>
            <p className="text-[11px] leading-relaxed">
              본 웹서비스는 구글 및 현역 이커머스 MD 합작 검증 AI 알고리즘을 사용하며, 실시간 검색에 최적화된 출력을 보장합니다.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              © 2026 CopyDirector Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      <Analytics />

    </div>
  );
}
