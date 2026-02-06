
import React, { useState } from 'react';
import Header from './components/Header';
import PhysicsPanel from './components/PhysicsPanel';
import ResultsView from './components/ResultsView';
import SimulationView from './components/SimulationView'; // Import the new view
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
  
  // New State for View Switching
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
      
      // 2. Physics Step (Neuro-Symbolic: Code handles the Math)
      // Switch from 'generatePhysicsPrognosis' (LLM) to 'computePhysicsModel' (Deterministic)
      // This ensures we always get a valid result and avoids "Insufficient data" hallucinations.
      const physicsResult = computePhysicsModel(analysis);
      
      // Include audioUrl in result for SimulationView
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

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: Input & Physics (ALWAYS VISIBLE) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Mission Brief */}
            <div className="border-b border-gray-700 pb-4">
               <div className="flex justify-between items-start mb-2">
                 <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Data Injection</h2>
               </div>
            </div>

            {/* Inputs */}
            <div className="grid gap-8">
              {/* Input A: Audio/Spectrogram */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">INPUT A: AUDIO / SPECTROGRAM</label>
                  {spectrogram?.audioUrl && (
                     <div className="flex items-center gap-2 bg-space-800 border border-gray-600 px-2">
                        <span className="text-[10px] text-gray-400 font-mono">AUDIO PREVIEW</span>
                        <audio 
                          controls 
                          src={spectrogram.audioUrl} 
                          className="h-8 w-40"
                        />
                     </div>
                  )}
                </div>
                
                <input 
                  type="file" 
                  accept="image/*,audio/*"
                  onChange={(e) => handleFileChange(e, 'audio')}
                  className="hidden"
                  id="spectrogram-upload"
                />
                
                <div className="relative aspect-video bg-space-800 border border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-white transition-all cursor-pointer">
                  {spectrogram ? (
                    spectrogram.mimeType.startsWith('audio/') ? (
                        <div className="w-full h-full flex items-center justify-center bg-space-800">
                             <div className="text-center">
                                <span className="text-4xl block mb-2">🔊</span>
                                <p className="text-xs text-gray-400 font-mono tracking-widest">AUDIO DATA LOADED</p>
                                <p className="text-[10px] text-gray-600 mt-1">{spectrogram.file.name}</p>
                             </div>
                        </div>
                    ) : (
                      <>
                        <img src={spectrogram.previewUrl} alt="Spectrogram" className="w-full h-full object-cover group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 left-2 bg-black text-white text-[10px] px-2 py-1 font-mono border border-gray-600">
                            {spectrogram.file.name}
                        </div>
                      </>
                    )
                  ) : (
                    <label htmlFor="spectrogram-upload" className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Select Audio or Image</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Input B: Visual */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">INPUT B: MACRO OPTICAL</label>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'visual')}
                  className="hidden"
                  id="visual-upload"
                />
                
                <div className="relative aspect-video bg-space-800 border border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-white transition-all cursor-pointer">
                  {visual ? (
                    <>
                      <img src={visual.previewUrl} alt="Visual" className="w-full h-full object-cover group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 left-2 bg-black text-white text-[10px] px-2 py-1 font-mono border border-gray-600">
                        {visual.file.name}
                      </div>
                    </>
                  ) : (
                    <label htmlFor="visual-upload" className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Select Source File</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Optional Prompt Input */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">PARAMETER OVERRIDE</label>
                </div>
                <textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="// Enter specific diagnostic queries here..."
                  className="w-full bg-black border border-gray-700 p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors resize-none h-24 font-mono"
                />
              </div>

            </div>

            {/* Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={!spectrogram || !visual || analysisState === AnalysisState.ANALYZING}
              className={`w-full py-5 font-mono text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3 border
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
            
            <PhysicsPanel result={result} />

          </div>

          {/* RIGHT COLUMN: Analysis Output OR Simulation (Swappable) */}
          <div className="lg:col-span-7">
             {analysisState === AnalysisState.ERROR && (
               <div className="border border-white p-8 text-center bg-black mb-8">
                 <h3 className="text-white font-mono text-lg mb-2">FATAL ERROR</h3>
                 <p className="text-gray-300 mb-6 font-mono text-sm">{errorMsg}</p>
                 <button 
                   onClick={() => setAnalysisState(AnalysisState.IDLE)}
                   className="px-6 py-2 bg-white text-black text-xs uppercase font-bold tracking-widest hover:bg-gray-200"
                 >
                   Reboot
                 </button>
               </div>
             )}

             {currentView === 'DASHBOARD' ? (
                <ResultsView result={result} onLaunchSim={() => setCurrentView('SIMULATION')} />
             ) : (
                <SimulationView result={result} onBack={() => setCurrentView('DASHBOARD')} />
             )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
