
import { GoogleGenAI } from "@google/genai";
import { GeminiPerception, SimulationState, SimulationUpdateCommand, PhysicsComputation } from "../types";

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
const MODEL_GOOGLE = "gemini-3-flash-preview"; 
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
  "physicsReasoning": "string",
  "updatedState": {
    "flashTemperatureC": number | null,
    "wearVolume": number | null,
    "audioChaos": number | null,
    "visualSeverity": number | null,
    "isRegolith": boolean | null,
    "particleDensity": number | null, 
    "dustAccumulation": number | null,
    "corrosionSeverity": number | null,
    "structuralIntegrity": number | null,
    "sparksIntensity": number | null,
    "detectedMaterial": string | null,
    "activeGeometry": "TOROIDAL_SEAL" | "HELICAL_ACTUATOR" | "BELLOWS_JOINT" | "LATCH_MECHANISM" | "PLANETARY_SURFACE" | null,
    "visualizationStyle": "THERMAL_HEATMAP" | "HIGH_CONTRAST_BLUE" | "WIREFRAME_DEBUG" | "STRESS_FIELD" | null,
    "customColor": string | null
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
           if (p.type === 'image_url') return { inlineData: { mimeType: 'image/png', data: cleanBase64(p.image_url.url) } };
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
  spectrogramBase64: string,
  visualBase64: string,
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

  TASK: Extract OBSERVABLE VARIABLES from imagery. 
  YOU MUST DECIDE THE MATERIAL BASED ON VISUAL EVIDENCE (LUSTER, COLOR, TEXTURE).

  1. SPECTROGRAM ANALYSIS (Audio):
     - Horizontal Lines = Harmonic (Low Chaos)
     - Vertical Smears/Mess = Broadband Noise (High Chaos)
     - Output 'audioChaos' (0.0-1.0).

  2. VISUAL MATERIAL IDENTIFICATION (Strict Look-up Table):
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

  const userContent = [
    { type: "text", text: `Extract physical variables. ${userPrompt || ""}` },
    { type: "image_url", image_url: { url: `data:image/png;base64,${cleanBase64(spectrogramBase64)}` } },
    { type: "image_url", image_url: { url: `data:image/png;base64,${cleanBase64(visualBase64)}` } }
  ];

  const raw = await generateContent(systemPrompt, userContent);
  return parseGeminiResponse<GeminiPerception>(raw);
};

export const interactWithSimulation = async (
  history: string[],
  currentState: SimulationState,
  userMessage: string
): Promise<SimulationUpdateCommand> => {
  const systemPrompt = `You are the Kernel Interface for the Vigilant-L Digital Twin.
  
  YOUR GOAL: Translate natural language into a PRECISE PHYSICS STATE.
  
  RULES FOR INTELLIGENT PHYSICS LOGIC:
  
  1. PARTICLE INTERACTION (Sparks & Dust):
     - If user implies friction, grinding, or 'high RPM': Set 'sparksIntensity' > 0.6.
     - If user says "Mars" or "Moon" or "Dusty":
       - Mars: 'particleDensity' = 0.6 (Fine dust), 'dustAccumulation' = 0.4.
       - Moon: 'particleDensity' = 0.0 (Vacuum), 'dustAccumulation' = 0.8 (Electrostatic Cling).
     - REASONING: "Vacuum environment implies static charging; maximizing surface adhesion."

  2. INTELLIGENT CONTRAST (Visibility):
     - If user asks for dark colors (Black, Deep Blue) or if 'flashTemperatureC' is low (< -100):
     - ACTION: Ensure 'customColor' logic allows for self-illumination (handled by frontend).
     - REASONING: "Adjusting spectral response for low-albedo visibility."

  3. PHYSICAL DEFORMATION (No Masking):
     - NEVER USE "FAILURE OVERLAYS". 
     - If user mentions "failure", "damage", "broken":
     - ACTION: Reduce 'structuralIntegrity' < 0.3. Increase 'visualSeverity' > 0.8.
     - REASONING: "Simulating plastic deformation and vertex displacement to represent failure."

  4. THERMODYNAMICS & CORROSION:
     - If "Acid" or "Time": Increase 'corrosionSeverity'.
     - If "Heat" or "Friction": Increase 'flashTemperatureC'.

  CONTROLS:
  - 'particleDensity': 0.0=Clear, 1.0=Heavy Storm (Airborne).
  - 'dustAccumulation': 0.0=Clean, 1.0=Caked On (Surface).
  - 'sparksIntensity': 0.0=None, 1.0=Heavy Grinding Sparks.
  - 'corrosionSeverity': 0.0=New, 1.0=Rusted Through.
  - 'structuralIntegrity': 1.0=Solid, 0.0=Shattered/Collapsed.
  - 'customColor': Hex String (e.g. '#0000FF').
  - 'flashTemperatureC': Max 2000.
  - 'audioChaos': 0-1.0 (Vibration).

  Return JSON Schema: ${SIMULATION_SCHEMA_TEXT}
  IMPORTANT: Populate 'physicsReasoning' with your technical logic.`;
  
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
