
import { Race } from './types';

export const MOCK_RACE: Race = {
  id: "r1",
  name: "ジャパンカップ (G1)",
  venue: "東京競馬場",
  distance: 2400,
  weather: "晴れ",
  trackCondition: "良",
  horses: [
    { id: "h1", name: "イクイノックス", number: 1, jockey: "C.ルメール", weight: 58, lastPositions: [1, 1, 1], avgTime: "2:24.2", odds: 1.5 },
    { id: "h2", name: "リバティアイランド", number: 2, jockey: "川田 将雅", weight: 54, lastPositions: [1, 1, 2], avgTime: "2:24.5", odds: 3.2 },
    { id: "h3", name: "ドウデュース", number: 3, jockey: "武 豊", weight: 58, lastPositions: [4, 1, 7], avgTime: "2:24.8", odds: 8.5 },
    { id: "h4", name: "スターズオンアース", number: 4, jockey: "W.ビュイック", weight: 56, lastPositions: [3, 2, 3], avgTime: "2:24.9", odds: 12.0 },
    { id: "h5", name: "ダノンベルーガ", number: 5, jockey: "J.モレイラ", weight: 58, lastPositions: [4, 5, 2], avgTime: "2:25.1", odds: 18.0 },
  ]
};
