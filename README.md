# Vigilant-L: Autonomous Lunar Forensic Engineer

## Overview

Vigilant-L is a Neuro-Symbolic AI agent designed for the Artemis lunar missions. It serves as an autonomous "Onboard Forensic Engineer" capable of diagnosing mechanical failures in real-time without relying on Earth-based ground control.

The system addresses NASA's "Shortfall 1561" (Dust Effects on Hardware) by mitigating the impact of lunar regolith—razor-sharp, electrostatically charged dust that destroys seals and bearings. Unlike traditional AI that simply classifies images, Vigilant-L combines Multimodal Perception (Visual + Acoustic) with Deterministic Physics Reasoning (Archard Wear Law, Blok's Flash Temperature) to calculate physical damage and predict Remaining Useful Life (RUL).

## Key Features

### 1. Neuro-Symbolic Architecture
*   **Perception Layer (Neural):** Uses Gemini 1.5 Pro or DeepSeek V3 to analyze spectrograms and macro photography. It extracts observable variables like material type, surface texture, and vibration chaos.
*   **Reasoning Layer (Symbolic):** A deterministic Typescript physics engine applies tribological equations (Archard, Blok) to the AI's observations to calculate wear volume, thermal stress, and fatigue life.

### 2. Multimodal Diagnostics
*   **Acoustic Analysis:** Converts raw audio vibration data into color-mapped spectrograms image to detect harmonic misalignment and broadband chaotic noise.
*   **Visual Inspection:** Analyzes macro-optical imagery to identify material composition, lubrication state, and contaminant type (e.g., Regolith vs. Metal fragments).

### 3. High-Fidelity 3D Digital Twin
*   **Real-Time Simulation:** Generates an interactive 3D model of the failing component using Three.js and React Three Fiber.
*   **Physics-Driven Visuals:**
    *   **Structural Deformation:** Mesh vertices displace in real-time to simulate warping, pitting, and fracture based on calculated stress.
    *   **Environmental Interaction:** Simulates lunar dust storms, electrostatic adhesion, and corrosion based on environmental parameters.
    *   **Thermodynamics:** Components self-illuminate based on calculated flash temperatures and adaptive emissivity for visibility in low-light environments.

## Technical Architecture

### Tech Stack
*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **3D Rendering:** Three.js, @react-three/fiber, @react-three/drei
*   **AI Integration:** Google GenAI SDK (Gemini), OpenRouter API
*   **Audio Synthesis:** Web Audio API (OfflineAudioContext)

### Physics Kernel
The core logic resides in `services/physicsEngine.ts`, which implements:
*   **Archard Wear Equation:** `V = (k * F * s) / H` to calculate volume loss.
*   **Blok's Flash Temperature:** Estimates instantaneous temperature spikes at micro-asperity contacts.
*   **L10 Fatigue Life:** Standard bearing life calculation adjusted for vibration shock factors.

### Material Database
The system includes a rigorous material property database (Hardness, Thermal Conductivity, Yield Strength) for:
*   Titanium Alloy (Ti-6Al-4V)
*   Stainless Steel (316L)
*   Silicon Nitride Ceramic (Si3N4)
*   Aluminum 7075
*   Viton Rubber
*   Carbon Composite
*   Planetary Rock (Basalt)

## Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vigilant-l
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following keys. You must provide at least one valid API key.

```env
# Google Gemini API Key (Primary)
GEMINI_API_KEY="AIzaSy..."

# OpenRouter API Key (Alternative/Fallback)
VIGILANT_API_KEY="sk-or-..."
```

### 4. Run the Application
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

## Usage Guide

1.  **Data Injection:** Use the "Load Nominal" or "Load Critical" buttons to generate synthetic telemetry data (spectrograms and visual macro images).
2.  **Execute Analysis:** Click "Execute Analysis". The system will process the data through the Perception Layer and then the Physics Layer.
3.  **Review Telemetry:**
    *   **Thermodynamics:** Check Flash Temperature against material limits.
    *   **Tribology:** Monitor Wear Volume (m³).
    *   **Mechanics:** Observe L10 Fatigue Life projections.
4.  **Initialize Digital Twin:** Click the "Initialize 3D Digital Twin" button to enter the simulation view.
5.  **Command Uplink:** In the simulation view, use the terminal to interact with the physics kernel using natural language.
    *   *Example:* "Simulate a dust storm on Mars."
    *   *Example:* "Show me the stress fractures."
    *   *Example:* "Change material to Titanium."

## License

This project is open-source and available under the MIT License.
