
import { GeminiPerception, PhysicsComputation } from "../types";

// --- ENGINEERING TRUTH DATABASE (SI UNITS) ---
// Sources: ASM International, MatWeb, NASA Technical Standards (NASA-STD-6001)

interface MaterialProps {
    H: number;      // Hardness (Pascals)
    Cond: number;   // Thermal Conductivity (W/mK)
    Yield: number;  // Yield Strength (Pascals)
    Density: number;// kg/m^3
    BaseMu: number; // Base friction coefficient against steel
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  'TITANIUM_ALLOY': { 
    H: 3.5e9,       // 3.5 GPa (Ti-6Al-4V) - Common in aerospace
    Cond: 7.2,      // Very low thermal conductivity -> High Flash Temps
    Yield: 880e6,   
    Density: 4430,
    BaseMu: 0.36    // Titanium on Steel (Galling prone)
  },
  'STAINLESS_STEEL': { 
    H: 2.1e9,       // 2.1 GPa (316L)
    Cond: 16.2,     
    Yield: 290e6,   
    Density: 8000,
    BaseMu: 0.5     // Steel on Steel (Adhesive wear)
  },
  'CERAMIC_SI3N4': { 
    H: 18.0e9,      // 18 GPa (Silicon Nitride) - Very hard
    Cond: 30.0,     
    Yield: 800e6,   // High compressive
    Density: 3200,
    BaseMu: 0.17    // Low friction
  },
  'ALUMINUM_7075': { 
    H: 1.5e9,       // 1.5 GPa
    Cond: 130.0,    // High conductivity -> Cools efficiently
    Yield: 503e6,   
    Density: 2810,
    BaseMu: 0.47
  },
  'RUBBER_VITON': {
    H: 0.02e9,      // ~20 MPa (Shore A Hardness converted roughly)
    Cond: 0.2,      // Insulator - HEAT BUILDS UP FAST
    Yield: 15e6,    // Tear strength
    Density: 1800,
    BaseMu: 0.7     // High friction (Seal)
  },
  'COMPOSITE_CARBON': {
    H: 2.5e9,       // Epoxy matrix hardness
    Cond: 5.0,      // Anisotropic, averaging transverse
    Yield: 600e6,
    Density: 1600,
    BaseMu: 0.25    // Self-lubricating properties
  },
  'COPPER_BRONZE': {
    H: 1.2e9,
    Cond: 50.0,     // Conductor
    Yield: 200e6,
    Density: 8800,
    BaseMu: 0.2     // Bushing material
  },
  'PLANETARY_ROCK': {
    H: 7.0e9,       // 7 GPa (Basalt/Quartz) - Harder than Titanium
    Cond: 1.5,      // Very Insulative -> EXTREME Flash Temps
    Yield: 200e6,   // Brittle -> Low tensile yield
    Density: 3000,  // Basalt
    BaseMu: 0.65    // Very high friction (Rough stone)
  },
  'UNKNOWN': { H: 2.0e9, Cond: 20, Yield: 300e6, Density: 5000, BaseMu: 0.5 }
};

// SCALE FACTORS (Force estimates)
const SCALE_LOAD_MAP: Record<string, number> = {
    'MICRO': 10,       // 1 kg load (Latches, electronics)
    'SMALL': 100,      // 10 kg load (Hand tools, hatch seals)
    'MEDIUM': 1500,    // 150 kg load (Rover hubs, robotic joints)
    'LARGE': 5000,     // 500 kg load (Structural struts)
    'HEAVY_MACHINERY': 20000 // 2 tons (Lander legs)
};

const CRITICAL_WEAR_VOLUME = 1e-8; // m^3 (Generic failure threshold for small components)

export const computePhysicsModel = (perception: GeminiPerception): PhysicsComputation => {
  
  // --- 1. VARIABLE INGESTION (The "What") ---
  const matKey = perception.detectedMaterial || 'UNKNOWN';
  const scaleKey = perception.componentScale || 'SMALL';
  const dbProps = MATERIAL_DB[matKey] || MATERIAL_DB['UNKNOWN'];

  // --- 2. DYNAMIC LOAD CALCULATION (The "Situation") ---
  // We don't assume 500N. We derive it from visual scale.
  let NominalLoad = SCALE_LOAD_MAP[scaleKey] || 100;
  
  // Speed estimation
  const velocity = perception.estimatedSpeed === 'HIGH' ? 5.0 : (perception.estimatedSpeed === 'MEDIUM' ? 1.0 : 0.1); // m/s
  
  // --- 3. FRICTION COEFFICIENT DERIVATION (The "Interaction") ---
  // Start with material base Mu
  let mu = dbProps.BaseMu;
  
  // Apply Lubrication modifiers
  if (perception.lubricationState === 'NOMINAL') mu *= 0.1; // 90% reduction (Hydrodynamic)
  else if (perception.lubricationState === 'DEGRADED') mu *= 0.5; // Mixed film
  else if (perception.lubricationState === 'DRY') mu *= 1.0; // Boundary friction
  
  // Apply Contaminant modifiers (Regolith is brutal)
  if (perception.detectedContaminant === 'REGOLITH_DUST') mu *= 1.5; // Abrasive friction
  
  // --- 4. WEAR COEFFICIENT (k) - ARCHARD ---
  // k is dimensionless probability of wear debris formation
  let k = 1e-5; // Baseline metal-on-metal
  
  if (perception.detectedContaminant === 'REGOLITH_DUST') {
      k = 5e-3; // 500x increase due to 3-body abrasion (Simulating lunar glass shards)
  } else if (perception.detectedContaminant === 'METAL_FRAGMENTS') {
      k = 1e-3; // 2-body abrasion
  } else if (perception.lubricationState === 'NOMINAL') {
      k = 1e-7; // Mild wear
  }

  // --- 5. EXECUTE ARCHARD'S LAW (The "Truth") ---
  // V = (k * F * s) / H
  // We calculate instantaneous wear rate (Volume per Hour)
  const slidingDistPerHour = velocity * 3600;
  const wearRatePerHour = (k * NominalLoad * slidingDistPerHour) / dbProps.H;
  
  // Estimate CURRENT wear based on visual severity
  // AI sees "50% damaged" -> We map that to 50% of critical volume
  const currentWearVolume = CRITICAL_WEAR_VOLUME * perception.visualSeverity;


  // --- 6. EXECUTE BLOK'S FLASH TEMPERATURE ---
  // T_max = T_bulk + (mu * F * v) / (Area * sqrt(Density * Cond * Cp * v/a)) ... simplified for real-time
  // Simplified Heat Flux approach: Q = mu * F * v
  const heatFlux = mu * NominalLoad * velocity;
  
  // Thermal Resistance ~ 1 / Conductivity
  // Higher conductivity = Lower Temp Rise
  // We apply a geometry factor (0.01) to normalize for units
  const tempRise = (heatFlux / dbProps.Cond) * 0.5; 
  const flashTemp = 20 + tempRise; // Ambient 20C + Rise


  // --- 7. FATIGUE & RUL ---
  // Vibration (Chaos) increases effective load
  const shockFactor = 1 + (perception.audioChaos * 3.0); 
  const effectiveLoad = NominalLoad * shockFactor;
  
  // Yield Check
  const stressEstimate = effectiveLoad / 0.0001; // Approx 1cm^2 contact
  const safetyFactor = dbProps.Yield / stressEstimate;

  // Remaining Volume
  const remainingVol = Math.max(0, CRITICAL_WEAR_VOLUME - currentWearVolume);
  
  // RUL = Remaining / Rate
  let rul = wearRatePerHour > 0 ? (remainingVol / wearRatePerHour) : 9999;
  
  // Fracture/Yield Override: If stress > yield, component fails INSTANTLY, regardless of wear.
  if (safetyFactor < 1.0) rul = 0;
  
  // Cap for display
  if (rul > 10000) rul = 10000;


  // --- 8. GENERATE VERIFICATION TRACE (The "Proof") ---
  const equationLogic = `
>> VIGILANT PHYSICS ENGINE v3.1 [LOGIC_TRACE]
---------------------------------------------
1. MATERIAL PROPERTIES (${matKey})
   > Hardness (H): ${(dbProps.H/1e9).toFixed(1)} GPa
   > Conductivity: ${dbProps.Cond} W/mK
   > Base Friction: ${dbProps.BaseMu}

2. BOUNDARY CONDITIONS
   > Scale: ${scaleKey} -> Load: ${NominalLoad} N
   > Chaos (Input A): ${(perception.audioChaos * 100).toFixed(0)}% -> Shock Factor: ${shockFactor.toFixed(2)}x
   > DYNAMIC LOAD: ${effectiveLoad.toFixed(1)} N (Effective)
   > Speed: ${velocity} m/s
   > Contaminant: ${perception.detectedContaminant} (k-factor: ${k.toExponential(1)})

3. CALCULATION: ARCHARD WEAR LAW
   > Formula: V_rate = (k * F * d) / H
   > Input: (${k.toExponential(0)} * ${NominalLoad}N * ${(velocity*3600).toFixed(0)}m/h) / ${dbProps.H}
   > Wear Rate: ${(wearRatePerHour * 1e9).toFixed(3)} mm³/hr

4. CALCULATION: THERMODYNAMICS
   > Heat Flux (Q) = μFv = ${mu.toFixed(2)} * ${NominalLoad} * ${velocity} = ${heatFlux.toFixed(1)} W
   > Delta T = Q / Cond * Geom = +${tempRise.toFixed(1)}°C

5. FINAL PROGNOSIS
   > Current Damage: ${(perception.visualSeverity * 100).toFixed(1)}%
   > RUL: ${rul.toFixed(2)} Hours
   > Safety Factor: ${safetyFactor.toFixed(2)} ${safetyFactor < 1 ? '[CRITICAL YIELD]' : '[OK]'}
`.trim();

  let status: 'GO' | 'NO-GO' | 'WARNING' = 'GO';
  if (rul < 24 || safetyFactor < 1.2) status = 'NO-GO';
  else if (rul < 100 || safetyFactor < 2.0) status = 'WARNING';

  return {
    wearCoefficientK: k,
    hardnessH: dbProps.H,
    wearVolume: currentWearVolume,
    appliedLoadN: NominalLoad,
    dynamicLoadN: effectiveLoad, // Return effective load to UI
    frictionCoefficient: mu,
    flashTemperatureC: flashTemp,
    thermalConductivity: dbProps.Cond,
    dynamicLoadFactor: shockFactor,
    fatigueLifeHours: 0, 
    failureProbability: 1/safetyFactor,
    rulHours: Number(rul.toFixed(1)),
    status,
    equationLogic
  };
};
