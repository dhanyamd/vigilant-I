
import React, { useState } from 'react';
import Header from './components/Header';
import PhysicsPanel from './components/PhysicsPanel';
import ResultsView from './components/ResultsView';
import SimulationView from './components/SimulationView'; 
import { analyzeMissionData } from './services/geminiService';
import { computePhysicsModel } from './services/physicsEngine';
import { AnalysisResult, AnalysisState, UploadedFile } from './types';

function App() {
  const [spectrogram, setSpectrogram] = useState<UploadedFile | null>(null);
  const [visual, setVisual] = useState<UploadedFile | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // View State: 'DASHBOARD' (Vertical Stack) or 'SIMULATION' (Full Screen)
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'SIMULATION'>('DASHBOARD');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'visual') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileObj: UploadedFile = {
          file,
          previewUrl: URL.createObjectURL(file),
          base64: reader.result as string,
          mimeType: file.type,
          audioUrl: file.type.startsWith('audio/') ? URL.createObjectURL(file) : undefined
        };
        if (type === 'audio') setSpectrogram(fileObj);
        else setVisual(fileObj);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!spectrogram || !visual) return;
    setAnalysisState(AnalysisState.ANALYZING);
    setErrorMsg(null);
    setResult(null); 

    try {
      // 1. Perception Step (AI Neural Net)
      const analysis = await analyzeMissionData(spectrogram, visual, customPrompt);
      
      // 2. Physics Step (Deterministic)
      const physicsResult = computePhysicsModel(analysis);
      
      setResult({ perception: analysis, physics: physicsResult, audioUrl: spectrogram.audioUrl });
      setAnalysisState(AnalysisState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      let msg = "Analysis Protocol Failed. System Halted.";
      if (err.message) {
         if (err.message.includes("RateLimit") || err.message.includes("429")) {
             msg = "Satellite Uplink Saturated (Rate Limit). Please wait 30s before retrying.";
         } else if (err.message.includes("401") || err.message.includes("AuthError")) {
             msg = "CRITICAL: Authorization Failed. The satellite access key is invalid or expired.";
         } else if (err.message.includes("Overloaded") || err.message.includes("503")) {
             msg = "Remote AI Core Overloaded. Retrying uplink...";
         }
      }
      setErrorMsg(msg);
      setAnalysisState(AnalysisState.ERROR);
    }
  };

  // --- FULL SCREEN SIMULATION MODE ---
  if (currentView === 'SIMULATION') {
    return (
        <div className="fixed inset-0 z-50 bg-black animate-fade-in">
            <SimulationView result={result} onBack={() => setCurrentView('DASHBOARD')} />
        </div>
    );
  }

  // --- STANDARD DASHBOARD MODE (Vertical Stack) ---
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        
        {/* 1. DATA INJECTION SECTION */}
        <div className="space-y-8">
            <div className="border-b border-gray-700 pb-4">
               <div className="flex justify-between items-start mb-2">
                 <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Mission Data Injection</h2>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Input A */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">INPUT A: AUDIO / SPECTROGRAM</label>
                  {spectrogram?.audioUrl && (
                     <div className="flex items-center gap-2 bg-space-800 border border-gray-600 px-2">
                        <span className="text-[10px] text-gray-400 font-mono">PREVIEW</span>
                        <audio controls src={spectrogram.audioUrl} className="h-6 w-24" />
                     </div>
                  )}
                </div>
                <input type="file" accept="image/*,audio/*" onChange={(e) => handleFileChange(e, 'audio')} className="hidden" id="spectrogram-upload" />
                <div className="relative aspect-video bg-space-800 border border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-white transition-all cursor-pointer">
                  {spectrogram ? (
                    spectrogram.mimeType.startsWith('audio/') ? (
                        <div className="text-center">
                            <span className="text-2xl block mb-2">🔊</span>
                            <p className="text-[10px] text-gray-400 font-mono">AUDIO LOADED</p>
                        </div>
                    ) : (
                      <img src={spectrogram.previewUrl} alt="Spectrogram" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <label htmlFor="spectrogram-upload" className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Load Audio/Spec</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Input B */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">INPUT B: MACRO OPTICAL</label>
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'visual')} className="hidden" id="visual-upload" />
                <div className="relative aspect-video bg-space-800 border border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-white transition-all cursor-pointer">
                  {visual ? (
                    <img src={visual.previewUrl} alt="Visual" className="w-full h-full object-cover" />
                  ) : (
                    <label htmlFor="visual-upload" className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Load Visual</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
            
            {/* Prompt */}
            <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">PARAMETER OVERRIDE / INQUIRY</label>
                </div>
                <textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder=" Ask specific questions (e.g., 'Is this seal cracked?') or inject parameters..."
                  className="w-full bg-black border border-gray-700 p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors resize-none h-20 font-mono"
                />
            </div>

            {/* Main Action */}
            <button
              onClick={handleAnalyze}
              disabled={!spectrogram || !visual || analysisState === AnalysisState.ANALYZING}
              className={`w-full py-4 font-mono text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 border
                ${!spectrogram || !visual 
                  ? 'bg-transparent border-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-white border-white text-black hover:bg-transparent hover:text-white'
                }
              `}
            >
              {analysisState === AnalysisState.ANALYZING ? (
                <span className="animate-pulse">Processing Telemetry...</span>
              ) : (
                <span>Execute Analysis</span>
              )}
            </button>
        </div>

        {/* 2. OUTPUT SECTION (Stacked Vertically) */}
        
        {analysisState === AnalysisState.ERROR && (
           <div className="border border-lunar-danger p-6 text-center bg-black">
             <h3 className="text-lunar-danger font-mono text-lg mb-2">FATAL ERROR</h3>
             <p className="text-gray-300 mb-4 font-mono text-sm">{errorMsg}</p>
             <button onClick={() => setAnalysisState(AnalysisState.IDLE)} className="px-4 py-2 bg-white text-black text-xs uppercase font-bold">Reboot</button>
           </div>
        )}

        {/* Physics Panel - Always visible if we have results, adds technical depth */}
        {result && <PhysicsPanel result={result} />}

        {/* Results View - The main dashboard card */}
        <ResultsView result={result} onLaunchSim={() => setCurrentView('SIMULATION')} />

      </main>
    </div>
  );
}

export default App;
