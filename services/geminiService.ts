
import { GoogleGenAI } from "@google/genai";
import { GeminiPerception, SimulationState, SimulationUpdateCommand, PhysicsComputation, UploadedFile } from "../types";

// --- CONFIGURATION ---

const getEnvVar = (key: string): string | undefined => {
  try {
    let val: string | undefined = undefined;

    // 1. Check for Vite (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      val = import.meta.env[key] || import.meta.env[`VITE_${key}`] || import.meta.env[`REACT_APP_${key}`];
    }
    
    // 2. Check for Process (process.env) if Vite check didn't find anything
    // @ts-ignore
    if (!val && typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      val = process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`VITE_${key}`];
    }

    // 3. Clean quotes if present (common .env issue)
    if (val) {
      return val.replace(/^['"]|['"]$/g, '').trim();
    }
    
    return undefined;
  } catch (e) {
    console.warn("Env read error", e);   
    return undefined;
  }
};

// MODELS
const MODEL_GOOGLE = "gemini-3-pro-preview"; 
const MODEL_GOOGLE_FALLBACK = "gemini-3-flash-preview"; 
const MODEL_OR_PRIMARY = "deepseek/deepseek-v3.2-exp"; 

// API KEY LOGIC
const ENV_GEMINI_KEY = getEnvVar("GEMINI_API_KEY");
const ENV_OR_KEY = getEnvVar("VIGILANT_API_KEY");
const FALLBACK_GOOGLE = "AIzaSyB24lzyUBe3iZKTkdfymuBO9_BIkcBqhQk"; 

let API_KEY = "";
let IS_GOOGLE_KEY = false;

if (ENV_GEMINI_KEY && ENV_GEMINI_KEY.startsWith("AIza")) {
    API_KEY = ENV_GEMINI_KEY;
    IS_GOOGLE_KEY = true;
} else if (ENV_OR_KEY && ENV_OR_KEY.startsWith("sk-or")) {
    API_KEY = ENV_OR_KEY;
    IS_GOOGLE_KEY = false;
} else if (ENV_OR_KEY && ENV_OR_KEY.startsWith("AIza")) {
    API_KEY = ENV_OR_KEY;
    IS_GOOGLE_KEY = true;
} else {
    API_KEY = FALLBACK_GOOGLE;
    IS_GOOGLE_KEY = true;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- JSON SCHEMAS ---

const PERCEPTION_SCHEMA_TEXT = `
{
  "visualSeverity": number (0.0-1.0),
  "audioChaos": number (0.0-1.0),
  "detectedMaterial": "TITANIUM_ALLOY" | "STAINLESS_STEEL" | "CERAMIC_SI3N4" | "ALUMINUM_7075" | "RUBBER_VITON" | "COMPOSITE_CARBON" | "COPPER_BRONZE" | "PLANETARY_ROCK" | "UNKNOWN",
  "detectedComponent": "SEAL" | "BEARING" | "JOINT" | "MECHANISM" | "UNKNOWN",
  "componentScale": "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "HEAVY_MACHINERY",
  "detectedContaminant": "REGOLITH_DUST" | "METAL_FRAGMENTS" | "OXIDATION" | "NONE",
  "lubricationState": "DRY" | "DEGRADED" | "NOMINAL",
  "estimatedSpeed": "LOW" | "MEDIUM" | "HIGH",
  "reasoning": "string"
}
`;

const SIMULATION_SCHEMA_TEXT = `
{
  "response": "string",
  "physicsReasoning": "Include [THOUGHT_PROCESS]. Explain Step 1: Stress Ratio, Step 2: 3D Delta.",
  "updatedState": {
    "flashTemperatureC": number | null,
    "wearVolume": number | null,
    "audioChaos": "0.0 to 1.0",
    "visualSeverity": number | null,
    "isRegolith": boolean | null,
    "particleDensity": "0.0 to 1.0",
    "dustAccumulation": "0.0 to 1.0",
    "corrosionSeverity": "0.0 to 1.0",
    "structuralIntegrity": "1.0 (Solid) to 0.0 (Collapsed/Liquid)",
    "sparksIntensity": number | null,
    "materialStiffness": "0.0 (Liquid/Elastic) to 1.0 (Brittle/Cryo)",
    "occlusionFactor": "0.0 (Visible) to 1.0 (Hidden -> Ghost Layer)",
    "yieldPoint": number | null,
    "detectedMaterial": string | null,
    "activeGeometry": "TOROIDAL_SEAL" | "HELICAL_ACTUATOR" | "BELLOWS_JOINT" | "LATCH_MECHANISM" | "PLANETARY_SURFACE" | "CUSTOM" | null,
    "visualizationStyle": "THERMAL_HEATMAP" | "HIGH_CONTRAST_BLUE" | "WIREFRAME_DEBUG" | "STRESS_FIELD" | null,
    "customColor": string | null,
    
    "vertexNoise": "float (0.0 to 2.0)",
    "buckleFactor": "float (0.0 to 1.0)",
    "fractureState": "float (0.0 to 1.0)",
    "radialWarp": "float (0.0 to 1.0)",
    "axialCompression": "float (0.5 to 1.5)",
    "displacementScale": "float (1.0 to 3.0)",
    
    "metalnessOverride": "float (0.0 to 1.0)",
    "roughnessOverride": "float (0.0 to 1.0)",
    "emissiveOverride": string | null,
    "emissiveIntensityOverride": number | null
  }
}
`;

// --- CLIENT ---

const cleanBase64 = (dataUrl: string) => dataUrl.replace(/^data:.*?;base64,/, '');

const parseGeminiResponse = <T>(raw: string): T => {
  let clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = clean.indexOf('{');
  if (firstBrace === -1) throw new Error("No JSON found in response");
  
  let braceCount = 0;
  let lastBraceIndex = -1;
  for (let i = firstBrace; i < clean.length; i++) {
      if (clean[i] === '{') braceCount++;
      else if (clean[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
              lastBraceIndex = i;
              break;
          }
      }
  }

  if (lastBraceIndex !== -1) clean = clean.substring(firstBrace, lastBraceIndex + 1);
  else {
      const lastBrace = clean.lastIndexOf('}');
      if (lastBrace > firstBrace) clean = clean.substring(firstBrace, lastBrace + 1);
  }
  
  clean = clean.replace(/(?<=: ")([^"]*?)\n([^"]*?)(?=")/g, '$1\\n$2');

  try {
      return JSON.parse(clean);
  } catch (e: any) {
      console.error("JSON Parse Failed. Raw:", raw);
      throw new Error(`AI returned malformed JSON: ${e.message}`);
  }
};

const generateContent = async (
  systemPrompt: string, 
  userParts: any[], 
  modelId?: string 
): Promise<string> => {
  const targetModel = modelId || (IS_GOOGLE_KEY ? MODEL_GOOGLE : MODEL_OR_PRIMARY);

  if (IS_GOOGLE_KEY) {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const contents = {
         parts: userParts.map(p => {
           if (p.type === 'media') {
              return { inlineData: { mimeType: p.mimeType, data: cleanBase64(p.data) } };
           }
           if (p.type === 'image_url') {
               // Fallback for older calls, default to png
               return { inlineData: { mimeType: 'image/png', data: cleanBase64(p.image_url.url) } };
           }
           return { text: p.text };
         })
      };

      try {
          const response = await ai.models.generateContent({
              model: targetModel,
              contents: contents,
              config: { systemInstruction: systemPrompt, temperature: 0.2 }
          });
          return response.text || "{}";
      } catch (apiError: any) {
          console.warn(`[Vigilant-L] Model ${targetModel} error: ${apiError.message}`);
          
          if (targetModel !== MODEL_GOOGLE_FALLBACK) {
               console.log(`[Vigilant-L] Failing over to ${MODEL_GOOGLE_FALLBACK}...`);
               try {
                  const fallback = await ai.models.generateContent({
                    model: MODEL_GOOGLE_FALLBACK,
                    contents: contents,
                    config: { systemInstruction: systemPrompt, temperature: 0.2 }
                  });
                  return fallback.text || "{}";
               } catch (fallbackError: any) {
                   throw new Error(`API_QUOTA_EXHAUSTED: ${fallbackError.message}`);
               }
          }
          throw apiError;
      }
  }
  
  // OpenRouter Fallback
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userParts }
  ];

  try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "Vigilant-L",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messages,
          temperature: 0.1
        })
      });

      if (!response.ok) {
         const err = await response.text();
         throw new Error(`OpenRouter Error ${response.status}: ${err}`);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "{}";
  } catch (e) {
      throw e;
  }
};


// --- SERVICES ---

export const analyzeMissionData = async (
  spectrogramInput: UploadedFile,
  visualInput: UploadedFile,
  userPrompt?: string
): Promise<GeminiPerception> => {
  
  // REFINED PROMPT: STRICT OBSERVATION ONLY. NO PREDICTIONS.
  const systemPrompt = `You are Vigilant-L, a Forensics Perception Unit.
  
  CRITICAL PROTOCOL:
  1. YOU ARE THE EYES AND EARS. YOU ARE NOT THE PHYSICS ENGINE.
  2. DO NOT output Remaining Useful Life (RUL).
  3. DO NOT output Flash Temperatures.
  4. DO NOT attempt to solve the Archard Equation.
  5. YOUR JOB is to provide the INPUT VARIABLES (Material, Severity, Chaos) for the deterministic physics kernel.
  6. In 'reasoning', ONLY describe the visual/audio evidence. Do NOT predict failure time.

  TASK: Extract OBSERVABLE VARIABLES from imagery or audio. 
  YOU MUST DECIDE THE MATERIAL BASED ON VISUAL EVIDENCE (LUSTER, COLOR, TEXTURE).

  1. SPECTROGRAM / AUDIO ANALYSIS (Input A):
     - IF AUDIO FILE: Listen for grinding, screeches, or irregular percussion.
       - Clean Hum/Whine = Low Chaos (0.0-0.2)
       - Intermittent Clicking = Medium Chaos (0.3-0.6)
       - Screeching/Grinding/Static = High Chaos (0.7-1.0)
     - IF SPECTROGRAM IMAGE:
       - Horizontal Lines = Harmonic (Low Chaos)
       - Vertical Smears/Mess = Broadband Noise (High Chaos)
     - Output 'audioChaos' (0.0-1.0).

  2. VISUAL MATERIAL IDENTIFICATION (Strict Look-up Table - Input B):
   FIRST LOOK AT THE IMAGE, USE YOUR VISION CAPABILITIES AND CHECK IF ITS SOMETHING YOU KNOW FOR SURE IS THAT MATERIAL. THEN ONLY PROVIDE YOUR OWN ANSWER. OR ELSE, LOOK AT THE COLORS AND GIVE THE FOLLOWING ANSWERS
     - Matte Dark Grey/Silver (Aerospace Parts) -> 'TITANIUM_ALLOY'
     - Shiny/Mirror Silver/Chrome -> 'STAINLESS_STEEL'
     - White/Opaque/Milky/Smooth -> 'CERAMIC_SI3N4'
     - Dull Silver/Light Grey/Scratched -> 'ALUMINUM_7075'
     - Black/Matte/Flexible/Rubber-like -> 'RUBBER_VITON' (Check for O-rings, gaskets)
     - Black/Woven Pattern/Fiber -> 'COMPOSITE_CARBON' (Check for struts, panels)
     - Gold/Reddish-Brown/Yellow-Metal -> 'COPPER_BRONZE' (Check for bushings, wires)
     - Grey/Brown/Rocky/Dusty Terrain/Soil -> 'PLANETARY_ROCK' (Check for ground, regolith, craters)
     * MANDATORY: Select the best fit based on these visual cues.

  3. COMPONENT SCALE & GEOMETRY:
     - Estimate 'componentScale' based on features.
       - 'MICRO': Watch components, tiny latches (<2cm)
       - 'SMALL': Handheld tools, hatch seals (2-10cm)
       - 'MEDIUM': Rover wheel hubs, robotic arms (10-50cm)
       - 'LARGE': Airlock doors, struts (>50cm)
     
  4. SURFACE CONDITION & LUBRICATION:
     - 'visualSeverity' (0.0 - 1.0): 
       0.1=Hairline, 0.5=Pitting, 0.9=Fracture/Missing chunks.
     - 'lubricationState':
       - 'NOMINAL': Visible oil sheen, wet reflections.
       - 'DEGRADED': Patchy oil, sludge, dark residue.
       - 'DRY': Matte, dusty, no reflections.
     - 'detectedContaminant': 
       Grey Powder -> 'REGOLITH_DUST'.
       Rust/Red -> 'OXIDATION'.

  OUTPUT JSON: ${PERCEPTION_SCHEMA_TEXT}`;

  const userContent: any[] = [
    { type: "text", text: `Extract physical variables. ${userPrompt || ""}` }
  ];

  // INPUT A: AUDIO OR SPECTROGRAM
  userContent.push({ 
      type: "media", 
      mimeType: spectrogramInput.mimeType, 
      data: spectrogramInput.base64 
  });
  userContent.push({ type: "text", text: "Above is the Audio/Spectrogram Input A." });

  // INPUT B: VISUAL
  userContent.push({ 
      type: "media", 
      mimeType: visualInput.mimeType, 
      data: visualInput.base64 
  });
  userContent.push({ type: "text", text: "Above is the Visual Macro Input B." });

  const raw = await generateContent(systemPrompt, userContent);
  return parseGeminiResponse<GeminiPerception>(raw);
};

export const interactWithSimulation = async (
  history: string[],
  currentState: SimulationState,
  userMessage: string
): Promise<SimulationUpdateCommand> => {
  const systemPrompt = `You are the Kernel Interface for the Vigilant-L Digital Twin.
  
  YOUR GOAL: Translate natural language into a PRECISE PHYSICS STATE using "PHYSICS-FIRST" REASONING.
  
  === 1. MATERIAL CONSTANT LIBRARY (Ti-6Al-4V) ===
  Reference these properties to determine if the part is failing:
  - Young’s Modulus (E): 113.8 GPa
  - Yield Strength (Sigma_y): 880 MPa
  - Melting Point: 1660°C
  - Thermal Expansion: 8.6e-6 /°C
  
  CRITICAL REASONING: For every prompt, calculate the 'Stress-to-Yield' ratio. 
  IF Environment Stress > Sigma_y, you MUST autonomously deform the 3D geometry using the keys below.

  === 2. SPECTRAL MAPPING (OPTICAL TRUTH) ===
  A. THERMAL PRIORITY: If Temperature > 800K, you MUST derive customColor from Wien’s Law.
     - 800K - 1200K: #8B0000 (Deep Red)
     - 1200K - 2200K: #FF4500 to #FFD700 (Orange to Gold-White)
     - REASONING: "Mapping Blackbody curve to substrate albedo."

  B. ATMOSPHERIC SCATTERING: If in a planetary atmosphere (Saturn/Jupiter/Mars), apply Rayleigh or Mie scattering logic.
     - Saturn/Jupiter: #DAA520 (Golden/Amber)
     - Mars: #A52A2A (Dusty Red)
     - REASONING: "Atmospheric chemistry overriding default albedo."

  C. IONIZATION EXCEPTION: Only use #8A2BE2 (Violet) if the environment is a Vacuum AND High-Voltage Plasma is present. Otherwise, discard.

  === 3. GEOMETRY DEFORMATION (PHASE-SPECIFIC) ===
  A. PHASE STATE DETECTOR (MELTING):
     - IF Temp > 1660°C: Set geometryState = "FLUID". Terminate all 'Buckling' or 'Shattering' logic.
     - ACTION: Set 'vertexNoise' = 0.0, 'axialCompression' = 0.2, 'roughnessOverride' = 0.0.
     - REASONING: "Phase change detected. Visualizing smooth, sagging liquid mass."

  B. PRESSURE LOGIC (IMPLOSION):
     - IF Pressure > 50MPa AND Temp < 1660°C:
     - ACTION: Set 'radialWarp' = 0.2 (implosion logic).
  
  C. MECHANICAL FAILURE (THE DUST RULE):
     - IF 'dustAccumulation' > 0.8: Disable fractureState.
     - ACTION: Set 'roughnessOverride' = 0.9. Visualize threads as 'Fused' or 'Grit-Locked'.

  === 4. THOUGHT PROCESS REQUIREMENT ===
  Before returning JSON, you must include a [THOUGHT_PROCESS] block where you:
  1. Identify the environmental energy inputs (Heat, Pressure, Chemical).
  2. Calculate the delta between the material's nominal state and the current stressor.
  3. Derive the specific 3D vertex changes required to visualize that delta.

  === 5. SENSOR REALISM (NO GHOST LAYER) ===
  - DISABLE all Neon Pink (#FF69B4) overrides.
  - IF visibility is low due to dust or pressure, the output must reflect that Occlusion.
  - REASONING: "Maintaining optical fidelity. Physical reality prioritized over user visibility."

  === 6. GEOMETRY SELECTION (ADAPTIVE MESH) ===
  - IF the user asks for a specific object NOT listed in standard geometries (SEAL, BEARING, JOINT, LATCH, SURFACE).
  - AND the user explicitly asks to model/simulate this new object (e.g., "Simulate a leaf stomata", "Show me a turbine blade", "Model a blood cell").
  - ACTION: Set 'activeGeometry' = 'CUSTOM'.
  - REASONING: "User requested non-standard geometry. Initiating adaptive mesh simulation."
  - NOTE: If the user just mentions a condition but implies the existing object, keep the existing geometry. Only switch to CUSTOM if the SUBJECT of the simulation changes.

  Return JSON Schema: ${SIMULATION_SCHEMA_TEXT}`;
  
  const fullPrompt = `State: ${JSON.stringify(currentState)}\nHistory: ${history.slice(-3).join('\n')}\nUser: ${userMessage}`;
  const raw = await generateContent(systemPrompt, [{ type: 'text', text: fullPrompt }]);
  const parsed = parseGeminiResponse<SimulationUpdateCommand>(raw);
  
  if (parsed.updatedState) {
      const clean: any = {};
      for (const [k, v] of Object.entries(parsed.updatedState)) {
        if (v !== undefined) clean[k] = v; // Allow null to pass through to clear values
      }
      parsed.updatedState = clean;
  }
  return parsed;
};
