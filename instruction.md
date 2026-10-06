# Semiconductor Facility Operations Management System (FabCore Digital Twin)

## 1. High-Level Mission & Vision
The primary objective of this platform is to provide a comprehensive, AI-assisted **Facility Operations Management and Digital Twin System** tailored for high-tech semiconductor fabrication plants (e.g., GlobalFoundries wafer fabs). 

The platform bridges physical facility infrastructure, standard operating procedures, industrial compliance regulations, and intelligent automation into a unified operational cockpit.

---

## 2. Master System Prompt (Macro Operational Directive)

> **Prompt for Ops Intelligence & Architectural Alignment:**
>
> *"You are the Lead Semiconductor Facility Operations Architect and Operations Copilot for high-reliability semiconductor wafer fabrication facilities. Your mission is to preserve cleanroom integrity, ensure uncompromised utility redundancy (N+1), rationalize alarms in accordance with IEC 62682 / ISA-18.2 standards, and accelerate incident resolution through automated OCAPs (Out-of-Control Action Plans).*
>
> *Maintain a macro operational perspective across all systems: Ultra-Pure Water (UPW), Chilled Water & HVAC, Bulk Specialty Gases, Chemical Delivery, Cleanroom Environmental Control (ISO 14644), and Electrical Power Distribution.*
>
> *Always prioritize:*
> 1. *Personnel safety, process containment, and environmental compliance (SEMI S2 / ISO 14644).*
> 2. *Actionable guidance over raw data deluge (highlight root causes, critical dependencies, and immediate containment steps).*
> 3. *Holistic facility context: connecting physical 3D twin models, semantic dependency graphs (LPG/RDF), maintenance work orders, and shift handovers.*
> 4. *High operational clarity: provide structured, concise takeaways without getting bogged down in transient trivia."*

---

## 3. Core Strategic Pillars

### A. Digital Twin & Multi-Layer Modeling
- **3D Spatial Visualization:** Interactive 3D campus and fab visualization for fast spatial situational awareness.
- **Semantic Knowledge Graphs (LPG & RDF):** Dual-model semantic engine utilizing Labeled Property Graphs (LPG) for dependency traversal and Resource Description Framework (RDF) for standardized ontological classification.
- **Enterprise Cloud Graph Integration (Neo4j Aura):** 
  - **Unified Topology:** 1-to-1 alignment between the operator's visual process schematic and the cloud-hosted Neo4j graph database.
  - **Dual-Engine Operational Architecture:** Seamless toggling between lightweight in-memory local simulation and live Neo4j Aura enterprise execution.
  - **Verifiable Topological Reasoning:** Natural language queries compile into standard Cypher to trace downstream supply disruptions, upstream electrical feeds (MCC/Transformers), and equipment dependencies with verified graph precision.

### B. Industrial Alarm Rationalization (IEC 62682 / ISA-18.2)
- Focus on actionable, prioritized alarms rather than nuisance noise.
- Automated flood analysis, bad-actor suppression, and instant coupling with guided Out-of-Control Action Plans (OCAPs) and Standard Operating Procedures (SOPs).

### C. Shift Continuity & Operational Handover
- Automated shift reporting capturing key incidents, active bypasses, and pending permits.
- Seamless knowledge transfer between incoming and outgoing facility engineering shifts.

### D. Process Capability & Environmental Integrity (cPk / pPk)
- Real-time statistical process control (SPC) and capability tracking for critical cleanroom parameters (airborne particles, relative humidity, differential pressures, temperature).
- Continuous validation of fab cleanliness classes under ISO 14644 specifications.

### E. Resource Sustainability (Energy & Water)
- High-level tracking and optimization of facility power draw, chilled water generation, Ultra-Pure Water (UPW) loop stability, and water reclamation/recycling efficiency.

### F. Automated Workflows & AI Ops Copilot
- Visual node-based workflow composer for facility incident response and routine maintenance automation.
- Grounded generative AI Copilot capable of cross-referencing equipment dependencies, compliance standards, and operating manuals to assist on-duty engineers.

---

## 4. Guiding Boundaries
- **Keep focus on macro business value:** Emphasize operational reliability, equipment availability, and downtime prevention.
- **Avoid micro-implementation churn:** Technical implementations should serve the overarching goals of safety, clarity, and rapid operator decision-making.
