/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InputParams {
  brandName: string;
  category: string;
  feature1: string;
  feature2: string;
  feature3: string;
  targetAudience: string;
  brandConcept: string;
  priceRange: string;
  additionalNotes: string;
  angle: 'A' | 'B' | 'C';
  channels: string[]; // ['coupang', 'naver', 'd2c']
}

export interface ChannelOutput {
  channelName: 'coupang' | 'naver' | 'd2c';
  channelLabel: string; // "쿠팡" | "네이버 스마트스토어" | "자사몰(D2C)"
  angle: 'A' | 'B' | 'C';
  angleLabel: string; // "A. 소재/성분 강조형" | "B. 타겟 공감형" | "C. 결과/변화 강조형"
  targetKeywords: string[];
  recommendedTitles: {
    seo: string;      // SEO/기본형
    target: string;   // 타겟 소구형
    efficacy: string; // 효능·소재 강조형
    promo: string;    // 프로모션·기획형
    limited: string;  // 한정·단독형
  };
  sellingPoints: {
    pointNumber: number;
    title: string;
    description: string;
  }[];
  detailPageCopy: string; // 상세페이지 카피 (줄바꿈 포함)
}

export interface GenerationResult {
  id: string;
  timestamp: string;
  angle: 'A' | 'B' | 'C';
  inputs: InputParams;
  coupang?: ChannelOutput;
  naver?: ChannelOutput;
  d2c?: ChannelOutput;
  rawMarkdown: string; // 전체 패키지 원본 마크다운 텍스트 (사용자 요청 포맷 그대로)
}
