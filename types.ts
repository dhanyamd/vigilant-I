
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
  | 'PLANETARY_SURFACE'; // NEW: For ground/terrain simulation

export type VisualizationStyle = 'THERMAL_HEATMAP' | 'HIGH_CONTRAST_BLUE' | 'WIREFRAME_DEBUG' | 'STRESS_FIELD';

export interface SimulationState {
  flashTemperatureC: number;
  wearVolume: number;
  audioChaos: number;
  visualSeverity: number;
  isRegolith: boolean;
  detectedMaterial: string;
  gravity: number; // 1.0 = Earth, 0.16 = Moon
  activeGeometry: GeometryType; // Switchable 3D models
  visualizationStyle: VisualizationStyle; // Decouples "Looks" from "Physics"
  
  // NEW: Robust interaction controls
  customColor?: string; // Explicit color override from chat
  particleDensity?: number; // 0.0 to 1.0 (Airborne Dust)
  
  // INTELLIGENT PHYSICS LAYERS
  dustAccumulation?: number; // 0.0 to 1.0 (Surface Adhesion due to Electrostatics)
  corrosionSeverity?: number; // 0.0 to 1.0 (Surface Pitting/Oxidation)
  structuralIntegrity?: number; // 1.0 (Perfect) to 0.0 (Collapsed/Broken)
  sparksIntensity?: number; // 0.0 to 1.0 (Friction sparks)
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
