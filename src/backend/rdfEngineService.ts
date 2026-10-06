import * as oxigraph from "oxigraph";
import { digitalTwin } from "./DigitalTwinCore";

export interface TripleObject {
  subject: string;
  predicate: string;
  object: string;
}

export interface SparqlBinding {
  [varName: string]: string;
}

export interface SparqlQueryResult {
  success: boolean;
  type: "select" | "boolean" | "update" | "error";
  bindings?: SparqlBinding[];
  variables?: string[];
  booleanValue?: boolean;
  count?: number;
  message?: string;
  totalTriples?: number;
  error?: string;
  executionTimeMs?: number;
  rawSparql?: string;
}

export const EX_PREFIX = "http://semicon.cleanroom.twin/ontology#";
export const RDFS_PREFIX = "http://www.w3.org/2000/01/rdf-schema#";
export const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
export const OWL_PREFIX = "http://www.w3.org/2002/07/owl#";

export class RdfKnowledgeEngine {
  private store: oxigraph.Store;
  private isLoaded: boolean = false;
  private loadedCount: number = 0;

  constructor() {
    this.store = new oxigraph.Store();
  }

  /**
   * Formats a subject, predicate, or object into valid Turtle syntax.
   */
  private formatTerm(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return `<${trimmed}>`;
    }
    if (trimmed.startsWith("rdfs:")) {
      return `<${RDFS_PREFIX}${trimmed.replace("rdfs:", "")}>`;
    }
    if (trimmed.startsWith("rdf:")) {
      return `<${RDF_PREFIX}${trimmed.replace("rdf:", "")}>`;
    }
    if (trimmed.startsWith("owl:")) {
      return `<${OWL_PREFIX}${trimmed.replace("owl:", "")}>`;
    }
    // Safe alphanumeric identifier
    if (/^[A-Za-z0-9_\-\.]+$/.test(trimmed)) {
      return `:${trimmed}`;
    }
    // Literal string
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }

  /**
   * Load JSON triple array into Oxigraph Store
   */
  public loadTriples(triples: TripleObject[]) {
    let turtleDoc = `
@prefix : <${EX_PREFIX}> .
@prefix rdfs: <${RDFS_PREFIX}> .
@prefix rdf: <${RDF_PREFIX}> .
@prefix owl: <${OWL_PREFIX}> .

`;

    for (const t of triples) {
      if (!t.subject || !t.predicate || !t.object) continue;
      const s = this.formatTerm(t.subject);
      const p = this.formatTerm(t.predicate);
      const o = this.formatTerm(t.object);
      turtleDoc += `${s} ${p} ${o} .\n`;
    }

    try {
      this.store = new oxigraph.Store();
      this.store.load(turtleDoc, {
        format: "text/turtle",
        base_iri: EX_PREFIX,
      });
      this.isLoaded = true;
      this.loadedCount = triples.length;
      console.log(`[OXIGRAPH] Loaded ${this.loadedCount} triples into in-memory store.`);
    } catch (err: any) {
      console.error("[OXIGRAPH] Error loading Turtle into store:", err);
      throw err;
    }
  }

  /**
   * Explicitly removes all triples from the Oxigraph store
   */
  public clearTriples(): { clearedCount: number; success: boolean } {
    const previousCount = this.loadedCount;
    try {
      // Execute SPARQL CLEAR ALL if store has data, and reset store instance
      if (this.store) {
        try {
          this.store.update("CLEAR ALL");
        } catch {
          // In case SPARQL CLEAR update isn't needed or throws on empty
        }
      }
      this.store = new oxigraph.Store();
      this.isLoaded = false;
      this.loadedCount = 0;
      console.log(`[OXIGRAPH] Cleared all ${previousCount} triples from Oxigraph in-memory store.`);
      return { clearedCount: previousCount, success: true };
    } catch (err: any) {
      console.error("[OXIGRAPH] Error clearing triples:", err);
      this.store = new oxigraph.Store();
      this.isLoaded = false;
      this.loadedCount = 0;
      return { clearedCount: previousCount, success: true };
    }
  }

  /**
   * Clear all triples then reload fresh triples
   */
  public reloadTriples(triples?: TripleObject[]): { previousCount: number; newCount: number; success: boolean } {
    const previousCount = this.loadedCount;
    this.clearTriples();
    const sourceTriples = triples || digitalTwin.getOntology();
    this.loadTriples(sourceTriples);
    return {
      previousCount,
      newCount: sourceTriples.length,
      success: true,
    };
  }

  /**
   * Normalize and execute a real SPARQL 1.1 Query on Oxigraph
   */
  public executeSparql(sparql: string): SparqlQueryResult {
    const startTime = performance.now();
    try {
      if (!this.isLoaded) {
        this.loadTriples(digitalTwin.getOntology());
      }
      let finalSparql = sparql.trim();

      // Auto-inject default prefixes if missing
      const prefixHeaders: string[] = [];
      if (!finalSparql.toUpperCase().includes("PREFIX :") && !finalSparql.toUpperCase().includes("PREFIX  :")) {
        prefixHeaders.push(`PREFIX : <${EX_PREFIX}>`);
      }
      if (!finalSparql.toUpperCase().includes("PREFIX RDFS:")) {
        prefixHeaders.push(`PREFIX rdfs: <${RDFS_PREFIX}>`);
      }
      if (!finalSparql.toUpperCase().includes("PREFIX RDF:")) {
        prefixHeaders.push(`PREFIX rdf: <${RDF_PREFIX}>`);
      }
      if (!finalSparql.toUpperCase().includes("PREFIX OWL:")) {
        prefixHeaders.push(`PREFIX owl: <${OWL_PREFIX}>`);
      }

      if (prefixHeaders.length > 0) {
        finalSparql = `${prefixHeaders.join("\n")}\n${finalSparql}`;
      }

      // Check if this is a SPARQL 1.1 Update statement (INSERT DATA, DELETE DATA, etc.)
      const isUpdate = /\b(INSERT\s+DATA|DELETE\s+DATA|INSERT|DELETE|CLEAR|LOAD|CREATE|DROP|COPY|MOVE|ADD)\b/i.test(finalSparql);
      if (isUpdate) {
        this.store.update(finalSparql);
        const executionTimeMs = +(performance.now() - startTime).toFixed(2);
        const allTriples = this.getAllTriples();
        this.loadedCount = allTriples.length;
        digitalTwin.setOntology(allTriples);
        console.log(`[OXIGRAPH] SPARQL Update applied. Total triples in store: ${this.loadedCount}`);
        return {
          success: true,
          type: "update",
          message: `SPARQL Update executed successfully into Oxigraph store (${this.loadedCount} total triples).`,
          totalTriples: this.loadedCount,
          executionTimeMs,
          rawSparql: finalSparql,
        };
      }

      const rawResult = this.store.query(finalSparql);
      const executionTimeMs = +(performance.now() - startTime).toFixed(2);

      // Check if boolean (ASK query)
      if (typeof rawResult === "boolean") {
        return {
          success: true,
          type: "boolean",
          booleanValue: rawResult,
          executionTimeMs,
          rawSparql: finalSparql,
        };
      }

      // Tabular results (SELECT query)
      const bindings: SparqlBinding[] = [];
      if (Array.isArray(rawResult)) {
        for (const row of rawResult) {
          const item: SparqlBinding = {};
          if (row instanceof Map || (row && typeof (row as any).entries === "function")) {
            for (const [varName, term] of (row as Map<string, any>).entries()) {
              if (!term) continue;
              let val = term.value;
              // Strip internal cleanroom prefix for clean readability
              if (val.startsWith(EX_PREFIX)) {
                val = val.substring(EX_PREFIX.length);
              } else if (val.startsWith(RDFS_PREFIX)) {
                val = `rdfs:${val.substring(RDFS_PREFIX.length)}`;
              } else if (val.startsWith(RDF_PREFIX)) {
                val = `rdf:${val.substring(RDF_PREFIX.length)}`;
              }
              item[varName] = val;
            }
          }
          bindings.push(item);
        }
      }

      // Extract projection variables from query or collect across all bindings
      const variables: string[] = [];
      const varMatch = finalSparql.match(/SELECT\s+(?:DISTINCT\s+)?([\?\w\s]+?)\s+WHERE/i);
      if (varMatch && varMatch[1]) {
        const foundVars = varMatch[1].match(/\?([a-zA-Z0-9_]+)/g);
        if (foundVars) {
          foundVars.forEach((v) => {
            const clean = v.replace("?", "");
            if (!variables.includes(clean)) variables.push(clean);
          });
        }
      }
      for (const b of bindings) {
        for (const k of Object.keys(b)) {
          if (!variables.includes(k)) variables.push(k);
        }
      }

      return {
        success: true,
        type: "select",
        bindings,
        variables,
        count: bindings.length,
        executionTimeMs,
        rawSparql: finalSparql,
      };
    } catch (err: any) {
      const executionTimeMs = +(performance.now() - startTime).toFixed(2);
      console.warn("[OXIGRAPH] SPARQL Execution Error:", err.message);
      return {
        success: false,
        type: "error",
        error: err.message,
        executionTimeMs,
        rawSparql: sparql,
      };
    }
  }

  /**
   * Helper to format deterministic results into natural-reading facts
   */
  public formatBindingsToKnowledge(bindings: SparqlBinding[]): string[] {
    if (!bindings || bindings.length === 0) return [];
    return bindings.map((b) => {
      const entries = Object.entries(b);
      if (entries.length === 1) {
        return `${entries[0][0]}: ${entries[0][1]}`;
      }
      return entries.map(([k, v]) => `${k} = ${v}`).join(" | ");
    });
  }

  public getAllTriples(): TripleObject[] {
    try {
      const rawResult = this.store.query("SELECT ?s ?p ?o WHERE { ?s ?p ?o }");
      const cleanTerm = (term: any): string => {
        if (!term) return "";
        const val = term.value || "";
        if (term.termType === "Literal") return val;
        if (val.startsWith(EX_PREFIX)) return val.substring(EX_PREFIX.length);
        if (val.startsWith(RDFS_PREFIX)) return `rdfs:${val.substring(RDFS_PREFIX.length)}`;
        if (val.startsWith(RDF_PREFIX)) return `rdf:${val.substring(RDF_PREFIX.length)}`;
        if (val.startsWith(OWL_PREFIX)) return `owl:${val.substring(OWL_PREFIX.length)}`;
        return val;
      };

      const triples: TripleObject[] = [];
      if (Array.isArray(rawResult)) {
        for (const row of rawResult) {
          if (row instanceof Map) {
            const s = row.get("s");
            const p = row.get("p");
            const o = row.get("o");
            if (s && p && o) {
              triples.push({
                subject: cleanTerm(s),
                predicate: cleanTerm(p),
                object: cleanTerm(o),
              });
            }
          }
        }
      }
      return triples;
    } catch (err: any) {
      console.warn("[OXIGRAPH] Error exporting all triples:", err.message);
      return digitalTwin.getOntology();
    }
  }

  public getStats() {
    return {
      isLoaded: this.isLoaded,
      loadedCount: this.loadedCount,
    };
  }
}

export const rdfKnowledgeEngine = new RdfKnowledgeEngine();
