

export interface GeminiPerception {
  visualSeverity: number; // 0.0 to 1.0 (0 = pristine, 1 = destroyed)
  audioChaos: number; // 0.0 to 1.0 (0 = harmonic, 1 = chaotic)
  
  // Expanded Material List for better accuracy
  detectedMaterial: 
    | 'TITANIUM_ALLOY' 
    | 'STAINLESS_STEEL' 
    | 'CERAMIC_SI3N4' 
    | 'ALUMINUM_7075' 
    | 'RUBBER_VITON' 
    | 'COMPOSITE_CARBON' 
    | 'COPPER_BRONZE'
    | 'PLANETARY_ROCK' // NEW: For surface/environment scans
    | 'UNKNOWN';

  detectedComponent: 'SEAL' | 'BEARING' | 'JOINT' | 'MECHANISM' | 'UNKNOWN'; 
  
  // NEW: Determines the physical force applied in the equation. 
  // A tiny latch (MICRO) has different thermodynamics than a wheel (LARGE).
  componentScale: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'HEAVY_MACHINERY';

  detectedContaminant: 'REGOLITH_DUST' | 'METAL_FRAGMENTS' | 'OXIDATION' | 'NONE';
  
  lubricationState: 'DRY' | 'DEGRADED' | 'NOMINAL';
  estimatedSpeed: 'LOW' | 'MEDIUM' | 'HIGH'; 
  reasoning: string;
}

export interface PhysicsComputation {
  // Tribology (Archard)
  wearCoefficientK: number;
  hardnessH: number;
  wearVolume: number; 
  appliedLoadN: number; // The base static load
  dynamicLoadN: number; // NEW: The actual load including vibration shock (Input A)
  
  // Thermodynamics (Blok)
  frictionCoefficient: number; // Mu
  flashTemperatureC: number; // Estimated peak temp at contact
  thermalConductivity: number; // NEW: Exposed for UI to avoid guessing
  
  // Mechanics (Fatigue)
  dynamicLoadFactor: number;
  fatigueLifeHours: number; // L10 Life estimate

  // Aggregate
  failureProbability: number; 
  rulHours: number; 
  status: 'GO' | 'NO-GO' | 'WARNING';
  
  // Verification Trace
  equationLogic?: string; // The step-by-step math substitution
}

export interface AnalysisResult {
  perception: GeminiPerception;
  physics: PhysicsComputation;
  audioUrl?: string; // Passed down for playback
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string; // NEW: To distinguish Image vs Audio
  audioUrl?: string; // NEW: Supports actual audio playback
}

export enum AnalysisState {
  IDLE,
  ANALYZING,
  COMPLETE,
  ERROR
}

// --- SIMULATION TYPES ---

export type GeometryType = 
  | 'TOROIDAL_SEAL' 
  | 'HELICAL_ACTUATOR' 
  | 'BELLOWS_JOINT' 
  | 'LATCH_MECHANISM' 
  | 'PLANETARY_SURFACE' // NEW: For ground/terrain simulation
  | 'CUSTOM'; // NEW: For arbitrary user requests

export type VisualizationStyle = 'THERMAL_HEATMAP' | 'HIGH_CONTRAST_BLUE' | 'WIREFRAME_DEBUG' | 'STRESS_FIELD';

export interface SimulationState {
  // CORE STATE
  flashTemperatureC: number;
  wearVolume: number;
  audioChaos: number;
  visualSeverity: number;
  isRegolith: boolean;
  detectedMaterial: string;
  gravity: number; // 1.0 = Earth, 0.16 = Moon
  activeGeometry: GeometryType; // Switchable 3D models
  visualizationStyle: VisualizationStyle; // Decouples "Looks" from "Physics"
  
  // INTERACTIVE PHYSICS & ANIMATION HOOKS
  customColor?: string; // Explicit color override
  particleDensity?: number; // 0.0 to 1.0 (Airborne Dust/Suspension)
  dustAccumulation?: number; // 0.0 to 1.0 (Surface Adhesion/Clumping)
  corrosionSeverity?: number; // 0.0 to 1.0 (Chemical Surface Decay)
  structuralIntegrity?: number; // 1.0 (Solid) to 0.0 (Collapsed)
  sparksIntensity?: number; // 0.0 to 1.0 (Friction Sparks)

  // ROBUST PHYSICS CONTROLS
  materialStiffness?: number; // 0.0 (Liquid/Elastic) to 1.0 (Brittle/Cryo)
  occlusionFactor?: number; // 0.0 (Visible) to 1.0 (Hidden -> Triggers Ghost Layer)
  yieldPoint?: number; // Threshold where bending becomes breaking
  thermalConductivity?: number; // 0-1, drives heat spread speed
  frictionCoefficient?: number; // 0-2, drives audioChaos animation
  cycleCount?: number; // Tracks fatigue history

  // AI RENDERING ENGINE OVERRIDES (Anti-Blob Logic)
  vertexNoise?: number;      // 0.0 (Smooth) to 2.0 (Jagged/Spiked)
  buckleFactor?: number;     // 0.0 (Straight) to 1.0 (Bent/Warped)
  fractureState?: number;    // 0.0 (Solid) to 1.0 (Broken/Separated)
  
  // GEOMETRY DERIVATION (New)
  radialWarp?: number;       // 0.0 to 1.0 (Side-to-side bending)
  axialCompression?: number; // 0.5 (Squashed) to 1.5 (Stretched)
  displacementScale?: number;// Multiplier for noise/fracture distance
  
  // MATERIAL PROPERTIES
  metalnessOverride?: number;
  roughnessOverride?: number;
  emissiveOverride?: string;
  emissiveIntensityOverride?: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isSystemEvent?: boolean; 
}

export interface SimulationUpdateCommand {
  response: string;
  physicsReasoning?: string; // NEW: The "Thinking" logic log
  updatedState?: Partial<SimulationState>; 
}
