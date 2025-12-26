
export interface Horse {
  id: string;
  name: string;
  number: number;
  jockey: string;
  weight: number;
  lastPositions: number[];
  avgTime: string;
  odds: number;
}

export interface PaddockAnalysisResult {
  horseId: string;
  score: number; // 1-10
  feedback: string;
  analyzedAt: string;
}

export interface PredictionResult {
  horseId: string;
  winProbability: number;
  ranking: number;
  reasoning: string;
}

export interface Race {
  id: string;
  name: string;
  venue: string;
  distance: number;
  weather: string;
  trackCondition: string;
  horses: Horse[];
}
