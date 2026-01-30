
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { AnalysisResult, SimulationState, ChatMessage, VisualizationStyle, GeometryType } from '../types';
import { interactWithSimulation } from '../services/geminiService';

interface SimulationViewProps {
  result: AnalysisResult | null;
  onBack: () => void;
}

// --- PHYSICS UTILS: Pseudo-Random Noise for Vertex Displacement ---
const simpleNoise = (x: number, y: number, z: number) => {
  return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453 % 1;
};

// --- HELPER: Visual Style Map ---
const useSmartMaterial = (simState: SimulationState) => {
  return useMemo(() => {
    const tempC = simState.flashTemperatureC || 20;
    const style = simState.visualizationStyle;
    const severity = simState.visualSeverity || 0;
    const mat = simState.detectedMaterial;
    const customColor = simState.customColor;
    
    // Intelligent Physics Layers
    const dustLevel = simState.dustAccumulation || 0;
    const corrosion = simState.corrosionSeverity || 0;

    // Base Material Props (Dynamic based on detected material)
    const props: any = {
      color: new THREE.Color(),
      emissive: new THREE.Color(),
      emissiveIntensity: 0,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false
    };
    
    // 1. MATERIAL BASE DEFAULTS
    if (mat === 'RUBBER_VITON') {
        props.color.setHex(0x1a1a1a); 
        props.metalness = 0.1; props.roughness = 0.9;
    } else if (mat === 'COPPER_BRONZE') {
        props.color.setHex(0xc1794b); 
        props.metalness = 0.9; props.roughness = 0.3;
    } else if (mat === 'COMPOSITE_CARBON') {
        props.color.setHex(0x111111); 
        props.metalness = 0.3; props.roughness = 0.7;
    } else if (mat === 'CERAMIC_SI3N4') {
        props.color.setHex(0xf5f5f5); 
        props.metalness = 0.1; props.roughness = 0.1;
    } else if (mat === 'TITANIUM_ALLOY') {
        props.color.setHex(0x6e6e6e); 
        props.metalness = 0.6; props.roughness = 0.4;
    } else if (mat === 'PLANETARY_ROCK') {
        props.color.setHex(0x595959); 
        props.metalness = 0.0; props.roughness = 1.0;
    }

    // 2. INTELLIGENT CONTRAST (Visibility Check)
    // Rule: Component must always be visible.
    if (customColor) {
        props.color.set(customColor);
    }
    
    // Check luminance. If too dark (< 0.15) and not glowing from heat, add ambient emissivity.
    const hsl = { h: 0, s: 0, l: 0 };
    props.color.getHSL(hsl);
    if (hsl.l < 0.15 && tempC < 200) {
        // "Night Vision" logic: Boost emissive in the same hue
        props.emissive.copy(props.color);
        props.emissiveIntensity = 0.3; 
    }

    // 3. PHYSICAL WEATHERING LAYERS (Dust & Corrosion)
    if (dustLevel > 0) {
        // Dust makes things lighter (grey) and rougher
        const dustColor = new THREE.Color(0x888888);
        props.color.lerp(dustColor, dustLevel * 0.7); // Blend base color with dust
        props.roughness = Math.min(1.0, props.roughness + dustLevel * 0.8);
        props.metalness = Math.max(0.0, props.metalness - dustLevel * 0.8); // Dust isn't shiny
    }

    if (corrosion > 0) {
        // Rust makes things orange/brown and rough
        const rustColor = new THREE.Color(0x8B4513); // SaddleBrown
        props.color.lerp(rustColor, corrosion * 0.8);
        props.roughness = Math.min(1.0, props.roughness + corrosion * 0.5);
    }

    // 4. VISUALIZATION STYLES (No Overlay Masking)
    if (style === 'WIREFRAME_DEBUG') {
      props.color.setHex(0x00FF00);
      props.wireframe = true;
      props.emissive.setHex(0x003300);
      props.emissiveIntensity = 0.5;
    }
    else if (style === 'HIGH_CONTRAST_BLUE' && !customColor) {
      props.color.setHSL(0.6, 1.0, 0.5); // Blue Base
      const brightness = Math.min(tempC / 500, 1.0);
      props.emissive.setHSL(0.6, 0.5, brightness);
      props.emissiveIntensity = 0.5 + brightness;
    }
    else if (style === 'THERMAL_HEATMAP') {
       // Physics-based Blackbody radiation simulation
       const t = Math.min(Math.max(tempC, 0) / 1200, 1);
       
       if (tempC > 200) {
          // Heat Override: Materials glow red/orange/white
          const heatColor = new THREE.Color();
          heatColor.setHSL(0.05 + (1-t)*0.1, 1.0, 0.5 * t); // Red -> Yellow -> White
          props.emissive.copy(heatColor);
          props.emissiveIntensity = (tempC - 200) / 400;
       } else if (!customColor) {
           // Cool state
           // Maintain material base color (already set above)
       }
    }
    else if (style === 'STRESS_FIELD') {
        const chaos = simState.audioChaos || 0;
        props.color.setHSL(0.0 + (1.0 - chaos) * 0.3, 1.0, 0.5);
        props.emissive.setHSL(0.0, 1.0, chaos * 0.5);
        props.emissiveIntensity = chaos;
    }

    return props;
  }, [simState]);
};


// --- ADVANCED GEOMETRY: Deformable Mesh ---

const DeformableMesh = ({ 
  baseGeometry, 
  simState, 
  rotationSpeed = 0 
}: { 
  baseGeometry: THREE.BufferGeometry, 
  simState: SimulationState, 
  rotationSpeed?: number 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matProps = useSmartMaterial(simState);
  
  // Clone geometry once so we can mutate it safely
  const geometry = useMemo(() => baseGeometry.clone(), [baseGeometry]);
  
  // Store original positions for reference (rest state)
  const originalPositions = useMemo(() => {
    return geometry.attributes.position.array.slice(); // Deep copy
  }, [geometry]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 1. Rotation Logic (Only if speed set and Integrity OK)
    const integrity = simState.structuralIntegrity !== undefined ? simState.structuralIntegrity : 1.0;
    
    if (rotationSpeed !== 0 && integrity > 0.2) {
        meshRef.current.rotation.y += rotationSpeed * integrity; // Slow down if broken
    }
    
    // 2. Vertex Displacement Logic
    const positions = geometry.attributes.position;
    const count = positions.count;
    const time = state.clock.getElapsedTime();

    // Physics Factors
    const vibration = simState.audioChaos || 0; 
    const wear = simState.wearVolume || 0; 
    const corrosion = simState.corrosionSeverity || 0;
    const dust = simState.dustAccumulation || 0;
    
    const isSurface = simState.activeGeometry === 'PLANETARY_SURFACE';
    const isBellows = simState.activeGeometry === 'BELLOWS_JOINT';

    const wearFactor = Math.min(wear * 5e8, 2.0); 

    for (let i = 0; i < count; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];

        // Normal Calculation approx
        const len = Math.sqrt(ox*ox + oy*oy + oz*oz);
        let nx = ox / len;
        let ny = oy / len;
        let nz = oz / len;
        if (isSurface) { nx = 0; ny = 1; nz = 0; }

        // A. VIBRATION (High Frequency Jitter)
        let vibX = 0, vibY = 0, vibZ = 0;
        if (vibration > 0.1) {
            const freq = 30 + (vibration * 60);
            const mag = vibration * 0.15 * integrity; // Breaks don't vibrate uniformly
            vibX = Math.sin(time * freq + i) * mag;
            vibY = Math.cos(time * freq + i) * mag;
            vibZ = Math.sin(time * freq + i * 0.5) * mag;
        }

        // B. WEAR (Shrinkage)
        const wearX = -nx * wearFactor;
        const wearY = -ny * wearFactor;
        const wearZ = -nz * wearFactor;

        // C. CORROSION & DUST (Surface Noise)
        let surfX = 0, surfY = 0, surfZ = 0;
        const noiseVal = simpleNoise(ox * 5, oy * 5, oz * 5);
        
        if (corrosion > 0) {
            // Pitting: Inward spikes
            const pit = (noiseVal - 0.7); 
            if (pit > 0) {
                 const depth = pit * corrosion * 1.5;
                 surfX -= nx * depth;
                 surfY -= ny * depth;
                 surfZ -= nz * depth;
            }
        }
        
        if (dust > 0) {
            // Accretion: Outward lumps
            const lump = (noiseVal - 0.4);
            if (lump > 0) {
                const height = lump * dust * 0.5;
                 surfX += nx * height;
                 surfY += ny * height;
                 surfZ += nz * height;
            }
        }

        // D. CATASTROPHIC FAILURE (Structural Collapse)
        let failX = 0, failY = 0, failZ = 0;
        if (integrity < 0.9 && !isSurface) {
            const collapseFactor = (1.0 - integrity);
            // Warping
            failX = Math.sin(oy * 0.5) * collapseFactor * 2.0;
            
            // Crushing (Y-axis compression)
            failY = -oy * collapseFactor * 0.5; 
            
            // Explosion/Expansion
            failZ = Math.cos(ox * 0.5) * collapseFactor * 2.0;
        }

        // SPECIAL GEOMETRY LOGIC
        let geoX = 0, geoZ = 0;
        if (isBellows) {
            const ridges = Math.sin(oy * 5.0); 
            const radialPush = ridges * 0.5; 
            if (Math.sqrt(nx*nx + nz*nz) > 0) {
               geoX += (nx / Math.sqrt(nx*nx + nz*nz)) * radialPush;
               geoZ += (nz / Math.sqrt(nx*nx + nz*nz)) * radialPush;
            }
        }

        // Apply
        positions.setXYZ(
            i,
            ox + vibX + wearX + surfX + failX + geoX,
            oy + vibY + wearY + surfY + failY,
            oz + vibZ + wearZ + surfZ + failZ + geoZ
        );
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals(); 
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
};

// --- PARTICLE SYSTEMS ---

const DustStorm = ({ density = 0.2 }: { density?: number }) => {
    // Clamp density
    const d = Math.max(0, Math.min(1.0, density));
    if (d === 0) return null;

    const count = Math.floor(d * 5000); 
    const speed = 0.2 + (d * 0.8); 

    return (
        <Sparkles 
          count={count}
          scale={30}
          size={2 + d * 3}
          speed={speed}
          opacity={0.4 + d * 0.4}
          color="#A3A3A3" // Lunar Grey
        />
    );
};

// NEW: FRICTION SPARKS (Physics Interaction)
const FrictionSparks = ({ intensity }: { intensity?: number }) => {
    if (!intensity || intensity < 0.1) return null;
    
    // Intensity defines amount and wildness
    const count = Math.floor(intensity * 100);
    
    return (
       <Sparkles
         count={count}
         scale={12} // Localized to the part
         size={6 + intensity * 4}
         speed={2 + intensity * 2}
         opacity={1.0}
         color="#FFCC00" // Gold/Orange sparks
         noise={1} // Chaotic movement
       />
    );
}

// --- DYNAMIC LIGHTING (Chaos Flicker) ---
const DynamicLighting = ({ chaos }: { chaos: number }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    useFrame((state) => {
        if (!lightRef.current) return;
        if (chaos > 0.3) {
            const flicker = Math.random() * chaos * 2.0;
            lightRef.current.intensity = 1.0 + Math.sin(state.clock.elapsedTime * 20) * flicker;
        } else {
            lightRef.current.intensity = 1.0;
        }
    });
    return (
        <group>
            <pointLight ref={lightRef} position={[10, 10, 10]} intensity={1.0} />
            {/* Intelligent Contrast Backlight: Ensures silhouette is visible */}
            <spotLight position={[-15, 5, -10]} intensity={2.0} color="#333333" />
        </group>
    );
};


// --- MAIN VIEW ---

const SimulationView: React.FC<SimulationViewProps> = ({ result, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- ENVIRONMENT DEDUCTION KERNEL ---
  const deduceInitialState = (): SimulationState => {
      const p = result?.perception;
      const ph = result?.physics;
      
      let geo: GeometryType = 'TOROIDAL_SEAL';
      
      // 1. INFER GEOMETRY
      if (p?.detectedComponent === 'SEAL') geo = 'TOROIDAL_SEAL';
      else if (p?.detectedComponent === 'BEARING') geo = 'HELICAL_ACTUATOR';
      else if (p?.detectedComponent === 'JOINT') geo = 'BELLOWS_JOINT';
      else if (p?.detectedComponent === 'MECHANISM') geo = 'LATCH_MECHANISM';
      
      // Material Fallbacks
      else if (p?.detectedMaterial === 'CERAMIC_SI3N4') geo = 'HELICAL_ACTUATOR'; 
      else if (p?.detectedMaterial === 'RUBBER_VITON') geo = 'TOROIDAL_SEAL'; 
      else if (p?.detectedMaterial === 'COMPOSITE_CARBON') geo = 'LATCH_MECHANISM'; 
      else if (p?.detectedMaterial === 'COPPER_BRONZE') geo = 'HELICAL_ACTUATOR'; 
      else if (p?.detectedMaterial === 'PLANETARY_ROCK') geo = 'PLANETARY_SURFACE';
      
      // 2. INFER VISUAL STYLE
      let style: VisualizationStyle = 'THERMAL_HEATMAP';
      if ((p?.visualSeverity || 0) > 0.7) style = 'WIREFRAME_DEBUG'; 
      else if ((ph?.flashTemperatureC || 0) < 50 && (p?.visualSeverity || 0) < 0.2) style = 'HIGH_CONTRAST_BLUE'; 
      
      return {
        flashTemperatureC: ph?.flashTemperatureC || 20,
        wearVolume: ph?.wearVolume || 0,
        audioChaos: p?.audioChaos || 0,
        visualSeverity: p?.visualSeverity || 0,
        isRegolith: p?.detectedContaminant === 'REGOLITH_DUST',
        particleDensity: p?.detectedContaminant === 'REGOLITH_DUST' ? 0.3 : 0, 
        // NEW DEFAULTS
        dustAccumulation: p?.detectedContaminant === 'REGOLITH_DUST' ? 0.4 : 0,
        corrosionSeverity: p?.detectedContaminant === 'OXIDATION' ? 0.5 : 0,
        structuralIntegrity: 1.0,
        sparksIntensity: (p?.audioChaos || 0) > 0.7 ? 0.5 : 0, // Initial friction check
        detectedMaterial: p?.detectedMaterial || 'UNKNOWN',
        gravity: 0.16,
        activeGeometry: geo,
        visualizationStyle: style,
        customColor: undefined 
      };
  };

  const [simState, setSimState] = useState<SimulationState>(deduceInitialState());

  useEffect(() => {
    // STARTUP SEQUENCE LOGS
    const initLogs: ChatMessage[] = [
        { role: 'ai', text: `SYSTEM INITIALIZED.`, timestamp: new Date(), isSystemEvent: true },
        { role: 'ai', text: `> GEOMETRY DERIVED: ${simState.activeGeometry.replace('_', ' ')}`, timestamp: new Date(), isSystemEvent: true },
        { role: 'ai', text: `> MATERIAL: ${simState.detectedMaterial.replace('_', ' ')}`, timestamp: new Date(), isSystemEvent: true },
        { role: 'ai', text: `> ENVIRONMENT: ${simState.isRegolith ? 'HIGH PARTICULATE (REGOLITH)' : 'NOMINAL VACUUM'}`, timestamp: new Date(), isSystemEvent: true },
        { role: 'ai', text: `DIGITAL TWIN ONLINE. Physics state synced with telemetry.`, timestamp: new Date() }
    ];
    setMessages(initLogs);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (result?.audioUrl && audioRef.current) audioRef.current.play().catch(() => {}); }, [result]);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const historyStrings = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`);
      const response = await interactWithSimulation(historyStrings, simState, userMsg.text);
      
      // SHOW PHYSICS REASONING LOG
      if (response.physicsReasoning) {
          setMessages(prev => [...prev, { 
              role: 'ai', 
              text: `[KERNEL_PHYSICS_LOG] ${response.physicsReasoning}`, 
              timestamp: new Date(), 
              isSystemEvent: true 
          }]);
      }

      const aiMsg: ChatMessage = { role: 'ai', text: response.response, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      
      if (response.updatedState) {
          setSimState(prev => {
              const newState = { ...prev, ...response.updatedState };
              if (response.updatedState.customColor === null) delete newState.customColor;

              // STATE CHANGE LOGS
              if (response.updatedState.structuralIntegrity !== undefined && response.updatedState.structuralIntegrity < 0.5) {
                   setMessages(curr => [...curr, { role: 'ai', text: `[ALERT] STRUCTURAL YIELD DETECTED. Integrity: ${(response.updatedState!.structuralIntegrity! * 100).toFixed(0)}%`, timestamp: new Date(), isSystemEvent: true }]);
              }
              if (response.updatedState.sparksIntensity && response.updatedState.sparksIntensity > 0) {
                   setMessages(curr => [...curr, { role: 'ai', text: `[SYS] High Friction detected. Sparks rendered.`, timestamp: new Date(), isSystemEvent: true }]);
              }
              if (response.updatedState.customColor) {
                  setMessages(curr => [...curr, { role: 'ai', text: `[SYS] Material Albedo Override: ${response.updatedState?.customColor}`, timestamp: new Date(), isSystemEvent: true }]);
              }

              return newState;
          });
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "ERROR: Uplink connection lost.", timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Precompute geometries
  const torusGeo = useMemo(() => new THREE.TorusGeometry(10, 3, 64, 64), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(10, 10, 10, 16, 16, 16), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(4, 4, 12, 32, 16), []);
  const bellowsGeo = useMemo(() => new THREE.CylinderGeometry(6, 6, 18, 32, 64), []);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(50, 50, 64, 64), []);

  return (
    <div className="w-full h-full min-h-[700px] flex flex-col bg-black border-2 border-space-700 animate-fade-in-up">
      {/* 3D VIEWPORT */}
      <div className="relative flex-grow bg-space-900 overflow-hidden min-h-[400px]">
         {/* HUD */}
         <div className="absolute top-4 left-4 z-10 pointer-events-none">
             <div className="bg-black/50 backdrop-blur border border-white/20 p-4">
                 <h2 className="text-xl font-bold tracking-widest text-lunar-success">VIGILANT KERNEL v3.0</h2>
                 <div className="mt-2 text-xs space-y-1 text-gray-300 font-mono">
                     <p>GEO: {simState.activeGeometry}</p>
                     <p>INTEGRITY: {((simState.structuralIntegrity ?? 1) * 100).toFixed(0)}%</p>
                     <p>DUST ADHESION: {((simState.dustAccumulation || 0) * 100).toFixed(0)}%</p>
                     <p>CORROSION: {((simState.corrosionSeverity || 0) * 100).toFixed(0)}%</p>
                 </div>
             </div>
         </div>

         <Canvas camera={{ position: [15, 15, 15], fov: 45 }}>
            <color attach="background" args={['#050505']} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            <DustStorm density={simState.particleDensity || (simState.isRegolith ? 0.3 : 0)} />
            <FrictionSparks intensity={simState.sparksIntensity || (simState.audioChaos > 0.5 ? simState.audioChaos : 0)} />
            
            <ambientLight intensity={0.2} />
            <DynamicLighting chaos={simState.audioChaos || 0} />
            
            <spotLight position={[-10, 20, 0]} angle={0.3} intensity={2} castShadow />
            <OrbitControls autoRotate autoRotateSpeed={0.5} />
            
            <group position={[0, 0, 0]}>
                {simState.activeGeometry === 'TOROIDAL_SEAL' && <DeformableMesh baseGeometry={torusGeo} simState={simState} rotationSpeed={0.01} />}
                {simState.activeGeometry === 'HELICAL_ACTUATOR' && <DeformableMesh baseGeometry={cylGeo} simState={simState} rotationSpeed={0.05} />}
                {simState.activeGeometry === 'BELLOWS_JOINT' && <DeformableMesh baseGeometry={bellowsGeo} simState={simState} />}
                {simState.activeGeometry === 'LATCH_MECHANISM' && <DeformableMesh baseGeometry={boxGeo} simState={simState} />}
                {simState.activeGeometry === 'PLANETARY_SURFACE' && (
                    <group rotation={[-Math.PI/2, 0, 0]}>
                        <DeformableMesh baseGeometry={planeGeo} simState={simState} />
                    </group>
                )}
            </group>

            <gridHelper args={[50, 50, 0x333333, 0x111111]} position={[0, -5, 0]} />
         </Canvas>
      </div>

      {/* TERMINAL */}
      <div className="w-full bg-black border-t border-gray-700 flex flex-col h-[300px]">
         <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-space-800">
             <span className="text-xs uppercase tracking-widest text-lunar-warning font-mono">Cmd Uplink</span>
             <button onClick={onBack} className="text-xs hover:text-white text-gray-400 underline decoration-dotted font-mono">CLOSE TWIN</button>
         </div>
         {result?.audioUrl && <audio ref={audioRef} src={result.audioUrl} loop className="hidden" />}
         
         <div className="flex-grow overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] p-3 border ${msg.isSystemEvent ? 'border-dashed border-gray-600 text-gray-400 w-full text-center' : (msg.role === 'user' ? 'border-white bg-space-800 text-white' : 'border-lunar-success bg-black text-lunar-success')}`}>
                        {!msg.isSystemEvent && <div className="mb-1 text-[8px] opacity-50 uppercase">{msg.role}</div>}
                        {msg.text}
                    </div>
                </div>
            ))}
            <div ref={chatEndRef} />
         </div>

         <div className="p-4 bg-space-900 border-t border-gray-700 flex gap-2">
             <span className="text-lunar-success pt-2 font-mono">{'>'}</span>
             <textarea 
                value={input} onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                className="w-full bg-transparent text-white focus:outline-none resize-none h-12 text-xs font-mono"
                placeholder="Enter command (e.g., 'Make it hot', 'Change color to red', 'Show dust storm')"
             />
             <button onClick={handleSendMessage} disabled={isProcessing || !input.trim()} className="px-4 border border-gray-600 hover:bg-white hover:text-black uppercase text-xs font-mono">Send</button>
         </div>
      </div>
    </div>
  );
};

export default SimulationView;
