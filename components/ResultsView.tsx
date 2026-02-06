
import React from 'react';
import { AnalysisResult } from '../types';

interface ResultsViewProps {
  result: AnalysisResult | null;
  onLaunchSim?: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onLaunchSim }) => {
  // Default 'STANDBY' state if no result yet
  const physics = result?.physics || {
    status: 'STANDBY',
    flashTemperatureC: 0,
    wearVolume: 0,
    fatigueLifeHours: 0,
    rulHours: 0,
    frictionCoefficient: 0,
    dynamicLoadFactor: 0,
    wearCoefficientK: 0,
    hardnessH: 0,
    failureProbability: 0,
    equationLogic: null
  };

  const perception = result?.perception || {
    visualSeverity: 0,
    audioChaos: 0,
    detectedMaterial: '---',
    detectedContaminant: '---',
    lubricationState: '---',
    estimatedSpeed: '---',
    reasoning: "System awaiting telemetry stream..."
  };
  
  // Define status colors
  const statusColors = {
    'GO': 'text-lunar-success border-lunar-success',
    'WARNING': 'text-lunar-warning border-lunar-warning',
    'NO-GO': 'text-lunar-danger border-lunar-danger',
    'STANDBY': 'text-white border-white'
  };

  const statusColor = statusColors[physics.status] || statusColors['STANDBY'];

  // Visualization scaling helpers
  const tempVal = physics.flashTemperatureC || 0;
  const wearVal = physics.wearVolume || 0;
  const fatigueVal = physics.fatigueLifeHours || 0;

  const tempPercent = Math.min((tempVal / 300) * 100, 100);
  const isTempHigh = tempVal > 150;
  
  const wearPercent = Math.min((wearVal / 1e-7) * 100, 100); 
  const isWearHigh = wearVal > 1e-8;

  const fatiguePercent = fatigueVal > 0 
    ? Math.min((fatigueVal / 10000) * 100, 100) 
    : 0;
  const isFatigueLow = fatigueVal < 500 && fatigueVal > 0;

  // Safe formatting helpers
  const fmtExp = (val: number | undefined) => (val !== undefined && val !== null) ? val.toExponential(1) : '0.00e+0';
  const fmtFixed = (val: number | undefined, digits: number = 0) => (val !== undefined && val !== null) ? val.toFixed(digits) : '0';

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
      
      {/* 1. HEADER STATUS */}
      <div className={`border-2 p-8 flex flex-col items-center justify-center text-center transition-all duration-500 bg-space-900 ${statusColor}`}>
        <span className="text-xs font-mono tracking-[0.4em] uppercase mb-4 text-gray-300">System Integrity</span>
        <h2 className="text-6xl font-light tracking-tighter">{physics.status || 'STANDBY'}</h2>
      </div>

      <div className="flex items-center gap-4 py-2">
         <div className="h-px bg-gray-700 flex-grow"></div>
         <h3 className="text-white font-mono text-sm tracking-[0.2em] uppercase">Live Multi-Physics Telemetry</h3>
         <div className="h-px bg-gray-700 flex-grow"></div>
      </div>

      {/* 2. MULTI-PHYSICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* A. THERMODYNAMICS CARD (Blok) */}
          <div className={`bg-space-800 border-2 p-6 flex flex-col justify-between min-h-[160px] transition-colors ${isTempHigh ? 'border-lunar-danger' : 'border-gray-700'}`}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs text-gray-300 uppercase tracking-widest font-bold">Thermodynamics</h3>
                <span className={`w-2 h-2 rounded-full ${isTempHigh ? 'bg-lunar-danger animate-pulse' : (result ? 'bg-lunar-success' : 'bg-gray-600')}`}></span>
             </div>
             
             <div className="relative mb-2">
                <span className={`text-4xl font-light font-mono ${isTempHigh ? 'text-lunar-danger' : 'text-white'}`}>{fmtFixed(physics.flashTemperatureC)}°C</span>
                <span className="text-[10px] text-gray-400 block mt-1 uppercase">Blok Flash Temp</span>
             </div>
             
             <div className="w-full bg-space-900 h-1.5 mt-2 overflow-hidden border border-space-700">
                <div 
                  className={`h-full transition-all duration-1000 ${isTempHigh ? 'bg-lunar-danger' : 'bg-white'}`} 
                  style={{ width: `${tempPercent}%` }}
                ></div>
             </div>
          </div>

          {/* B. TRIBOLOGY CARD (Archard) */}
          <div className={`bg-space-800 border-2 p-6 flex flex-col justify-between min-h-[160px] transition-colors ${isWearHigh ? 'border-lunar-warning' : 'border-gray-700'}`}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs text-gray-300 uppercase tracking-widest font-bold">Tribology</h3>
                <span className={`w-2 h-2 rounded-full ${isWearHigh ? 'bg-lunar-warning animate-pulse' : (result ? 'bg-lunar-success' : 'bg-gray-600')}`}></span>
             </div>
             
             <div className="relative mb-2">
                <span className={`text-4xl font-light font-mono ${isWearHigh ? 'text-lunar-warning' : 'text-white'}`}>
                  {result ? fmtExp(physics.wearVolume) : '0.00e+0'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1 uppercase">Archard Wear Vol (m³)</span>
             </div>
             
             <div className="w-full bg-space-900 h-1.5 mt-2 overflow-hidden border border-space-700">
                <div 
                  className={`h-full transition-all duration-1000 ${isWearHigh ? 'bg-lunar-warning' : 'bg-white'}`} 
                  style={{ width: `${wearPercent}%` }}
                ></div>
             </div>
          </div>

          {/* C. MECHANICS CARD (Fatigue) */}
          <div className={`bg-space-800 border-2 p-6 flex flex-col justify-between min-h-[160px] transition-colors ${isFatigueLow ? 'border-lunar-danger' : 'border-gray-700'}`}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs text-gray-300 uppercase tracking-widest font-bold">Mechanics</h3>
                <span className={`w-2 h-2 rounded-full ${isFatigueLow ? 'bg-lunar-danger animate-pulse' : (result ? 'bg-lunar-success' : 'bg-gray-600')}`}></span>
             </div>
             
             <div className="relative mb-2">
                <span className={`text-4xl font-light font-mono ${isFatigueLow ? 'text-lunar-danger' : 'text-white'}`}>
                    {fatigueVal > 10000 ? '10k+' : fatigueVal}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1 uppercase">L10 Fatigue Life (Hrs)</span>
             </div>

             <div className="w-full bg-space-900 h-1.5 mt-2 overflow-hidden border border-space-700">
                <div 
                  className={`h-full transition-all duration-1000 ${isFatigueLow ? 'bg-lunar-danger' : 'bg-white'}`} 
                  style={{ width: `${fatiguePercent}%` }}
                ></div>
             </div>
          </div>
      </div>

      {/* 3. CONTEXTUAL ANALYSIS */}
      <div className="grid grid-cols-2 gap-px bg-gray-700 border border-gray-700">
         <div className="bg-black p-6 hover:bg-space-800 transition-colors">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Est. RUL</span>
             <span className={`text-2xl font-mono ${(physics.rulHours || 0) < 24 && result ? 'text-lunar-danger' : 'text-white'}`}>
                {result ? `${physics.rulHours} HRS` : '--'}
             </span>
         </div>
         <div className="bg-black p-6 hover:bg-space-800 transition-colors">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Contaminant</span>
             <span className={`text-xl font-mono ${perception.detectedContaminant !== 'NONE' && result ? 'text-lunar-warning' : 'text-white'}`}>
                {(perception.detectedContaminant || "").replace('_', ' ')}
             </span>
         </div>
          <div className="bg-black p-6 hover:bg-space-800 transition-colors">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Material</span>
             <span className="text-sm text-white font-mono">{(perception.detectedMaterial || "").replace('_', ' ')}</span>
         </div>
         <div className="bg-black p-6 hover:bg-space-800 transition-colors">
             <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Lubrication</span>
             <span className={`text-sm font-mono ${perception.lubricationState !== 'NOMINAL' && result ? 'text-lunar-warning' : 'text-white'}`}>
                {perception.lubricationState}
             </span>
         </div>
      </div>

      {/* 4. AI LOG & SIMULATION LAUNCH */}
      <div className="flex flex-col bg-space-800 border border-gray-700 flex-grow relative overflow-hidden">
        <div className="p-8 border-b border-gray-700 relative">
            <div className="absolute top-0 right-0 p-2 opacity-20">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            
            <h3 className="text-xs text-white uppercase tracking-widest mb-4 font-bold pb-2">AI Perception Log</h3>
            <p className="text-gray-300 leading-7 font-mono text-xs whitespace-pre-wrap">
              {'>'} {perception.reasoning}
            </p>

            {/* VERIFICATION TRACE: This proves the math is real */}
            {physics.equationLogic && (
              <div className="mt-4 p-4 bg-black border border-lunar-success/30 font-mono text-[10px] text-lunar-success overflow-x-auto shadow-inner">
                <div className="uppercase tracking-widest text-xs border-b border-lunar-success/30 pb-2 mb-2 flex justify-between items-center">
                   <span className="font-bold">{">>"} PHYSICS_KERNEL_TRACE.log</span>
                   <span className="flex items-center gap-1 animate-pulse"><span className="w-1.5 h-1.5 bg-lunar-success rounded-full"></span>LIVE</span>
                </div>
                <pre className="whitespace-pre-wrap leading-tight opacity-90">
                  {physics.equationLogic}
                </pre>
              </div>
            )}

        </div>
        
        {/* Launch Simulation Button Area */}
        {onLaunchSim && (
             <div className="p-4 bg-black flex justify-end">
                <button 
                  onClick={onLaunchSim}
                  className="flex items-center gap-3 bg-white hover:bg-gray-200 text-black px-6 py-4 font-mono text-sm uppercase tracking-widest transition-all group"
                >
                   <span>Initialize 3D Digital Twin</span>
                   <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
             </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;
