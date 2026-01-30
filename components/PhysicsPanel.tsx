
import React from 'react';
import { AnalysisResult } from '../types';

interface PhysicsPanelProps {
  result: AnalysisResult | null;
}

const PhysicsPanel: React.FC<PhysicsPanelProps> = ({ result }) => {
  const phys = result?.physics;
  const perc = result?.perception;

  // Helper to safely format numbers
  const safeExp = (val: number | undefined | null) => (val !== undefined && val !== null) ? val.toExponential(1) : "--";
  const safeFixed = (val: number | undefined | null, digits: number) => (val !== undefined && val !== null) ? val.toFixed(digits) : "--";
  const safeInt = (val: number | undefined | null) => (val !== undefined && val !== null) ? val.toFixed(0) : "--";

  return (
    <div className="border-t border-gray-700 pt-6 mt-6">
       <div className="flex justify-between items-baseline mb-6">
         <h2 className="text-white text-xs font-mono tracking-[0.2em] uppercase">
           Multi-Physics Engine
         </h2>
         <div className="flex gap-4 text-[10px] font-mono text-gray-400">
            <span>ARCHARD</span>
            <span>BLOK</span>
            <span>L10-LIFE</span>
         </div>
       </div>

       {/* Parameters Grid */}
       <div className="grid grid-cols-3 gap-px bg-gray-700 border border-gray-700">
         
         {/* COL 1: TRIBOLOGY (Wear) */}
         <div className="bg-black p-4 flex flex-col justify-between h-32">
            <div className="flex justify-between">
                <span className="text-gray-300 text-[10px] tracking-widest uppercase">Volume Loss</span>
                <span className="text-gray-500 text-[10px]">m³</span>
            </div>
            <span className="text-xl font-light text-white font-mono">
              {safeExp(phys?.wearVolume)}
            </span>
            <div className="text-[10px] text-gray-400 font-mono mt-2 flex justify-between">
                <div title="Friction Coefficient">μ = {safeFixed(phys?.frictionCoefficient, 2)}</div>
                <div title="Wear Coefficient">k = {safeExp(phys?.wearCoefficientK)}</div>
            </div>
         </div>

         {/* COL 2: THERMODYNAMICS (Heat) */}
         <div className="bg-black p-4 flex flex-col justify-between h-32 relative">
             {phys && (phys.flashTemperatureC || 0) > 150 && (
                 <div className="absolute inset-0 bg-lunar-danger/20 animate-pulse pointer-events-none"></div>
             )}
            <div className="flex justify-between">
                <span className="text-gray-300 text-[10px] tracking-widest uppercase">Flash Temp</span>
                <span className="text-gray-500 text-[10px]">°C</span>
            </div>
            <span className={`text-xl font-light font-mono ${phys && (phys.flashTemperatureC || 0) > 150 ? 'text-lunar-danger' : 'text-white'}`}>
              {safeInt(phys?.flashTemperatureC)}°
            </span>
            <div className="text-[10px] text-gray-400 font-mono mt-2">
                <div>Cond: {phys?.thermalConductivity ? phys.thermalConductivity.toFixed(1) : "-"} W/mK</div>
                <div>Speed: {perc?.estimatedSpeed || "-"}</div>
            </div>
         </div>

         {/* COL 3: MECHANICS (Fatigue) */}
         <div className="bg-black p-4 flex flex-col justify-between h-32">
            <div className="flex justify-between">
                <span className="text-gray-300 text-[10px] tracking-widest uppercase">Fatigue Life</span>
                <span className="text-gray-500 text-[10px]">L10</span>
            </div>
            <span className="text-xl font-light text-white font-mono">
              {phys?.fatigueLifeHours !== undefined && phys?.fatigueLifeHours !== null ? (phys.fatigueLifeHours > 10000 ? '>10k' : phys.fatigueLifeHours) : "--"}
            </span>
            <div className="text-[10px] text-gray-400 font-mono mt-2">
                {/* CHANGED: Now displays Dynamic Load to prove Input A (Chaos) is being used */}
                <div title={`Base Load: ${safeInt(phys?.appliedLoadN)} N`}>
                   Dyn Load: {phys?.dynamicLoadN ? safeInt(phys.dynamicLoadN) : safeInt(phys?.appliedLoadN)} N
                </div>
                <div title="Hardness">H: {phys?.hardnessH ? (phys.hardnessH/1e9).toFixed(1) : "-"} GPa</div>
            </div>
         </div>
       </div>

       <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span className="flex items-center gap-2">
             <span className={`w-1.5 h-1.5 rounded-full ${result ? 'bg-lunar-success animate-pulse' : 'bg-gray-600'}`}></span>
             NEURO-SYMBOLIC SYNC
          </span>
          <span className="uppercase">
             MAT: {perc?.detectedMaterial || "Waiting..."}
          </span>
       </div>
    </div>
  );
};

export default PhysicsPanel;
