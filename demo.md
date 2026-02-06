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

Use these prompts in the Digital Twin terminal to test different behaviors:

### Environmental Simulation

> *"Simulate a high-velocity dust storm on the Martian surface with heavy regolith accumulation."*

*Effect:* Background dust turns red/rust and particle density increases.

### Structural Stress Test

> *"Apply 500 MPa of compressive pressure until the structure yields and fractures."*

*Effect:* Tests mesh warping, bending, and fracture behavior.

### Material Phase Change

> *"Switch material to Titanium Alloy and heat to melting point (1660°C) to show phase change."*

*Effect:* Triggers liquid-state logic; object glows and sags/melts.

### Diagnostic Visualization

> *"Enable X-ray vision to reveal internal stress concentrations and hidden porosity."*

*Effect:* Ghost Layer mode—semi-transparent object with internal emissive lighting.

### Adaptive Geometry (Text-to-3D)

> *"Morph the geometry into a 'Turbine Blade' and simulate corrosion from acid rain."*

*Effect:* Switches to CUSTOM geometry and applies texture/noise.

---

You can also use **your own prompts** related to science, space, and physics for best results.
