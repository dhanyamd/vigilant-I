
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
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [datasetId, setDatasetId] = useState<string>("");
  
  // New State for View Switching
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'SIMULATION'>('DASHBOARD');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'visual') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileObj = {
          file,
          previewUrl: URL.createObjectURL(file),
          base64: reader.result as string,
          audioUrl: URL.createObjectURL(file) // Assume uploaded file is playable if user provides it
        };
        if (type === 'audio') setSpectrogram(fileObj);
        else setVisual(fileObj);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Helper to write a WAV file from an AudioBuffer so it can be played in <audio> tag
   */
  const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // Helpers defined at the top to prevent hoisting issues in strict environments
    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  
    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"
  
    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this demo)
  
    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length
  
    // write interleaved data
    for(i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));
  
    while(pos < len) {
      for(i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
        view.setInt16(44 + offset, sample, true); // write 16-bit sample
        offset += 2;
      }
      pos++;
    }
  
    return new Blob([buffer], {type: "audio/wav"});
  }

  /**
   * Synthesize Audio based on Physics State
   */
  const synthesizeAudio = async (type: 'nominal' | 'critical'): Promise<string> => {
    const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100 * 5, 44100);
    const b = ctx.createBuffer(1, 44100 * 5, 44100);
    const data = b.getChannelData(0);
    
    // Synthesis Parameters
    const isCritical = type === 'critical';
    const baseFreq = isCritical ? 800 : 120; // High screech vs Low hum
    const chaosLevel = isCritical ? 0.8 : 0.05;

    for (let i = 0; i < data.length; i++) {
        const t = i / 44100;
        
        // 1. Fundamental Motor Hum
        let signal = Math.sin(t * baseFreq * 2 * Math.PI);
        
        // 2. Harmonics (Bearing frequencies)
        signal += 0.5 * Math.sin(t * baseFreq * 3.2 * 2 * Math.PI);
        
        // 3. Chaos / Grinding (White Noise + Amplitude Modulation)
        const noise = (Math.random() - 0.5) * 2;
        
        if (isCritical) {
            // Intermittent impacts (clicking)
            const impact = (Math.sin(t * 8 * 2 * Math.PI) > 0.95) ? 1.0 : 0.0;
            // Screeching overlay
            const screech = Math.sin(t * (2500 + Math.sin(t*10)*500) * 2 * Math.PI);
            
            signal = (signal * 0.3) + (noise * chaosLevel) + (impact * 0.5) + (screech * 0.2);
        } else {
            // Smooth running
            signal = (signal * 0.8) + (noise * chaosLevel);
        }

        data[i] = signal * 0.5; // Master volume
    }

    const wavBlob = bufferToWave(b, 44100 * 5);
    return URL.createObjectURL(wavBlob);
  };

  /**
   * Generates randomized sample images client-side using Canvas API.
   * ENHANCED: Now generates specific features for Multi-Physics (Speed Pitch, Lubrication Sheen)
   */
  const generateSampleData = async (type: 'nominal' | 'critical'): Promise<{ audio: string; visual: string, audioName: string, visualName: string, audioUrl: string }> => {
    
    // 1. Synthesize Audio First
    const audioUrl = await synthesizeAudio(type);

    return new Promise((resolve) => {
      const width = 800;
      const height = 600;
      // Physics Variables for Generation
      const isHighSpeed = Math.random() > 0.5;
      const isLubricated = type === 'nominal' && Math.random() > 0.2; // 80% chance of oil if nominal
      const visualTheme = type === 'nominal' 
        ? (Math.random() > 0.5 ? 'brushed_steel' : 'ceramic_bearing') 
        : (Math.random() > 0.33 ? 'regolith_abrasion' : (Math.random() > 0.5 ? 'severe_rust' : 'fracture'));


      // --- 1. Generate Spectrogram (Real FFT Waterfall Plot in COLOR) ---
      const audioCanvas = document.createElement('canvas');
      audioCanvas.width = width;
      audioCanvas.height = height;
      const actx = audioCanvas.getContext('2d')!;

      // Create pixel buffer for direct manipulation (High Perf)
      const buffer = new Uint8ClampedArray(width * height * 4);
      const intensityBuffer = new Float32Array(width * height);

      // A. BASE NOISE FLOOR
      for (let i = 0; i < intensityBuffer.length; i++) {
          const noiseLevel = type === 'nominal' ? 10 : 30;
          intensityBuffer[i] = Math.random() * noiseLevel;
      }

      // B. GENERATE HARMONICS (Horizontal Lines)
      const harmonics = [1, 2, 3, 4, 5, 8];
      const baseFreq = isHighSpeed ? (100 + Math.random() * 50) : (40 + Math.random() * 20);
      
      harmonics.forEach(h => {
         const lineY = height - (baseFreq * h);
         if (lineY < 0) return;
         const strength = (type === 'nominal' ? 200 : 150) / Math.sqrt(h);
         
         for (let x = 0; x < width; x++) {
             const wobbleMag = type === 'nominal' ? 1 : 5;
             const fm = Math.sin(x * (0.01 + Math.random() * 0.005)) * wobbleMag;
             const yPos = lineY + fm;
             const spread = type === 'nominal' ? 2 : 6 + Math.random() * 4;
             
             for (let y = Math.floor(yPos - spread * 2); y <= Math.ceil(yPos + spread * 2); y++) {
                 if (y < 0 || y >= height) continue;
                 const dist = Math.abs(y - yPos);
                 const val = strength * Math.exp(-(dist * dist) / (spread * spread)); 
                 intensityBuffer[y * width + x] += val;
             }
         }
      });

      // C. CRITICAL ARTIFACTS
      if (type === 'critical') {
          const impacts = 15 + Math.floor(Math.random() * 20);
          for (let i = 0; i < impacts; i++) {
              const x = Math.floor(Math.random() * width);
              const w = 2 + Math.floor(Math.random() * 6); 
              for (let xx = x; xx < x + w && xx < width; xx++) {
                 for (let y = 0; y < height; y++) {
                     const val = (Math.random() * 120) * (1 - (y/height)*0.2); 
                     intensityBuffer[y * width + xx] += val;
                 }
              }
          }
      }

      // D. COLOR MAPPING (Magma/Inferno)
      for (let i = 0; i < width * height; i++) {
          const val = Math.min(255, intensityBuffer[i]);
          const t = val / 255;
          const idx = i * 4;

          let r, g, b;
          if (t < 0.2) { r = t * 400; g = 0; b = t * 600; } // Dark Purple
          else if (t < 0.4) { r = 80 + (t-0.2)*5 * 175; g = 0; b = 120 - (t-0.2)*5 * 120; } // Purple to Red
          else if (t < 0.6) { r = 255; g = (t-0.4)*5 * 140; b = 0; } // Red to Orange
          else if (t < 0.8) { r = 255; g = 140 + (t-0.6)*5 * 115; b = 0; } // Orange to Yellow
          else { r = 255; g = 255; b = (t-0.8)*5 * 255; } // Yellow to White

          buffer[idx] = r;
          buffer[idx+1] = g;
          buffer[idx+2] = b;
          buffer[idx+3] = 255;
      }

      const idata = new ImageData(buffer, width, height);
      actx.putImageData(idata, 0, 0);

      // Grid & Labels
      actx.fillStyle = '#FFFFFF';
      actx.font = '10px monospace';
      actx.globalAlpha = 0.5;
      actx.fillText(isHighSpeed ? "MODE: HIGH_RPM" : "MODE: LOW_RPM", 10, 20);


      // --- 2. Generate Visual Inspection (PHOTOREALISTIC MACRO) ---
      const visualCanvas = document.createElement('canvas');
      visualCanvas.width = width;
      visualCanvas.height = height;
      const vctx = visualCanvas.getContext('2d')!;

      const addTexture = (amount: number, alpha: number = 0.05) => {
         const texData = vctx.createImageData(width, height);
         const buf = new Uint32Array(texData.data.buffer);
         for (let i=0; i<buf.length; i++) {
            if (Math.random() < amount) {
                const val = Math.floor(Math.random() * 255);
                buf[i] = (Math.floor(alpha * 255) << 24) | (val << 16) | (val << 8) | val;
            }
         }
         const tmpCanvas = document.createElement('canvas');
         tmpCanvas.width = width; tmpCanvas.height = height;
         tmpCanvas.getContext('2d')!.putImageData(texData, 0, 0);
         vctx.drawImage(tmpCanvas, 0, 0);
      };

      const addVignette = () => {
         const grad = vctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.8);
         grad.addColorStop(0, 'rgba(0,0,0,0)');
         grad.addColorStop(1, 'rgba(0,0,0,0.6)');
         vctx.fillStyle = grad;
         vctx.fillRect(0,0,width,height);
      };

      if (visualTheme === 'brushed_steel') {
         const grad = vctx.createLinearGradient(0,0,width,height);
         grad.addColorStop(0, '#95a5a6');
         grad.addColorStop(0.5, '#bdc3c7');
         grad.addColorStop(1, '#7f8c8d');
         vctx.fillStyle = grad;
         vctx.fillRect(0,0,width,height);
         vctx.strokeStyle = 'rgba(255,255,255,0.03)';
         for(let i=0; i<2000; i++) {
             const x = Math.random() * width;
             vctx.beginPath();
             vctx.moveTo(x, 0);
             vctx.lineTo(x + (Math.random()-0.5)*50, height);
             vctx.stroke();
         }
         addTexture(0.5, 0.05);

      } else if (visualTheme === 'ceramic_bearing') {
         vctx.fillStyle = '#1c2833';
         vctx.fillRect(0,0,width,height);
         const grad = vctx.createRadialGradient(width*0.3, height*0.3, 10, width*0.3, height*0.3, 300);
         grad.addColorStop(0, '#34495e');
         grad.addColorStop(1, '#1c2833');
         vctx.fillStyle = grad;
         vctx.fillRect(0,0,width,height);
         addTexture(0.2, 0.02);

      } else if (visualTheme === 'regolith_abrasion') {
         vctx.fillStyle = '#7f8c8d';
         vctx.fillRect(0,0,width,height);
         addTexture(0.8, 0.1); 
         for(let i=0; i<30; i++) {
             vctx.lineWidth = 1 + Math.random() * 2;
             const x = Math.random() * width;
             const y = Math.random() * height;
             const len = 50 + Math.random() * 100;
             const angle = Math.random() * Math.PI * 2;
             vctx.strokeStyle = 'rgba(0,0,0,0.7)'; 
             vctx.beginPath(); vctx.moveTo(x,y); vctx.lineTo(x + Math.cos(angle)*len, y + Math.sin(angle)*len); vctx.stroke();
             vctx.strokeStyle = 'rgba(255,255,255,0.4)'; 
             vctx.beginPath(); vctx.moveTo(x+1, y+1); vctx.lineTo(x+1 + Math.cos(angle)*len, y+1 + Math.sin(angle)*len); vctx.stroke();
         }
         for(let i=0; i<200; i++) {
             const cx = Math.random() * width;
             const cy = Math.random() * height;
             const r = Math.random() * 4;
             vctx.fillStyle = Math.random() > 0.5 ? 'rgba(200,200,200,0.8)' : 'rgba(50,50,50,0.8)';
             vctx.beginPath();
             vctx.arc(cx, cy, r, 0, Math.PI*2);
             vctx.fill();
         }

      } else if (visualTheme === 'severe_rust') {
         vctx.fillStyle = '#3e2723'; 
         vctx.fillRect(0,0,width,height);
         for(let i=0; i<5000; i++) {
             const x = Math.random() * width;
             const y = Math.random() * height;
             const r = Math.random() * 20;
             const c = ['#bf360c', '#d84315', '#4e342e', '#8d6e63'][Math.floor(Math.random()*4)];
             vctx.fillStyle = c;
             vctx.globalAlpha = 0.4;
             vctx.beginPath();
             vctx.arc(x, y, r, 0, Math.PI*2);
             vctx.fill();
         }
         vctx.globalAlpha = 1.0;
         addTexture(0.5, 0.2);

      } else if (visualTheme === 'fracture') {
         vctx.fillStyle = '#95a5a6';
         vctx.fillRect(0,0,width,height);
         addTexture(0.4, 0.05);
         const path = [];
         let cx = width * 0.4 + (Math.random() * width * 0.2);
         let cy = 0;
         while(cy < height) {
             path.push({x: cx, y: cy});
             cy += 5 + Math.random() * 10;
             cx += (Math.random() - 0.5) * 15;
         }
         vctx.strokeStyle = '#000000'; vctx.lineWidth = 4;
         vctx.beginPath(); vctx.moveTo(path[0].x, path[0].y); path.forEach(p => vctx.lineTo(p.x, p.y)); vctx.stroke();
         vctx.strokeStyle = 'rgba(255,255,255,0.6)'; vctx.lineWidth = 1;
         vctx.beginPath(); vctx.moveTo(path[0].x - 2, path[0].y); path.forEach(p => vctx.lineTo(p.x - 2, p.y)); vctx.stroke();
      }

      if (isLubricated) {
          for(let i=0; i<5; i++) {
             const x = Math.random() * width;
             const y = Math.random() * height;
             const r = 50 + Math.random() * 150;
             const grad = vctx.createRadialGradient(x, y, 0, x, y, r);
             grad.addColorStop(0, 'rgba(255,255,255,0.4)');
             grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
             grad.addColorStop(1, 'rgba(255,255,255,0)');
             vctx.fillStyle = grad;
             vctx.globalCompositeOperation = 'overlay'; 
             vctx.beginPath();
             vctx.arc(x, y, r, 0, Math.PI*2);
             vctx.fill();
         }
         vctx.globalCompositeOperation = 'source-over';
         vctx.strokeStyle = 'rgba(20, 20, 20, 0.3)';
         vctx.lineWidth = 20;
         vctx.filter = 'blur(10px)';
         for(let i=0; i<3; i++) {
             vctx.beginPath();
             vctx.moveTo(Math.random()*width, 0);
             vctx.lineTo(Math.random()*width, height);
             vctx.stroke();
         }
         vctx.filter = 'none';
      }

      addVignette();
      const id = Math.floor(Math.random() * 10000);
      const speedTag = isHighSpeed ? 'HI_SPD' : 'LO_SPD';
      const lubTag = isLubricated ? 'OIL' : 'DRY';
      const audioName = `NASA_IMS_${id}_${speedTag}_${type === 'nominal' ? 'NOM' : 'CRIT'}.png`;
      const visualName = `PDS_CAM_${id}_${lubTag}_${visualTheme.toUpperCase()}.jpg`;

      resolve({
        audio: audioCanvas.toDataURL('image/png'),
        visual: visualCanvas.toDataURL('image/png'),
        audioName,
        visualName,
        audioUrl 
      });
    });
  };

  const loadSample = async (type: 'nominal' | 'critical') => {
    setIsLoadingSample(true);
    setAnalysisState(AnalysisState.IDLE);
    setErrorMsg(null);
    setResult(null);
    try {
      const { audio, visual, audioName, visualName, audioUrl } = await generateSampleData(type);
      const datasetIdVal = `SET-${Math.floor(Math.random()*1000)}-${type.toUpperCase()}`;
      setDatasetId(datasetIdVal);
      setSpectrogram({ file: new File([], audioName), previewUrl: audio, base64: audio, audioUrl: audioUrl });
      setVisual({ file: new File([], visualName), previewUrl: visual, base64: visual });
      setCustomPrompt("");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Failed to generate sample data: ${e.message}`);
      setAnalysisState(AnalysisState.ERROR);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleAnalyze = async () => {
    if (!spectrogram || !visual) return;
    setAnalysisState(AnalysisState.ANALYZING);
    setErrorMsg(null);
    setResult(null); 

    try {
      // 1. Perception Step (AI Neural Net)
      const analysis = await analyzeMissionData(spectrogram.base64, visual.base64, customPrompt);
      
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
            
            {/* Mission Brief & Sample Controls */}
            <div className="border-b border-gray-700 pb-8">
               <div className="flex justify-between items-start mb-2">
                 <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Data Injection</h2>
                 {datasetId && (
                    <span className="text-[10px] font-mono text-white bg-space-800 px-2 py-1 border border-gray-600">
                      {datasetId}
                    </span>
                 )}
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-6">
                 <button 
                   onClick={() => loadSample('nominal')}
                   disabled={isLoadingSample || analysisState === AnalysisState.ANALYZING}
                   className="text-xs bg-transparent hover:bg-white hover:text-black text-white border border-gray-500 rounded-none py-3 px-4 font-mono transition-colors uppercase flex items-center justify-center gap-2"
                 >
                    {isLoadingSample ? "Loading..." : "Load Nominal"}
                 </button>
                 <button 
                   onClick={() => loadSample('critical')}
                   disabled={isLoadingSample || analysisState === AnalysisState.ANALYZING}
                   className="text-xs bg-transparent hover:bg-white hover:text-black text-white border border-gray-500 rounded-none py-3 px-4 font-mono transition-colors uppercase flex items-center justify-center gap-2"
                 >
                    {isLoadingSample ? "Loading..." : "Load Critical"}
                 </button>
               </div>
            </div>

            {/* Inputs */}
            <div className="grid gap-8">
              {/* Input A: Audio/Spectrogram */}
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-gray-300">INPUT A: SPECTROGRAM</label>
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
                    <>
                      <img src={spectrogram.previewUrl} alt="Spectrogram" className="w-full h-full object-cover group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 left-2 bg-black text-white text-[10px] px-2 py-1 font-mono border border-gray-600">
                        {spectrogram.file.name}
                      </div>
                    </>
                  ) : (
                    <label htmlFor="spectrogram-upload" className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                      <span className="text-gray-400 text-xs uppercase tracking-widest">Select Source File</span>
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
