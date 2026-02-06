# Testing Guide

## Setup

1. Go to the **images** folder for sample inputs.

## Inputs

**Input A (Spectrogram / Audio)**

- Select `1.png` or `2.png`, or upload your own audio file.

**Input B (Visual)**

- Select `3.png`, `4.png`, or `5.png`, or upload your own image.

## Steps

1. Run the **Analysis**.
2. Optionally ask follow-up questions in the **Parameter Override** input box.
3. Click **Initialize 3D Digital Twin**.

The first simulation shows the 3D view based on the analysis results.

---

## Sample Commands (Command Uplink Terminal)

Use these prompts in the Digital Twin terminal to test different behaviors.

I highly urge you to use **your own prompts** related to science, space, and physics for best results.

start with simple prompts like 
1) how would torroid seal react on the surface of uranus?
2) impact of bellows joints on martian surface while a dust storm?
3) how would the material react on 600kC or -90C or 10kPa etc

### Quick Tests

#### Environmental Simulation

> *"Simulate a high-velocity dust storm on the Martian surface with heavy regolith accumulation."*

*Effect:* Background dust turns red/rust and particle density increases.

#### Structural Stress Test

> *"Apply 500 MPa of compressive pressure until the structure yields and fractures."*

*Effect:* Tests mesh warping, bending, and fracture behavior.

#### Material Phase Change

> *"Switch material to Titanium Alloy and heat to melting point (1660°C) to show phase change."*

*Effect:* Triggers liquid-state logic; object glows and sags/melts.

#### Diagnostic Visualization

> *"Enable X-ray vision to reveal internal stress concentrations and hidden porosity."*

*Effect:* Ghost Layer mode—semi-transparent object with internal emissive lighting.

#### Adaptive Geometry (Text-to-3D)

> *"Morph the geometry into a 'Turbine Blade' and simulate corrosion from acid rain."*

*Effect:* Switches to CUSTOM geometry and applies texture/noise.

---

## Advanced Science Prompts

### 1. Molecular Stress (Material Science)

*Purpose:* Find the breaking point of a material under extreme pressure (e.g. Titanium vs. Diamond).

> "Execute a Finite Element Analysis (FEA) on a solid 10cm cube of Titanium-6Al-4V vs. Synthetic Monocrystalline Diamond. Subject both to 100 GPa of hydrostatic pressure (simulating a gas giant's core). Render the Stress Distribution Heatmap. Identify the exact coordinate of the first Molecular Lattice Fracture and explain why the covalent bonds in the diamond eventually reach a 'Shatter Point' despite their hardness."

### 2. Atmospheric Re-entry (Aerodynamics)

*Purpose:* Test how shapes handle extreme friction and heat flux.

> "Simulate a Non-Ablative Ceramic Heat Shield (Silicon Carbide) shaped as a Biconic Capsule. Model its descent through a high-density CO2 atmosphere at Mach 25. Calculate the Plasma Sheath Ionization levels around the leading edge. Render the Thermal Gradient from the outer skin to the internal payload bay. If the temperature exceeds 2,500°C, simulate the Structural Deformation and identify the 'Melting Flow' pattern."

### 3. Orbital Mechanics & Lagrange (Astrophysics)

*Purpose:* Map how an object stays fixed between two celestial bodies (e.g. Sun and Earth).

> "Map the Gravitational Potential Well between the Sun and Earth. Identify the L1 and L2 Lagrange Points. Simulate a 500kg satellite at L1. Model the Solar Radiation Pressure (SRP) acting as a 'Solar Sail' and calculate the Station-Keeping Delta-V required to prevent the satellite from being pushed out of orbit. Render the Three-Body Problem orbital paths in a rotating frame of reference."

### 4. Hyper-Velocity Impact (Kinetic Physics)

*Purpose:* See what happens when materials collide at space-travel speeds.

> "Simulate a Kinetic Energy Impactor (Tungsten Rod) striking a Multilayer Whipple Shield at 15 km/s. Model the Shockwave Propagation through the Aluminum and Kevlar layers. Use the Mie-Grüneisen Equation of State to calculate the phase change of the tungsten upon impact. Visualize the Ejecta Cloud and the resulting crater geometry in the secondary hull plating."

### 5. Quantum Tunneling (Micro-Electronics)

*Purpose:* Test how signals move through materials at very small scale.

> "Simulate a Gallium Nitride (GaN) Semiconductor at the 2nm scale. Model the Electron Mobility under a high-frequency electromagnetic field. Calculate the probability of Quantum Tunneling through the insulating barriers. If the gate leakage exceeds 5%, suggest a Doping Alteration or a shift to Graphene Nanoribbons to maintain signal integrity at 100GHz frequencies."

---

## Structural & Aerospace Prompts

### Structural Integrity (Materials Science)

*Focus:* Comparing strong materials under extreme pressure.

> "Perform a Finite Element Analysis (FEA) comparing a single-crystal Synthetic Diamond and a Ti-6Al-4V (Titanium Alloy) lattice. Subject both to 100 GPa of hydrostatic pressure and a thermal gradient of 2,000°C. Identify the exact point of Molecular Lattice Slip and render a Stress-Strain Heatmap to show where the covalent bonds reach their elastic limit before catastrophic fracture."

### Atmospheric Plasma (Aerospace)

*Focus:* Melting and plasma during high-speed atmospheric travel.

> "Simulate a Biconic Re-entry Vehicle utilizing a Silicon Carbide (SiC) Heat Shield. Model the descent at Mach 20 through a high-density CO2 atmosphere. Calculate the Stagnation Point Temperature and the resulting Plasma Sheath Ionization. Visualize the Ablative Char-Layer formation and explain how the phase change of the shield material protects the internal payload through latent heat of sublimation."

### Orbital Stability (Astrophysics)

*Focus:* Lagrange points and keeping a station fixed between Sun and Earth.

> "Map the Gravitational Potential Well of the Sun-Earth system. Identify the L1 Lagrange Point and simulate the orbital stability of a 1,000kg satellite. Factor in Solar Radiation Pressure (SRP) as a continuous perturbation force. Render the Three-Body Problem trajectories and calculate the Delta-V requirements for a halo orbit to maintain a constant line-of-sight communication link to Earth."

### Waveguide Communication (Electromagnetics)

*Focus:* Sending data through a solar flare environment.

> "Model a Phased-Array Antenna composed of 1,000 Gallium Nitride (GaN) micro-oscillators. Simulate a 100 GHz data transmission through a high-density Solar Plasma environment. Calculate the Faraday Rotation and signal attenuation caused by solar magnetic flux. Identify the optimal Beamforming Geometry (Fractal vs. Linear) required to maintain a coherent signal-to-noise ratio over 150 million kilometers."

### Hyper-Velocity Kinetic (Space Defense)

*Focus:* Impact of space debris at 15 km/s.

> "Simulate a Hyper-Velocity Impact (HVI) of a 10g aluminum projectile striking a Multilayer Whipple Shield at 15 km/s. Use the Mie-Grüneisen Equation of State to model the shockwave propagation through the shield's layers. Visualize the Ejecta Cloud and Plasma Flash upon impact. Calculate the residual kinetic energy remaining after the projectile passes through the first three layers of the 'Hardened' lattice."

---

## Geometry & Visualization Prompts

### Ferrofluid Spike (Magnetic Geometry)

*Shape:* Thorn/spiky look using magnetism.

> "Simulate a Ferrofluid under a high-intensity Magnetic Gradient. Trigger the Rosensweig Instability to form 1,000 individual 'Needle' peaks. Render the material with a Metallic Chrome finish. This geometry demonstrates how a liquid can form rigid, jagged spikes when aligned with external force lines."

### Quasicrystal Lattice (Non-Repeating Symmetry)

*Shape:* Aperiodic 3D structure that never repeats.

> "Model a 3D Quasicrystal based on Penrose Tiling logic. The lattice should consist of 1,000 interconnected nodes forming a non-repeating geometric foam. Subject the structure to Radial Torsion to show how the 'aperiodic' bonds prevent a single line of fracture, unlike a standard cubic crystal."

### Chladni Resonant Burst (Vibration Patterns)

*Shape:* Flower/star shapes from sound/vibration frequencies.

> "Visualize a 3D Chladni Pattern inside a spherical resonant cavity. Set the frequency to a High-Order Harmonic. Map 1,000 particles to the Nodal Points (areas of zero vibration). The resulting shape should be a Symmetric Star-Burst, demonstrating how kinetic energy organizes matter into complex, spiky geometry."

### Critical Opalescence (Spectral Colors)

*Color:* Gold-to-violet transition using phase physics.

> "Simulate a gas at its Critical Point (where gas and liquid become one). Render the Rayleigh Scattering effect as density fluctuates. The color spectrum should shift from Deep Amber (#FFBF00) to Electric Violet (#8A2BE2). This visualizes the 'Spectral Shift' caused by extreme pressure and temperature changes in a supercritical fluid."

### Tensegrity Web (Structural Tension)

*Shape:* Hollow/web look using tension instead of solid blocks.

> "Design a Tensegrity Fractal Web composed of 1,000 compressed struts and tensioned cables. The structure must be hollow and porous, allowing for high-speed gas flow through the center. This geometry maximizes the Strength-to-Weight Ratio and provides a blueprint for structures that must withstand high-velocity wind without collapsing."

---

## Physics Challenge Prompts

### Material Science Baseline (Hard Physics)

*Objective:* Resolve extreme pressure and heat in a constrained geometry.

> "Perform a structural simulation on a 1,000-node lattice composed of a Silicon-Carbon Ceramic.
>
> Environment: 100 GPa hydrostatic pressure / 3,000°C thermal load.
>
> Constraint: Standard cubic geometry is prohibited.
>
> Task: Reason a new structural topology that avoids brittle fracture while maintaining a 95% signal transparency. Show the resulting Stress-Strain Map and define the 'Failure Point' of the covalent bonds."

### Solar Plasma Logic (State Physics)

*Objective:* Transition from solid to energy-dominated engineering.

> "Simulate a data-relay station positioned at the Solar Chromosphere.
>
> Problem: All standard terrestrial metals and crystals will sublimate at this temperature.
>
> Necessary Data: Environment is dominated by Magnetohydrodynamics (MHD) and ionized hydrogen.
>
> Task: Define a state of matter or a Dissipative Structure that can maintain a coherent 100 GHz beam-width despite material phase-transition. Determine the optimal Ionization Spectrum required for the signal to bypass solar interference."

### Planetary Interface (Environmental Physics)

*Objective:* Bridge two different planetary environments.

> "Model a Trans-Solar Communication Link between a high-friction/low-pressure environment (Mars) and a high-radiation/plasma environment (The Sun).
>
> Variable A: Mars atmosphere (600 Pa, high-velocity particulate abrasive).
>
> Variable B: Solar Flare (10^7 Kelvin, electromagnetic flux).
>
> Task: Reason a Universal Signal Transducer that can exist in both environments. Explain the geometric shift required for the structure to move from 'Abrasive-Resistant' to 'Radiative-Resistant' without losing data integrity."

### Signal Propagation (Wave Physics)

*Objective:* Solve communication math over long distance.

> "Calculate the Signal Attenuation for a 150-million-kilometer transmission through a fluctuating magnetic field.
>
> Parameters: Use 1,000 distributed relay points. Assume a Phased-Array configuration.
>
> Task: Reason the most efficient Beamforming Geometry to minimize 'Spread' and 'Noise.' Determine if the relay points should be Symmetric or Stochastic (randomized) to maximize the signal-to-noise ratio in a non-vacuum plasma medium."

---

## Planetary Environment Prompts

### Mars: High-Velocity Abrasive

*Context:* Low density, high particulate friction.

> "Simulate a 1,000-node structural array on the Martian surface.
>
> Atmospheric Pressure: 6.1 mbar (CO2 dominant).
>
> Constraint: Encountering a global dust storm with wind speeds of 30 m/s and high-velocity silicate particulates.
>
> Objective: Reason a material composition and lattice geometry that survives abrasive erosion without the benefit of an atmospheric cushion. Calculate the Reynolds Number of the flow through the structure to determine if a porous or solid geometry is more efficient for long-term stability."

### Europa: Hydrostatic Cryo-Crush

*Context:* High pressure, extreme cold, chemical reactivity.

> "Initialize a structural simulation at the base of the Jovian moon Europa's ice shell.
>
> Pressure: 130 MPa (Hydrostatic). Temperature: -160°C. Medium: Saline-rich liquid water.
>
> Objective: Reason a structural topology that resists volumetric compression. Compare the failure points of a Tesselated Sphere vs. a Cylindrical Truss. The AI must determine how to prevent 'Cold-Brittleness' fracture in the material joints under constant chemical oxidation from the salt-heavy medium."

### Solar: Magnetohydrodynamic

*Context:* Thermal vibration, ionization, magnetic flux.

> "Model a data-relay station within the Solar Chromosphere.
>
> Temperature: 5,700°C (effective). Environment: Fully ionized plasma (H+ and e-).
>
> Objective: Solve the Thermal Equilibrium problem. Reason why a standard 'solid' state cannot maintain integrity and propose a Non-Solid State (Plasma or Magnetic Lattice). Define the Magnetic Reynolds Number required for the structure to hook onto solar magnetic field lines to prevent being swept away by the solar wind."

### Earth: Gravity-Oxidative

*Context:* High gravity, 1-bar pressure, moisture.

> "Simulate a ground-station receiver for a trans-solar signal link.
>
> Gravity: 9.81 m/s². Atmosphere: 101.3 kPa (N2/O2 mix).
>
> Objective: Reason a structure that solves the Tension vs. Compression conflict under Earth's specific gravity. The AI must calculate the Structural Sag of a 100-meter antenna and propose a material that resists oxidative corrosion (rust) while maintaining the precision required to catch a high-frequency beam from the Sun."

---

You can also use **your own prompts** related to science, space, and physics for best results.
