
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MOCK_RACE } from './constants';
import { Horse, PaddockAnalysisResult, PredictionResult } from './types';
import { analyzePaddock, predictRaceOutcome } from './services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const App: React.FC = () => {
  const [currentRace] = useState(MOCK_RACE);
  const [analyses, setAnalyses] = useState<Record<string, PaddockAnalysisResult>>({});
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [mediaSource, setMediaSource] = useState<'camera' | 'file' | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 勝率順にソートされた予測データ
  const sortedPredictions = useMemo(() => {
    return [...predictions].sort((a, b) => b.winProbability - a.winProbability);
  }, [predictions]);

  // カメラ起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMediaSource('camera');
        setFileType('video');
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("カメラへのアクセスを許可してください。");
    }
  };

  // ファイル選択ハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaSource('file');

    if (file.type.startsWith('image/')) {
      setFileType('image');
    } else if (file.type.startsWith('video/')) {
      setFileType('video');
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const captureAndAnalyze = async () => {
    if (!selectedHorseId) {
      alert("まずリストから馬を選択してください。");
      return;
    }
    
    setIsAnalyzing(true);
    const horse = currentRace.horses.find(h => h.id === selectedHorseId);
    if (!horse) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    let base64Image = "";

    try {
      if (fileType === 'video' && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth || videoRef.current.clientWidth;
        canvasRef.current.height = videoRef.current.videoHeight || videoRef.current.clientHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
      } else if (fileType === 'image' && imageRef.current) {
        canvasRef.current.width = imageRef.current.naturalWidth;
        canvasRef.current.height = imageRef.current.naturalHeight;
        ctx.drawImage(imageRef.current, 0, 0);
        base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
      }

      if (base64Image) {
        const result = await analyzePaddock(base64Image, horse.name);
        setAnalyses(prev => ({ ...prev, [selectedHorseId]: { ...result, horseId: selectedHorseId } }));
      }
    } catch (err) {
      console.error(err);
      alert("AI解析に失敗しました。ファイル形式やサイズを確認してください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runPrediction = async () => {
    if (Object.keys(analyses).length === 0) {
      if (!confirm("パドック分析が一件もありません。過去データのみで予測を開始しますか？")) return;
    }
    setIsPredicting(true);
    try {
      const results = await predictRaceOutcome(currentRace, Object.values(analyses));
      setPredictions(results);
    } catch (err) {
      alert("予測計算に失敗しました。");
    } finally {
      setIsPredicting(false);
    }
  };

  // 競馬の印（◎, ○, ▲...）を決定するユーティリティ
  const getMark = (index: number) => {
    const marks = ['◎', '○', '▲', '△', '×'];
    return marks[index] || '';
  };

  // 指定した順位の馬オブジェクトを取得
  const getHorseAtRank = (rank0Based: number) => {
    if (rank0Based >= sortedPredictions.length) return null;
    return currentRace.horses.find(h => h.id === sortedPredictions[rank0Based].horseId);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white italic">UMA<span className="text-emerald-400">BASE</span> AI</h1>
          </div>
          <button 
            onClick={runPrediction}
            disabled={isPredicting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-full font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 text-sm tracking-widest uppercase"
          >
            {isPredicting ? '計算中...' : '最終予想を実行'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* 勝率予測結果（メインエリア） */}
          {sortedPredictions.length > 0 && (
            <section className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                  AI最終ランキング
                </h3>
                <p className="text-slate-400 text-sm mt-1">パドック分析と過去実績に基づく総合評価</p>
              </div>

              {/* 推奨馬券カード */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-6 shadow-xl border border-emerald-400/30">
                <h4 className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 00-2 0v1a1 1 0 102 0zm7-1a1 1 0 110 2 1 1 0 010-2zm-7-4a3 3 0 110-6 3 3 0 010 6z"></path></svg>
                  AI Recommended Tickets / 推奨買い目
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 馬連 */}
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <span className="text-emerald-100 text-[10px] block mb-2 font-bold">馬連 (上位2頭)</span>
                    <div className="flex items-center gap-2 text-white font-black">
                      <div className="flex flex-col">
                        <span className="text-2xl leading-none">{getHorseAtRank(0)?.number}</span>
                        <span className="text-[10px] opacity-80">{getHorseAtRank(0)?.name}</span>
                      </div>
                      <span className="text-xl opacity-50">-</span>
                      <div className="flex flex-col">
                        <span className="text-2xl leading-none">{getHorseAtRank(1)?.number}</span>
                        <span className="text-[10px] opacity-80">{getHorseAtRank(1)?.name}</span>
                      </div>
                    </div>
                  </div>
                  {/* 3連複 */}
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <span className="text-emerald-100 text-[10px] block mb-2 font-bold">3連複 (上位3頭)</span>
                    <div className="flex items-center gap-2 text-white font-black">
                      {[0, 1, 2].map((r, i) => (
                        <React.Fragment key={r}>
                          <div className="flex flex-col">
                            <span className="text-xl leading-none">{getHorseAtRank(r)?.number}</span>
                            <span className="text-[9px] opacity-80 truncate max-w-[60px]">{getHorseAtRank(r)?.name}</span>
                          </div>
                          {i < 2 && <span className="text-lg opacity-50">-</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ランキングリスト */}
              <div className="grid grid-cols-1 gap-4">
                {sortedPredictions.map((p, idx) => {
                  const h = currentRace.horses.find(horse => horse.id === p.horseId);
                  const isTop = idx === 0;
                  return (
                    <div 
                      key={p.horseId} 
                      className={`relative group bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isTop ? 'border-yellow-500/50 ring-2 ring-yellow-500/10 shadow-2xl' : 'border-slate-700 hover:border-slate-500 shadow-lg'
                      }`}
                    >
                      {isTop && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-slate-900 px-4 py-1 font-black text-[10px] rounded-bl-xl uppercase tracking-tighter z-10">
                          Winner Prediction
                        </div>
                      )}
                      
                      <div className="flex flex-col md:flex-row md:items-stretch">
                        {/* 左：順位と馬名 */}
                        <div className={`flex flex-col items-center justify-center p-6 min-w-[120px] text-center gap-1 ${
                          isTop ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700/50 text-white'
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-4xl font-black leading-none">{idx + 1}</span>
                            <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">位</span>
                          </div>
                          <div className="mt-2 w-full px-2">
                             <span className={`text-[11px] font-black block leading-tight truncate ${isTop ? 'text-slate-900' : 'text-emerald-400'}`}>
                               {h?.name}
                             </span>
                          </div>
                        </div>

                        {/* 中央：馬情報 */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-bold text-emerald-400">{getMark(idx)}</span>
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-lg text-xl font-black text-white border border-slate-700">
                              {h?.number}
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-white">{h?.name}</h4>
                                <p className="text-xs text-slate-500 font-medium">{h?.jockey} / {h?.weight}kg</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
                            <span>オッズ: <span className="text-white font-bold">{h?.odds.toFixed(1)}</span></span>
                            <span className="ml-auto text-emerald-400 font-black text-2xl animate-in fade-in slide-in-from-right duration-1000">
                                {(p.winProbability * 100).toFixed(1)}%
                            </span>
                          </div>
                          
                          {/* 勝率ゲージ */}
                          <div className="mt-4 w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${isTop ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ width: `${p.winProbability * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* 右：理由 */}
                        <div className="bg-slate-900/40 md:w-1/3 p-6 border-t md:border-t-0 md:border-l border-slate-700/50">
                          <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">AI Analyst Note</h5>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            「{p.reasoning}」
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 出走馬リスト（デフォルト表示） */}
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-inner">
            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeWidth="2"/></svg>
                  出馬表 <span className="text-slate-500 font-normal text-sm">{currentRace.name}</span>
                </h2>
                <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest">{currentRace.venue} • {currentRace.distance}M • TRACK: {currentRace.trackCondition}</p>
              </div>
            </div>

            <div className="space-y-2">
              {currentRace.horses.map((horse) => (
                <div 
                  key={horse.id}
                  onClick={() => setSelectedHorseId(horse.id)}
                  className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedHorseId === horse.id ? 'bg-emerald-500/10 border-emerald-500 shadow-md' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-xs font-black text-white border border-slate-600">
                    {horse.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{horse.name}</h3>
                    <p className="text-[10px] text-slate-500">{horse.jockey}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">{horse.odds.toFixed(1)}</p>
                  </div>
                  <div className="w-16 flex justify-end">
                    {analyses[horse.id] ? (
                      <div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        SCORE: {analyses[horse.id].score}
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* サイドバー: パドックAI診断 */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Paddock AI Analyst</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={startCamera}
                    className={`p-2 rounded-lg text-white transition-all ${mediaSource === 'camera' ? 'bg-emerald-600 ring-2 ring-emerald-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg text-white transition-all ${mediaSource === 'file' ? 'bg-emerald-600 ring-2 ring-emerald-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                </div>
              </div>

              <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 group mb-4 shadow-inner">
                {fileType === 'image' && previewUrl ? (
                  <img ref={imageRef} src={previewUrl} className="w-full h-full object-contain" alt="Paddock" />
                ) : (
                  <video ref={videoRef} src={previewUrl || undefined} autoPlay playsInline controls={mediaSource === 'file'} className="w-full h-full object-contain" />
                )}
                
                <canvas ref={canvasRef} className="hidden" />

                {!selectedHorseId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm text-center p-6 z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Select a horse from the list<br/>to start visual analysis</p>
                  </div>
                )}
                
                {selectedHorseId && (
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg z-20 uppercase">
                    Analyzing: {currentRace.horses.find(h => h.id === selectedHorseId)?.name}
                  </div>
                )}

                <button 
                  onClick={captureAndAnalyze}
                  disabled={!selectedHorseId || isAnalyzing || (!previewUrl && mediaSource !== 'camera')}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-emerald-500 shadow-xl active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center z-20"
                >
                  <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  </div>
                </button>
              </div>

              {selectedHorseId && analyses[selectedHorseId] ? (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl font-black text-emerald-400 leading-none">
                      {analyses[selectedHorseId].score}
                      <span className="text-[10px] text-slate-500 ml-1 font-normal">/10</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">Paddock Score</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-tighter">AI Visual Analysis Complete</p>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      「{analyses[selectedHorseId].feedback}」
                    </p>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-6 h-6 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2"></div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">AI analyzing frames...</p>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                  <p className="text-slate-500 text-[9px] uppercase font-bold tracking-[0.2em]">System ready for analysis</p>
                </div>
              )}
            </section>

            <section className="bg-emerald-900/10 rounded-2xl p-6 border border-emerald-500/20">
              <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                AI Intelligence Tips
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                パドックの様子は馬のその日の「調子」を最もよく表します。画像・動画をAIに送る際は、馬の筋肉の張りがわかるような横からのショットが最適です。
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* モバイルナビゲーション */}
      <footer className="fixed bottom-0 w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 py-3 px-6 flex justify-around items-center text-slate-500 z-50">
        <div className="flex flex-col items-center gap-1 text-emerald-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
          <span className="text-[8px] uppercase font-bold tracking-tighter">Races</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-[8px] uppercase font-bold tracking-tighter">History</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          <span className="text-[8px] uppercase font-bold tracking-tighter">Profile</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
