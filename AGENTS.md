# AI Assistant Directives & Project Context

Please read and adhere to `/instruction.md` for the macro mission, operational directives, and architecture.

## Key Architectural Decisions & Capabilities
- **Neo4j Aura Enterprise Cloud Integration:**
  - Connected to cloud database instance `30544b94.databases.neo4j.io`.
  - The Semantic Query Engine in `LpgVisualizer.tsx` supports toggling `useAura` to execute Cypher queries on the live Neo4j cloud instance.
  - Cypher query console available in the "Neo4j Aura Live" tab.
  - To wipe/recycle the database when needed, the standard Cypher syntax is `MATCH (n) DETACH DELETE n`.
- **Force Graph View (`ForceGraphView.tsx`):**
  - Uses an adaptive zoom threshold (0.30) so node labels remain visible even when zoomed out.
  - When zoomed out (`scale < 1.0`), renders compact equipment tags (e.g. `TK-01`, `CH-01`, `P-01`).
  - When zoomed in or highlighted, reveals the full equipment names with white halos for legibility.
- **Twin & Operations Architecture:**
  - Dual semantic engine: Labeled Property Graphs (LPG) for dependency tracing + RDF for standardized equipment ontologies.
  - ISA-18.2 / IEC 62682 industrial alarm rationalization with automated OCAPs.
