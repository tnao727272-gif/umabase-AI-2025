
import { GoogleGenAI, Type } from "@google/genai";
import { Horse, PaddockAnalysisResult, Race } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const analyzePaddock = async (
  base64Image: string,
  horseName: string
): Promise<PaddockAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `この馬（名前：${horseName}）のパドックでの状態を分析してください。筋肉の張り、毛艶、気合（集中力）、歩様のズム、発汗（入れ込み具合）などを評価してください。1から10のスコアと、専門的で簡潔な日本語の解説を提供してください。`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "1から10のコンディションスコア" },
            feedback: { type: Type.STRING, description: "馬の状態に関する簡潔な日本語のフィードバック" },
          },
          required: ["score", "feedback"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return {
      horseId: horseName,
      score: result.score,
      feedback: result.feedback,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const predictRaceOutcome = async (
  race: Race,
  paddockAnalyses: PaddockAnalysisResult[]
): Promise<any> => {
  const prompt = `
    以下のレースデータとパドック診断結果に基づき、各馬の勝率を算出してください。
    出力は必ず日本語で行ってください。
    
    レース: ${race.name} (${race.venue} ${race.distance}m, 天候: ${race.weather}, 馬場状態: ${race.trackCondition})
    
    出走馬データ:
    ${race.horses.map(h => {
      const p = paddockAnalyses.find(pa => pa.horseId === h.id);
      return `- ${h.name} (馬番:${h.number}): オッズ ${h.odds}, 直近着順: ${h.lastPositions.join(",")}, パドックスコア: ${p ? p.score : '未実施'}`;
    }).join('\n')}
    
    過去の実績と現在のパドックでの気配の両方を考慮して、勝率（0から1の範囲）と、その予測理由を専門的な視点で解説してください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              horseId: { type: Type.STRING },
              winProbability: { type: Type.NUMBER },
              reasoning: { type: Type.STRING, description: "日本語での予測理由" },
            },
            required: ["horseId", "winProbability", "reasoning"]
          }
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Prediction Error:", error);
    return [];
  }
};
