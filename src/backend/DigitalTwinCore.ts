import { GraphEngine } from '../lib/graphEngine';

export class DigitalTwinCore {
  private graph: GraphEngine;
  private ontology: any[];

  constructor() {
    this.graph = new GraphEngine();
    (this.graph as any).graphData = { nodes: [], edges: [] };
    this.ontology = [];
    this.initializeTopology();
    this.initializeOntology();
  }

  private initializeTopology() {
    const addNode = (id: string, label: string, type: string, position: {x: number, y: number}, style: any, properties: Record<string, any> = {}) => {
      this.graph.addNode({ id, labels: [type], properties: { name: label, ...properties } });
      this.graph.graphData.nodes.push({ id, position, sourcePosition: 'right', targetPosition: 'left', data: { label, type, properties, ...properties }, style });
    };

    const addEdge = (id: string, source: string, target: string, relationship: string, style: any, animated: boolean = false, data: any = {}) => {
      this.graph.addEdge({ id, source, target, type: relationship, properties: data });
      this.graph.graphData.edges.push({ id, source, target, label: relationship, type: 'smoothstep', style, animated, data });
    };

    // UPW Generation & Distribution
    addNode('UPW-TK-01', 'Raw Water / Feed Tank', 'Tank', { x: 50, y: 200 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Raw Water Storage',
      capacity: '50,000 Gallons',
      medium: 'City Raw Feed Water',
      material: 'SS316L Stainless Steel',
      location: 'SubFab Area B (Water Plant)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Buffer'
    });

    addNode('UPW-P-01', 'Raw Water Feed Pump 01', 'Pump', { x: 240, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Feed Pump',
      capacity: '500 GPM @ 65 PSI',
      power: '45 kW (415V 3-Phase)',
      medium: 'Raw Water Feed',
      location: 'SubFab B01-PUMP Skid',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Lead Pump)'
    });

    addNode('UPW-P-02', 'Raw Water Feed Pump 02', 'Pump', { x: 240, y: 270 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Feed Pump',
      capacity: '500 GPM @ 65 PSI',
      power: '45 kW (415V 3-Phase)',
      medium: 'Raw Water Feed',
      location: 'SubFab B01-PUMP Skid',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Standby Pump)'
    });

    addNode('MMF', 'Multi-Media Filter Bank', 'Filter', { x: 420, y: 210 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Multi-Media Filter Bank',
      capacity: '500 GPM Multi-Layer Bed',
      medium: 'Filtered Feed Water',
      location: 'SubFab Pretreatment Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Dual Train MMF Bank'
    });

    addNode('SAC-0911', 'Strong Acid Cation Exchanger 0911', 'CationExchanger', { x: 600, y: 80 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Cation Exchanger Vessel',
      capacity: '150 GPM Exchanger Bed',
      medium: 'Decationized Water',
      location: 'SubFab Pretreatment Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '4-Train Exchanger Bank'
    });

    addNode('SAC-0912', 'Strong Acid Cation Exchanger 0912', 'CationExchanger', { x: 600, y: 160 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Cation Exchanger Vessel',
      capacity: '150 GPM Exchanger Bed',
      medium: 'Decationized Water',
      location: 'SubFab Pretreatment Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '4-Train Exchanger Bank'
    });

    addNode('SAC-0913', 'Strong Acid Cation Exchanger 0913', 'CationExchanger', { x: 600, y: 260 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Cation Exchanger Vessel',
      capacity: '150 GPM Exchanger Bed',
      medium: 'Decationized Water',
      location: 'SubFab Pretreatment Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '4-Train Exchanger Bank'
    });

    addNode('SAC-0914', 'Strong Acid Cation Exchanger 0914', 'CationExchanger', { x: 600, y: 340 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Cation Exchanger Vessel',
      capacity: '150 GPM Exchanger Bed',
      medium: 'Decationized Water',
      location: 'SubFab Pretreatment Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '4-Train Exchanger Bank'
    });

    addNode('S-091', 'Acid Regeneration System', 'ChemicalStorage', { x: 420, y: 440 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Regeneration System',
      capacity: '200 Gal Acid Tank',
      medium: 'Hydrochloric / Sulfuric Acid',
      location: 'SubFab Chemical Enclosure',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: 'Duty/Standby'
    });

    addNode('S-121', 'Cation Regeneration Pump', 'Pump', { x: 600, y: 440 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Feed Pump',
      capacity: '50 GPM @ 45 PSI',
      medium: 'Regeneration Acid Dosing',
      location: 'SubFab Chemical Enclosure',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: 'Duty/Standby'
    });

    addNode('T-1011', 'Pre-Treated Water Storage Tank 1011', 'Tank', { x: 790, y: 120 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Pre-Treated Water Storage Tank',
      capacity: '30,000 Gallons',
      medium: 'Decationized Water',
      location: 'SubFab Tank Yard',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Dual Tank Configuration'
    });

    addNode('T-1012', 'Pre-Treated Water Storage Tank 1012', 'Tank', { x: 790, y: 300 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Pre-Treated Water Storage Tank',
      capacity: '30,000 Gallons',
      medium: 'Decationized Water',
      location: 'SubFab Tank Yard',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Dual Tank Configuration'
    });

    addNode('S-111', 'Pre-Treated Water Transfer Pump', 'Pump', { x: 970, y: 210 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Feed Pump',
      capacity: '500 GPM @ 60 PSI',
      medium: 'Decationized Water',
      location: 'SubFab B01-PUMP Skid',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Configuration'
    });

    addNode('S-131', 'Bisulfite Injection System', 'ChemicalDosing', { x: 970, y: 80 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Chemical Dosing System',
      capacity: '10 GPH Dosing Metering',
      medium: 'Sodium Bisulfite (NaHSO3)',
      location: 'SubFab Chemical Enclosure',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Duty/Standby Dosing'
    });

    addNode('S-0511', 'Caustic Injection System', 'ChemicalDosing', { x: 970, y: 340 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Chemical Dosing System',
      capacity: '15 GPH Dosing Metering',
      medium: 'Sodium Hydroxide (NaOH)',
      location: 'SubFab Chemical Enclosure',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Duty/Standby Dosing'
    });

    addNode('UPW-F-01', 'Pretreatment Filter 01', 'Filter', { x: 1150, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Multi-Media Filtration',
      capacity: '500 GPM',
      delta_p: '4.2 PSI',
      medium: 'Pretreated Water',
      location: 'SubFab Pretreatment Skid A',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: '2x 100% Dual Train'
    });

    addNode('UPW-F-02', 'Pretreatment Filter 02', 'Filter', { x: 1150, y: 270 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Multi-Media Filtration',
      capacity: '500 GPM',
      delta_p: '4.1 PSI',
      medium: 'Pretreated Water',
      location: 'SubFab Pretreatment Skid B',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: '2x 100% Dual Train'
    });

    addNode('UPW-RO-01', 'Reverse Osmosis Train 01', 'RO', { x: 1330, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Membrane Separation',
      capacity: '400 GPM Permeate',
      recovery_rate: '85% Recovery',
      medium: 'RO Permeate Water',
      location: 'SubFab RO Train 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '2x 100% Parallel Train'
    });

    addNode('UPW-RO-02', 'Reverse Osmosis Train 02', 'RO', { x: 1330, y: 270 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Membrane Separation',
      capacity: '400 GPM Permeate',
      recovery_rate: '85% Recovery',
      medium: 'RO Permeate Water',
      location: 'SubFab RO Train 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '2x 100% Parallel Train'
    });

    addNode('T-2511', 'RO Product Storage Tank', 'Tank', { x: 1510, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Product Storage Tank',
      capacity: '40,000 Gallons',
      medium: 'RO Product Permeate',
      location: 'SubFab Tank Yard',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Primary Buffer Tank'
    });

    addNode('T-200', 'RO Reject Storage Tank', 'Tank', { x: 1510, y: 370 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Reject Storage Tank',
      capacity: '20,000 Gallons',
      medium: 'RO Concentrate / Reject',
      location: 'SubFab Tank Yard',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: 'Effluent Buffer'
    });

    addNode('WASTE', 'Waste Drain Destination', 'DrainDestination', { x: 1690, y: 370 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Drain Destination',
      capacity: 'Continuous Gravity Drain',
      medium: 'Industrial Wastewater / Neutralization',
      location: 'Facility Neutralization Pit',
      criticality: 'Tier 2 - Semi Critical',
      redundancy: 'Gravity Flow'
    });

    addNode('UPW-TK-02', 'RO Permeate Tank', 'Tank', { x: 1690, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Intermediate Storage',
      capacity: '30,000 Gallons',
      medium: 'RO Permeate Water',
      lining: 'PVDF Fluoropolymer',
      location: 'SubFab Permeate Vault',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Storage'
    });

    addNode('UPW-EDI-01', 'Electrodeionization Train 01', 'EDI', { x: 1870, y: 100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Electrodeionization',
      capacity: '350 GPM',
      output_resistivity: '>17.5 MΩ·cm',
      medium: 'Deionized Water',
      location: 'SubFab EDI Skid 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Train'
    });

    addNode('UPW-EDI-02', 'Electrodeionization Train 02', 'EDI', { x: 1870, y: 200 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Electrodeionization',
      capacity: '350 GPM',
      output_resistivity: '>17.5 MΩ·cm',
      medium: 'Deionized Water',
      location: 'SubFab EDI Skid 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Train'
    });

    addNode('MB-3411', 'Primary Mixed Bed Polisher 3411', 'MixedBedPolisher', { x: 2050, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Primary Mixed Bed Polishing',
      capacity: '500 GPM Polishing Bed',
      medium: 'Polished UPW (>18.0 MΩ·cm)',
      location: 'SubFab Polishing Skid Area',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Dual Bed Primary Polisher'
    });

    addNode('UPW-TK-03', 'UPW Storage Tank', 'Tank', { x: 2230, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Final UPW Storage',
      capacity: '40,000 Gallons',
      medium: 'Ultrapure Water (>18.2 MΩ·cm)',
      blanket: 'N2 Positive Blanket (>50 mmAq)',
      location: 'SubFab Polish Vault',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Primary Polish Buffer'
    });

    addNode('UPW-P-03', 'UPW Circulation Pump 03', 'Pump', { x: 2410, y: 100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Distribution Circulation Pump',
      capacity: '600 GPM @ 80 PSI',
      power: '55 kW (415V VFD)',
      medium: 'Polished UPW (18.2 MΩ·cm)',
      location: 'SubFab Circulation Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Primary Active)'
    });

    addNode('UPW-P-04', 'UPW Circulation Pump 04', 'Pump', { x: 2410, y: 200 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Distribution Circulation Pump',
      capacity: '600 GPM @ 80 PSI',
      power: '55 kW (415V VFD)',
      medium: 'Polished UPW (18.2 MΩ·cm)',
      location: 'SubFab Circulation Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Auto-Standby)'
    });

    addNode('UPW-HDR-01', 'Main UPW Distribution Header', 'Header', { x: 2590, y: 150 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Distribution Main Header',
      capacity: '1,200 GPM @ 75 PSI',
      pipe_spec: '8-inch PVDF HP-Sch80',
      medium: 'Semiconductor Grade UPW',
      location: 'Cleanroom Interstitial Trestle',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Continuous Recirculation'
    });

    addNode('UPW-LOOP-A', 'UPW Distribution Loop A', 'DistributionLoop', { x: 2770, y: 70 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'SubFab Distribution Loop',
      capacity: '400 GPM Loop Flow',
      spec_target: '>18.18 MΩ·cm, TOC < 0.5 ppb',
      zone: 'Cleanroom Bay 1-2 (Litho/CMP)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Recirculating Sub-Ring'
    });

    addNode('UPW-LOOP-B', 'UPW Distribution Loop B', 'DistributionLoop', { x: 2770, y: 190 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'SubFab Distribution Loop',
      capacity: '400 GPM Loop Flow',
      spec_target: '>18.18 MΩ·cm, TOC < 0.5 ppb',
      zone: 'Cleanroom Bay 3-4 (Wet Clean/Etch)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Recirculating Sub-Ring'
    });

    addNode('UPW-LOOP-C', 'UPW Distribution Loop C', 'DistributionLoop', { x: 2770, y: 310 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'SubFab Distribution Loop',
      capacity: '400 GPM Loop Flow',
      spec_target: '>18.18 MΩ·cm, TOC < 0.5 ppb',
      zone: 'Cleanroom Bay 5-6 (Dep/Metrology)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Recirculating Sub-Ring'
    });

    addNode('UPW-POU-01', 'Point of Use A01', 'POU', { x: 2950, y: 40 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase A01',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    addNode('UPW-POU-02', 'Point of Use A02', 'POU', { x: 2950, y: 100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase A02',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    addNode('UPW-POU-03', 'Point of Use B01', 'POU', { x: 2950, y: 160 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase B01',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    addNode('UPW-POU-04', 'Point of Use B02', 'POU', { x: 2950, y: 220 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase B02',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    addNode('UPW-POU-05', 'Point of Use C01', 'POU', { x: 2950, y: 280 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase C01',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    addNode('UPW-POU-06', 'Point of Use C02', 'POU', { x: 2950, y: 340 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'UPW (Ultrapure Water)',
      category: 'Tool Hookup Point of Use',
      capacity: '80 GPM',
      filter_rating: '0.05 µm Final Ultrafilter',
      location: 'SubFab Chase C02',
      criticality: 'Tier 2 - Tool Direct',
      redundancy: 'Dual Isolation Drop'
    });

    // CHW Generation & Distribution
    addNode('CHW-CT-01', 'Cooling Tower 01', 'CoolingTower', { x: 50, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Heat Rejection Tower',
      capacity: '1,200 RT Heat Rejection',
      fan_power: '30 kW VFD Controlled',
      design_temp: '32.0°C Supply / 37.0°C Return',
      location: 'Central Utility Plant (CUP) Roof',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Multi-Cell'
    });

    addNode('CHW-CT-02', 'Cooling Tower 02', 'CoolingTower', { x: 50, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Heat Rejection Tower',
      capacity: '1,200 RT Heat Rejection',
      fan_power: '30 kW VFD Controlled',
      design_temp: '32.0°C Supply / 37.0°C Return',
      location: 'Central Utility Plant (CUP) Roof',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Multi-Cell'
    });

    addNode('CHW-CT-03', 'Cooling Tower 03', 'CoolingTower', { x: 50, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Heat Rejection Tower',
      capacity: '1,200 RT Heat Rejection',
      fan_power: '30 kW VFD Controlled',
      design_temp: '32.0°C Supply / 37.0°C Return',
      location: 'Central Utility Plant (CUP) Roof',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Multi-Cell'
    });

    addNode('CHW-CT-04', 'Cooling Tower 04', 'CoolingTower', { x: 50, y: 2100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Heat Rejection Tower',
      capacity: '1,200 RT Heat Rejection',
      fan_power: '30 kW VFD Controlled',
      design_temp: '32.0°C Supply / 37.0°C Return',
      location: 'Central Utility Plant (CUP) Roof',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Multi-Cell (Standby)'
    });

    addNode('CHW-P-01', 'Condenser Water Pump 01', 'CondenserWaterPump', { x: 250, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Condenser Circulation Pump',
      capacity: '2,400 GPM @ 45 ft Head',
      power: '45 kW (415V)',
      medium: 'Condenser Cooling Water',
      location: 'CUP Pump Bay 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Primary'
    });

    addNode('CHW-P-02', 'Condenser Water Pump 02', 'CondenserWaterPump', { x: 250, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Condenser Circulation Pump',
      capacity: '2,400 GPM @ 45 ft Head',
      power: '45 kW (415V)',
      medium: 'Condenser Cooling Water',
      location: 'CUP Pump Bay 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Primary'
    });

    addNode('CHW-P-03', 'Condenser Water Pump 03', 'CondenserWaterPump', { x: 250, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Condenser Circulation Pump',
      capacity: '2,400 GPM @ 45 ft Head',
      power: '45 kW (415V)',
      medium: 'Condenser Cooling Water',
      location: 'CUP Pump Bay 3',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Primary'
    });

    addNode('CHW-P-04', 'Condenser Water Pump 04', 'CondenserWaterPump', { x: 250, y: 2100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Condenser Circulation Pump',
      capacity: '2,400 GPM @ 45 ft Head',
      power: '45 kW (415V)',
      medium: 'Condenser Cooling Water',
      location: 'CUP Pump Bay 4',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Auto-Standby)'
    });

    addNode('CHW-CH-01', 'Chiller 01', 'Chiller', { x: 450, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Centrifugal VFD Chiller',
      capacity: '1,200 RT (4,220 kWth)',
      efficiency: 'COP 6.4 (0.55 kW/Ton)',
      refrigerant: 'R-134a (Zero ODP)',
      setpoint: '6.0°C Leaving CHW',
      location: 'CUP Chiller Floor Bay 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Active Lead)'
    });

    addNode('CHW-CH-02', 'Chiller 02', 'Chiller', { x: 450, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Centrifugal VFD Chiller',
      capacity: '1,200 RT (4,220 kWth)',
      efficiency: 'COP 6.4 (0.55 kW/Ton)',
      refrigerant: 'R-134a (Zero ODP)',
      setpoint: '6.0°C Leaving CHW',
      location: 'CUP Chiller Floor Bay 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Active Lead)'
    });

    addNode('CHW-CH-03', 'Chiller 03', 'Chiller', { x: 450, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Centrifugal VFD Chiller',
      capacity: '1,200 RT (4,220 kWth)',
      efficiency: 'COP 6.4 (0.55 kW/Ton)',
      refrigerant: 'R-134a (Zero ODP)',
      setpoint: '6.0°C Leaving CHW',
      location: 'CUP Chiller Floor Bay 3',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Active Lead)'
    });

    addNode('CHW-CH-04', 'Chiller 04', 'Chiller', { x: 450, y: 2100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Centrifugal VFD Chiller',
      capacity: '1,200 RT (4,220 kWth)',
      efficiency: 'COP 6.4 (0.55 kW/Ton)',
      refrigerant: 'R-134a (Zero ODP)',
      setpoint: '6.0°C Leaving CHW',
      location: 'CUP Chiller Floor Bay 4',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Auto-Standby Backup)'
    });

    addNode('CHW-P-05', 'Chilled Water Pump 05', 'CHWPump', { x: 650, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Primary Chilled Water Pump',
      capacity: '1,800 GPM @ 90 ft Head',
      power: '55 kW (415V VFD)',
      medium: 'Chilled Water (6.0°C)',
      location: 'CUP Distribution Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Active'
    });

    addNode('CHW-P-06', 'Chilled Water Pump 06', 'CHWPump', { x: 650, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Primary Chilled Water Pump',
      capacity: '1,800 GPM @ 90 ft Head',
      power: '55 kW (415V VFD)',
      medium: 'Chilled Water (6.0°C)',
      location: 'CUP Distribution Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Active'
    });

    addNode('CHW-P-07', 'Chilled Water Pump 07', 'CHWPump', { x: 650, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Primary Chilled Water Pump',
      capacity: '1,800 GPM @ 90 ft Head',
      power: '55 kW (415V VFD)',
      medium: 'Chilled Water (6.0°C)',
      location: 'CUP Distribution Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Active'
    });

    addNode('CHW-P-08', 'Chilled Water Pump 08', 'CHWPump', { x: 650, y: 2100 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Primary Chilled Water Pump',
      capacity: '1,800 GPM @ 90 ft Head',
      power: '55 kW (415V VFD)',
      medium: 'Chilled Water (6.0°C)',
      location: 'CUP Distribution Gallery',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 (Auto-Standby Backup)'
    });

    addNode('CHW-HDR-01', 'Main CHW Distribution Header', 'Header', { x: 850, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Primary Supply Header',
      capacity: '5,400 GPM @ 6.0°C',
      pipe_spec: '14-inch Insulated Carbon Steel',
      medium: 'Chilled Water (6.0°C Supply)',
      location: 'CUP Main Trestle to Fab',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Continuous Ring Supply'
    });

    addNode('CHW-ZONE-A', 'CHW Distribution Zone A', 'DistributionZone', { x: 1050, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Zonal Secondary Manifold',
      capacity: '1,800 GPM Demand',
      supply_temp: '6.0°C Supply / 12.0°C Return',
      zone: 'Fab Zone A (Litho / CMP SubFab)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Decoupled Hydraulic Loop'
    });

    addNode('CHW-ZONE-B', 'CHW Distribution Zone B', 'DistributionZone', { x: 1050, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Zonal Secondary Manifold',
      capacity: '1,800 GPM Demand',
      supply_temp: '6.0°C Supply / 12.0°C Return',
      zone: 'Fab Zone B (Wet Clean / Dep SubFab)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Decoupled Hydraulic Loop'
    });

    addNode('CHW-ZONE-C', 'CHW Distribution Zone C', 'DistributionZone', { x: 1050, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'CHW (Chilled Water Plant)',
      category: 'Zonal Secondary Manifold',
      capacity: '1,800 GPM Demand',
      supply_temp: '6.0°C Supply / 12.0°C Return',
      zone: 'Fab Zone C (Etch / Metrology SubFab)',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'Decoupled Hydraulic Loop'
    });

    addNode('CHW-AHU-01', 'Cleanroom/AHU Cooling Load A', 'CoolingLoad', { x: 1250, y: 1650 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'HVAC & Cleanroom Climate',
      category: 'Cleanroom AHU Thermal Load',
      capacity: '45,000 CFM Airflow',
      temp_target: '21.0°C ± 0.2°C, RH 42.0% ± 1.0%',
      cleanroom_class: 'ISO Class 1 (Litho Bay)',
      location: 'Cleanroom Upper Plenum Deck A',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Fan Array'
    });

    addNode('CHW-AHU-02', 'Cleanroom/AHU Cooling Load B', 'CoolingLoad', { x: 1250, y: 1800 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'HVAC & Cleanroom Climate',
      category: 'Cleanroom AHU Thermal Load',
      capacity: '45,000 CFM Airflow',
      temp_target: '21.0°C ± 0.5°C, RH 45.0% ± 2.0%',
      cleanroom_class: 'ISO Class 10 (Wet Clean/Etch)',
      location: 'Cleanroom Upper Plenum Deck B',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Fan Array'
    });

    addNode('CHW-AHU-03', 'Cleanroom/AHU Cooling Load C', 'CoolingLoad', { x: 1250, y: 1950 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'HVAC & Cleanroom Climate',
      category: 'Cleanroom AHU Thermal Load',
      capacity: '45,000 CFM Airflow',
      temp_target: '21.0°C ± 0.5°C, RH 45.0% ± 2.0%',
      cleanroom_class: 'ISO Class 100 (Dep/Metrology)',
      location: 'Cleanroom Upper Plenum Deck C',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Fan Array'
    });

    addNode('CHW-HX-01', 'Process Cooling HX 01', 'HeatExchanger', { x: 2950, y: 550 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Process Cooling Water (PCW)',
      category: 'Plate & Frame Heat Exchanger',
      capacity: '850 kW Heat Dissipation',
      secondary_temp: '18.0°C ± 0.5°C Secondary PCW',
      plates: 'Titanium Grade 1 Plates',
      location: 'SubFab PCW Manifold 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Heat Exchanger'
    });

    addNode('CHW-HX-02', 'Process Cooling HX 02', 'HeatExchanger', { x: 2950, y: 700 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Process Cooling Water (PCW)',
      category: 'Plate & Frame Heat Exchanger',
      capacity: '850 kW Heat Dissipation',
      secondary_temp: '18.0°C ± 0.5°C Secondary PCW',
      plates: 'Titanium Grade 1 Plates',
      location: 'SubFab PCW Manifold 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Heat Exchanger'
    });

    addNode('CHW-HX-03', 'Process Cooling HX 03', 'HeatExchanger', { x: 2950, y: 850 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Process Cooling Water (PCW)',
      category: 'Plate & Frame Heat Exchanger',
      capacity: '850 kW Heat Dissipation',
      secondary_temp: '18.0°C ± 0.5°C Secondary PCW',
      plates: 'Titanium Grade 1 Plates',
      location: 'SubFab PCW Manifold 3',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Heat Exchanger'
    });

    // Process Tools
    addNode('TOOL-CMP-01', 'CMP Tool 01', 'ProcessTool', { x: 3150, y: 40 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Chemical Mechanical Planarization',
      upw_demand: '25.0 GPM Platen Rinse',
      pcw_cooling: '45 kW Platen Thermal Load',
      location: 'Cleanroom Bay 2 (Class 100)',
      criticality: 'Production Line Critical',
      fail_delay: '110s Pad Starvation'
    });

    addNode('TOOL-CMP-02', 'CMP Tool 02', 'ProcessTool', { x: 3150, y: 140 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Chemical Mechanical Planarization',
      upw_demand: '18.0 GPM Carrier Rinse',
      pcw_cooling: '40 kW Carrier Thermal Load',
      location: 'Cleanroom Bay 2 (Class 100)',
      criticality: 'Production Line Critical',
      fail_delay: '125s Carrier Overheat'
    });

    addNode('TOOL-WC-01', 'Wet Clean Tool 01', 'ProcessTool', { x: 3150, y: 240 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Automated Wet Bench',
      upw_demand: '35.0 GPM Mega-Rinse',
      pcw_cooling: '30 kW Chemical Bath Cooling',
      location: 'Cleanroom Bay 3 (Class 10)',
      criticality: 'Production Line Critical',
      fail_delay: '90s Rinse Starvation'
    });

    addNode('TOOL-WC-02', 'Wet Clean Tool 02', 'ProcessTool', { x: 3150, y: 340 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Single Wafer Wet Clean',
      upw_demand: '30.0 GPM Single-Wafer Rinse',
      pcw_cooling: '28 kW Bath Cooling',
      location: 'Cleanroom Bay 3 (Class 10)',
      criticality: 'Production Line Critical',
      fail_delay: '90s Rinse Starvation'
    });

    addNode('TOOL-ETCH-01', 'Etch Tool 01', 'ProcessTool', { x: 3150, y: 460 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Plasma Dry Etcher',
      pcw_cooling: '65 kW RF Generator & ESC',
      location: 'Cleanroom Bay 4 (Class 10)',
      criticality: 'Production Line Critical',
      fail_delay: '45s RF Chamber Overheat'
    });

    addNode('TOOL-ETCH-02', 'Etch Tool 02', 'ProcessTool', { x: 3150, y: 560 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'Plasma Dry Etcher',
      pcw_cooling: '65 kW RF Generator & ESC',
      location: 'Cleanroom Bay 4 (Class 10)',
      criticality: 'Production Line Critical',
      fail_delay: '45s RF Chamber Overheat'
    });

    addNode('TOOL-DEP-01', 'Deposition Tool 01', 'ProcessTool', { x: 3150, y: 680 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'PECVD Thin Film Deposition',
      pcw_cooling: '55 kW Showerhead / Vacuum',
      location: 'Cleanroom Bay 5 (Class 100)',
      criticality: 'Production Line Critical',
      fail_delay: '60s Thermal Drift'
    });

    addNode('TOOL-LITHO-01', 'Lithography Tool 01', 'ProcessTool', { x: 3150, y: 800 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'DUV Immersion Scanner',
      upw_demand: 'Immersion Lens UPW (>18.2 MΩ·cm)',
      pcw_cooling: '80 kW Laser Cavity (21.5°C ± 0.05°C)',
      location: 'Cleanroom Bay 1 (ISO Class 1 Enclosure)',
      criticality: 'Mission Critical Wafer Flow',
      fail_delay: '95s Laser Thermal Trip'
    });

    addNode('TOOL-MET-01', 'Metrology / Inspection Tool 01', 'ProcessTool', { x: 3150, y: 920 }, { background: '#fef3c7', color: '#0f172a', border: '2px solid #f59e0b', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Cleanroom Process Loads',
      category: 'CD-SEM & Defect Inspection',
      upw_demand: '5.0 GPM Clean Flow',
      pcw_cooling: '20 kW Column Temperature Stabilization',
      location: 'Cleanroom Bay 6 (Class 10)',
      criticality: 'Quality & SPC Gate',
      fail_delay: '180s Beam Drift'
    });

    // Electrical & Controls
    addNode('TX-01', 'Utility Transformer 01', 'Transformer', { x: 300, y: -240 }, { background: '#fef08a', color: '#0f172a', border: '2px solid #eab308', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Electrical Power Distribution',
      category: 'Utility Step-Down Transformer',
      capacity: '2,500 kVA (22kV / 415V)',
      type_spec: 'Cast Resin Dry-Type',
      location: 'Substation S-01 (CUP Vault)',
      criticality: 'Tier 1 - Primary Grid Feeder',
      redundancy: '2N Dual Feeder'
    });

    addNode('TX-02', 'Utility Transformer 02', 'Transformer', { x: 300, y: -120 }, { background: '#fef08a', color: '#0f172a', border: '2px solid #eab308', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Electrical Power Distribution',
      category: 'Utility Step-Down Transformer',
      capacity: '2,500 kVA (22kV / 415V)',
      type_spec: 'Cast Resin Dry-Type',
      location: 'Substation S-02 (CUP Vault)',
      criticality: 'Tier 1 - Primary Grid Feeder',
      redundancy: '2N Dual Feeder'
    });

    addNode('MCC-01', 'Motor Control Center 01', 'MCC', { x: 550, y: -240 }, { background: '#fef08a', color: '#0f172a', border: '2px solid #eab308', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Electrical Power Distribution',
      category: 'Low Voltage Motor Switchboard',
      capacity: '4,000A 415V 3-Phase Bus',
      spec: 'Form 4b Arc-Resistant with Intelligent Starters',
      location: 'CUP Electrical Switchroom 1',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Bus Tie Interlock'
    });

    addNode('MCC-02', 'Motor Control Center 02', 'MCC', { x: 550, y: -120 }, { background: '#fef08a', color: '#0f172a', border: '2px solid #eab308', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Electrical Power Distribution',
      category: 'Low Voltage Motor Switchboard',
      capacity: '4,000A 415V 3-Phase Bus',
      spec: 'Form 4b Arc-Resistant with Intelligent Starters',
      location: 'CUP Electrical Switchroom 2',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: 'N+1 Bus Tie Interlock'
    });

    addNode('PLC-UPW-01', 'UPW Control PLC', 'PLC', { x: 800, y: -240 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0284c7', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Automation & SCADA Control',
      category: 'Programmable Logic Controller',
      spec: 'Redundant Hot-Standby CPU System',
      protocol: 'Modbus TCP / Profinet / OPC-UA',
      cycle_time: '10 ms Scan Rate',
      location: 'Central Control Room Cabinet R-01',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '1:1 Hot-Standby Failover'
    });

    addNode('PLC-CHW-01', 'CHW Control PLC', 'PLC', { x: 800, y: -120 }, { background: '#ffffff', color: '#0f172a', border: '2px solid #0891b2', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' }, {
      domain: 'Automation & SCADA Control',
      category: 'Programmable Logic Controller',
      spec: 'Redundant Industrial Controller',
      protocol: 'BACnet / Modbus TCP / EtherNet/IP',
      cycle_time: '12 ms Scan Rate',
      location: 'Central Control Room Cabinet R-02',
      criticality: 'Tier 1 - Mission Critical',
      redundancy: '1:1 Hot-Standby Failover'
    });

    addEdge("e-UPW-TK-01-UPW-P-01-1", "UPW-TK-01", "UPW-P-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-TK-01-UPW-P-02-2", "UPW-TK-01", "UPW-P-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-01-MMF-3a", "UPW-P-01", "MMF", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-02-MMF-3b", "UPW-P-02", "MMF", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    
    // MMF to SAC Cation Exchanger Train
    addEdge("e-MMF-SAC-0911", "MMF", "SAC-0911", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":150,"current_load":125,"unit":"GPM"});
    addEdge("e-MMF-SAC-0912", "MMF", "SAC-0912", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":150,"current_load":125,"unit":"GPM"});
    addEdge("e-MMF-SAC-0913", "MMF", "SAC-0913", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":150,"current_load":125,"unit":"GPM"});
    addEdge("e-MMF-SAC-0914", "MMF", "SAC-0914", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":150,"current_load":125,"unit":"GPM"});

    // Acid Regeneration Train
    addEdge("e-S-091-S-121", "S-091", "S-121", "SUPPLIES", { stroke: "#10b981" }, true, {"max_capacity":50,"current_load":25,"unit":"GPM"});
    addEdge("e-S-121-SAC-0911", "S-121", "SAC-0911", "REGENERATES", { stroke: "#10b981" }, false, {"medium":"Acid Regen"});
    addEdge("e-S-121-SAC-0912", "S-121", "SAC-0912", "REGENERATES", { stroke: "#10b981" }, false, {"medium":"Acid Regen"});
    addEdge("e-S-121-SAC-0913", "S-121", "SAC-0913", "REGENERATES", { stroke: "#10b981" }, false, {"medium":"Acid Regen"});
    addEdge("e-S-121-SAC-0914", "S-121", "SAC-0914", "REGENERATES", { stroke: "#10b981" }, false, {"medium":"Acid Regen"});

    // SAC outputs to Pre-Treated Storage Tanks
    addEdge("e-SAC-0911-T-1011", "SAC-0911", "T-1011", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":250,"current_load":210,"unit":"GPM"});
    addEdge("e-SAC-0912-T-1011", "SAC-0912", "T-1011", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":250,"current_load":210,"unit":"GPM"});
    addEdge("e-SAC-0913-T-1012", "SAC-0913", "T-1012", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":250,"current_load":210,"unit":"GPM"});
    addEdge("e-SAC-0914-T-1012", "SAC-0914", "T-1012", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":250,"current_load":210,"unit":"GPM"});

    // Pre-Treated Storage to Transfer Pump System
    addEdge("e-T-1011-S-111", "T-1011", "S-111", "SUPPLIES", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-T-1012-S-111", "T-1012", "S-111", "SUPPLIES", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});

    // Chemical Dosing into Transfer Stream
    addEdge("e-S-131-S-111", "S-131", "S-111", "INJECTS_INTO", { stroke: "#10b981" }, false, {"medium":"NaHSO3 Bisulfite"});
    addEdge("e-S-0511-S-111", "S-0511", "S-111", "INJECTS_INTO", { stroke: "#10b981" }, false, {"medium":"NaOH Caustic"});

    // Transfer Pump feeds RO Pretreatment Filters
    addEdge("e-S-111-UPW-F-01", "S-111", "UPW-F-01", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-S-111-UPW-F-02", "S-111", "UPW-F-02", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-F-01-UPW-RO-01-5", "UPW-F-01", "UPW-RO-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-F-02-UPW-RO-02-6", "UPW-F-02", "UPW-RO-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    
    // RO Permeate to T-2511 & Reject to T-200
    addEdge("e-UPW-RO-01-T-2511", "UPW-RO-01", "T-2511", "PERMEATE_TO", { stroke: "#10b981" }, true, {"max_capacity":400,"current_load":350,"unit":"GPM"});
    addEdge("e-UPW-RO-02-T-2511", "UPW-RO-02", "T-2511", "PERMEATE_TO", { stroke: "#10b981" }, true, {"max_capacity":400,"current_load":350,"unit":"GPM"});
    addEdge("e-UPW-RO-01-T-200", "UPW-RO-01", "T-200", "REJECT_TO", { stroke: "#10b981" }, true, {"max_capacity":100,"current_load":70,"unit":"GPM"});
    addEdge("e-UPW-RO-02-T-200", "UPW-RO-02", "T-200", "REJECT_TO", { stroke: "#10b981" }, true, {"max_capacity":100,"current_load":70,"unit":"GPM"});

    // Reject Drain to WASTE
    addEdge("e-T-200-WASTE", "T-200", "WASTE", "DRAINS_TO", { stroke: "#10b981" }, true, {"max_capacity":100,"current_load":70,"unit":"GPM"});

    // T-2511 Product feeds downstream intermediate buffer
    addEdge("e-T-2511-UPW-TK-02", "T-2511", "UPW-TK-02", "SUPPLIES", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-TK-02-UPW-EDI-01-9", "UPW-TK-02", "UPW-EDI-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-TK-02-UPW-EDI-02-10", "UPW-TK-02", "UPW-EDI-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    
    // EDI Trains feed Primary Mixed Bed Polisher 3411
    addEdge("e-UPW-EDI-01-MB-3411", "UPW-EDI-01", "MB-3411", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-EDI-02-MB-3411", "UPW-EDI-02", "MB-3411", "FEEDS", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    
    // Primary Mixed Bed Polisher feeds Final UPW Storage Tank
    addEdge("e-MB-3411-UPW-TK-03", "MB-3411", "UPW-TK-03", "SUPPLIES", { stroke: "#10b981" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});

    addEdge("e-UPW-TK-03-UPW-P-03-13", "UPW-TK-03", "UPW-P-03", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-TK-03-UPW-P-04-14", "UPW-TK-03", "UPW-P-04", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-03-UPW-HDR-01-15", "UPW-P-03", "UPW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-04-UPW-HDR-01-16", "UPW-P-04", "UPW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-HDR-01-UPW-LOOP-A-17", "UPW-HDR-01", "UPW-LOOP-A", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-HDR-01-UPW-LOOP-B-18", "UPW-HDR-01", "UPW-LOOP-B", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-HDR-01-UPW-LOOP-C-19", "UPW-HDR-01", "UPW-LOOP-C", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-A-UPW-POU-01-20", "UPW-LOOP-A", "UPW-POU-01", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-A-UPW-POU-02-21", "UPW-LOOP-A", "UPW-POU-02", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-B-UPW-POU-03-22", "UPW-LOOP-B", "UPW-POU-03", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-B-UPW-POU-04-23", "UPW-LOOP-B", "UPW-POU-04", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-C-UPW-POU-05-24", "UPW-LOOP-C", "UPW-POU-05", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-C-UPW-POU-06-25", "UPW-LOOP-C", "UPW-POU-06", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-A-UPW-TK-03-26", "UPW-LOOP-A", "UPW-TK-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-B-UPW-TK-03-27", "UPW-LOOP-B", "UPW-TK-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-C-UPW-TK-03-28", "UPW-LOOP-C", "UPW-TK-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-A-UPW-LOOP-B-29", "UPW-LOOP-A", "UPW-LOOP-B", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-B-UPW-LOOP-C-30", "UPW-LOOP-B", "UPW-LOOP-C", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-LOOP-C-UPW-LOOP-A-31", "UPW-LOOP-C", "UPW-LOOP-A", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-CT-01-CHW-P-01-32", "CHW-CT-01", "CHW-P-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CT-02-CHW-P-02-33", "CHW-CT-02", "CHW-P-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CT-03-CHW-P-03-34", "CHW-CT-03", "CHW-P-03", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CT-04-CHW-P-04-35", "CHW-CT-04", "CHW-P-04", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-01-CHW-CH-01-36", "CHW-P-01", "CHW-CH-01", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-02-CHW-CH-02-37", "CHW-P-02", "CHW-CH-02", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-03-CHW-CH-03-38", "CHW-P-03", "CHW-CH-03", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-04-CHW-CH-04-39", "CHW-P-04", "CHW-CH-04", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-01-CHW-CH-02-40", "CHW-P-01", "CHW-CH-02", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-02-CHW-CH-03-41", "CHW-P-02", "CHW-CH-03", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-03-CHW-CH-04-42", "CHW-P-03", "CHW-CH-04", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-04-CHW-CH-01-43", "CHW-P-04", "CHW-CH-01", "FEEDS", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-01-CHW-P-05-44", "CHW-CH-01", "CHW-P-05", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-02-CHW-P-06-45", "CHW-CH-02", "CHW-P-06", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-03-CHW-P-07-46", "CHW-CH-03", "CHW-P-07", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-04-CHW-P-08-47", "CHW-CH-04", "CHW-P-08", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-01-CHW-HDR-01-48", "CHW-CH-01", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-02-CHW-HDR-01-49", "CHW-CH-02", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-03-CHW-HDR-01-50", "CHW-CH-03", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-04-CHW-HDR-01-51", "CHW-CH-04", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-05-CHW-HDR-01-52", "CHW-P-05", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-06-CHW-HDR-01-53", "CHW-P-06", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-07-CHW-HDR-01-54", "CHW-P-07", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-08-CHW-HDR-01-55", "CHW-P-08", "CHW-HDR-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HDR-01-CHW-ZONE-A-56", "CHW-HDR-01", "CHW-ZONE-A", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HDR-01-CHW-ZONE-B-57", "CHW-HDR-01", "CHW-ZONE-B", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HDR-01-CHW-ZONE-C-58", "CHW-HDR-01", "CHW-ZONE-C", "DISTRIBUTES_TO", { stroke: "#94a3b8" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-A-CHW-AHU-01-59", "CHW-ZONE-A", "CHW-AHU-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-B-CHW-AHU-02-60", "CHW-ZONE-B", "CHW-AHU-02", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-C-CHW-AHU-03-61", "CHW-ZONE-C", "CHW-AHU-03", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-A-CHW-HX-01-62", "CHW-ZONE-A", "CHW-HX-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-B-CHW-HX-02-63", "CHW-ZONE-B", "CHW-HX-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-ZONE-C-CHW-HX-03-64", "CHW-ZONE-C", "CHW-HX-03", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-AHU-01-CHW-CH-01-65", "CHW-AHU-01", "CHW-CH-01", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-AHU-02-CHW-CH-02-66", "CHW-AHU-02", "CHW-CH-02", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-AHU-03-CHW-CH-03-67", "CHW-AHU-03", "CHW-CH-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-01-CHW-CH-01-68", "CHW-HX-01", "CHW-CH-01", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-02-CHW-CH-02-69", "CHW-HX-02", "CHW-CH-02", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-03-CHW-CH-03-70", "CHW-HX-03", "CHW-CH-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-01-CHW-CH-02-71", "CHW-HX-01", "CHW-CH-02", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-02-CHW-CH-03-72", "CHW-HX-02", "CHW-CH-03", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-03-CHW-CH-04-73", "CHW-HX-03", "CHW-CH-04", "RETURNS_TO", { stroke: "#64748b", strokeDasharray: "5 5" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-01-TOOL-CMP-01-74", "UPW-POU-01", "TOOL-CMP-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-01-TOOL-CMP-01-75", "CHW-HX-01", "TOOL-CMP-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-02-TOOL-CMP-02-76", "UPW-POU-02", "TOOL-CMP-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-01-TOOL-CMP-02-77", "CHW-HX-01", "TOOL-CMP-02", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-03-TOOL-WC-01-78", "UPW-POU-03", "TOOL-WC-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-02-TOOL-WC-01-79", "CHW-HX-02", "TOOL-WC-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-04-TOOL-WC-02-80", "UPW-POU-04", "TOOL-WC-02", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-02-TOOL-WC-02-81", "CHW-HX-02", "TOOL-WC-02", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-03-TOOL-ETCH-01-82", "CHW-HX-03", "TOOL-ETCH-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-03-TOOL-ETCH-02-83", "CHW-HX-03", "TOOL-ETCH-02", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-HX-02-TOOL-DEP-01-84", "CHW-HX-02", "TOOL-DEP-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-05-TOOL-LITHO-01-85", "UPW-POU-05", "TOOL-LITHO-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-01-TOOL-LITHO-01-86", "CHW-HX-01", "TOOL-LITHO-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-UPW-POU-06-TOOL-MET-01-87", "UPW-POU-06", "TOOL-MET-01", "SUPPLIES", { stroke: "#0284c7" }, true, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-HX-03-TOOL-MET-01-88", "CHW-HX-03", "TOOL-MET-01", "COOLS", { stroke: "#06b6d4" }, true, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-TX-01-MCC-01-89", "TX-01", "MCC-01", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-TX-02-MCC-02-90", "TX-02", "MCC-02", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-01-UPW-P-01-91", "MCC-01", "UPW-P-01", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-01-UPW-P-04-92", "MCC-01", "UPW-P-04", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-01-CHW-P-05-93", "MCC-01", "CHW-P-05", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-01-CHW-P-07-94", "MCC-01", "CHW-P-07", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-02-UPW-P-02-95", "MCC-02", "UPW-P-02", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-02-UPW-P-03-96", "MCC-02", "UPW-P-03", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-02-CHW-P-06-97", "MCC-02", "CHW-P-06", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-MCC-02-CHW-P-08-98", "MCC-02", "CHW-P-08", "POWERS", { stroke: "#eab308", strokeDasharray: "5 5" }, true, {"max_capacity":2500,"current_load":1850,"unit":"kW"});
    addEdge("e-PLC-UPW-01-UPW-P-01-99", "PLC-UPW-01", "UPW-P-01", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-UPW-01-UPW-P-02-100", "PLC-UPW-01", "UPW-P-02", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-UPW-01-UPW-P-03-101", "PLC-UPW-01", "UPW-P-03", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-UPW-01-UPW-P-04-102", "PLC-UPW-01", "UPW-P-04", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-01-103", "PLC-CHW-01", "CHW-P-01", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-02-104", "PLC-CHW-01", "CHW-P-02", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-03-105", "PLC-CHW-01", "CHW-P-03", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-04-106", "PLC-CHW-01", "CHW-P-04", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-05-107", "PLC-CHW-01", "CHW-P-05", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-06-108", "PLC-CHW-01", "CHW-P-06", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-07-109", "PLC-CHW-01", "CHW-P-07", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-PLC-CHW-01-CHW-P-08-110", "PLC-CHW-01", "CHW-P-08", "CONTROLS", { stroke: "#10b981", strokeDasharray: "5 5" }, true, {"latency_ms":12,"protocol":"Modbus_TCP"});
    addEdge("e-UPW-P-02-UPW-P-01-111", "UPW-P-02", "UPW-P-01", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-01-UPW-P-02-112", "UPW-P-01", "UPW-P-02", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-04-UPW-P-03-113", "UPW-P-04", "UPW-P-03", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-UPW-P-03-UPW-P-04-114", "UPW-P-03", "UPW-P-04", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":500,"current_load":420,"unit":"GPM"});
    addEdge("e-CHW-CH-04-CHW-CH-01-115", "CHW-CH-04", "CHW-CH-01", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-04-CHW-CH-02-116", "CHW-CH-04", "CHW-CH-02", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-CH-04-CHW-CH-03-117", "CHW-CH-04", "CHW-CH-03", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-08-CHW-P-05-118", "CHW-P-08", "CHW-P-05", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-08-CHW-P-06-119", "CHW-P-08", "CHW-P-06", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
    addEdge("e-CHW-P-08-CHW-P-07-120", "CHW-P-08", "CHW-P-07", "BACKUP_FOR", { stroke: "#f43f5e", strokeDasharray: "5 5" }, false, {"max_capacity":1200,"current_load":850,"unit":"Tons"});
  }

  private initializeOntology() {
    this.ontology = [
      // 0. Historical Incident Knowledge Base (Past Cases for CHW-P-01 - Prioritized at Top)
      // Case 1: Cavitation Incident
      { subject: 'CHW-P-01', predicate: 'hasHistoricalCase', object: 'Case_CHW_P01_2025_Cavitation' },
      { subject: 'Case_CHW_P01_2025_Cavitation', predicate: 'rdf:type', object: 'HistoricalCase' },
      { subject: 'Case_CHW_P01_2025_Cavitation', predicate: 'hasSymptom', object: 'High impeller vibration (>4.5 mm/s) and suction cavitation noise' },
      { subject: 'Case_CHW_P01_2025_Cavitation', predicate: 'hasRootCause', object: 'Suction strainer clogging causing low NPSHa and severe cavitation' },
      { subject: 'Case_CHW_P01_2025_Cavitation', predicate: 'hasMitigation', object: 'Switched to standby pump CHW-P-02 and cleaned basket strainer ST-01' },

      // Case 2: Mechanical Seal Leak Incident
      { subject: 'CHW-P-01', predicate: 'hasHistoricalCase', object: 'Case_CHW_P01_2026_MechanicalSealLeak' },
      { subject: 'Case_CHW_P01_2026_MechanicalSealLeak', predicate: 'rdf:type', object: 'HistoricalCase' },
      { subject: 'Case_CHW_P01_2026_MechanicalSealLeak', predicate: 'hasSymptom', object: 'Continuous seal flush fluid leakage (>50 ml/min) at shaft sleeve' },
      { subject: 'Case_CHW_P01_2026_MechanicalSealLeak', predicate: 'hasRootCause', object: 'Thermal shock on silicon carbide primary seal faces during rapid restart' },
      { subject: 'Case_CHW_P01_2026_MechanicalSealLeak', predicate: 'hasMitigation', object: 'Replaced mechanical seal cartridge and updated SOP soft-start ramp rate' },

      // 1. The 8 Telemetry Alarms & Sensor Bindings
      { subject: 'A-01', predicate: 'monitoredAsset', object: 'MCC-01' },
      { subject: 'A-01', predicate: 'sensedCondition', object: 'GroundFault' },
      { subject: 'A-02', predicate: 'monitoredAsset', object: 'CHW-P-05' },
      { subject: 'A-02', predicate: 'sensedCondition', object: 'LossOfPower' },
      { subject: 'A-03', predicate: 'monitoredAsset', object: 'CHW-HDR-01' },
      { subject: 'A-03', predicate: 'sensedCondition', object: 'LossOfPressure' },
      { subject: 'A-04', predicate: 'monitoredAsset', object: 'CHW-HX-01' },
      { subject: 'A-04', predicate: 'sensedCondition', object: 'LossOfCoolantFlow' },
      { subject: 'A-05', predicate: 'monitoredAsset', object: 'CHW-AHU-01' },
      { subject: 'A-05', predicate: 'sensedCondition', object: 'LossOfCoolantFlow' },
      { subject: 'A-06', predicate: 'monitoredAsset', object: 'TOOL-LITHO-01' },
      { subject: 'A-06', predicate: 'sensedCondition', object: 'ThermalDrift' },
      { subject: 'A-07', predicate: 'monitoredAsset', object: 'TOOL-CMP-01' },
      { subject: 'A-07', predicate: 'sensedCondition', object: 'LossOfPlatenCooling' },
      { subject: 'A-08', predicate: 'monitoredAsset', object: 'TOOL-CMP-02' },
      { subject: 'A-08', predicate: 'sensedCondition', object: 'CarrierHeadOverheat' },

      // 2. Equipment Class Physical Input/Output Dependencies (Domain Physics)
      { subject: 'ElectricalBus', predicate: 'providesOutput', object: 'ElectricalPower' },
      { subject: 'BackupPower', predicate: 'providesOutput', object: 'ElectricalPower' },
      { subject: 'Pump', predicate: 'requiresInput', object: 'ElectricalPower' },
      { subject: 'Pump', predicate: 'providesOutput', object: 'HydraulicPressure' },
      { subject: 'Header', predicate: 'requiresInput', object: 'HydraulicPressure' },
      { subject: 'Header', predicate: 'providesOutput', object: 'CoolantFlow' },
      { subject: 'HeatExchanger', predicate: 'requiresInput', object: 'CoolantFlow' },
      { subject: 'HeatExchanger', predicate: 'providesOutput', object: 'ThermalRejection' },
      { subject: 'AirHandlingUnit', predicate: 'requiresInput', object: 'CoolantFlow' },
      { subject: 'AirHandlingUnit', predicate: 'providesOutput', object: 'AirCooling' },
      { subject: 'LithoTool', predicate: 'requiresInput', object: 'ThermalRejection' },
      { subject: 'LithoTool', predicate: 'providesOutput', object: 'WaferExposure' },
      { subject: 'CmpTool', predicate: 'requiresInput', object: 'ThermalRejection' },
      { subject: 'CmpTool', predicate: 'providesOutput', object: 'WaferPolishing' },
      { subject: 'EtchTool', predicate: 'requiresInput', object: 'ThermalRejection' },
      { subject: 'EtchTool', predicate: 'providesOutput', object: 'WaferEtching' },

      // 3. Governing Physical Laws & Equations (Thermodynamics & Hydraulics)
      { subject: 'ElectricalPower', predicate: 'governedByLaw', object: 'Joule_Ohm_Law [P = sqrt(3)*V*I*cosPhi]' },
      { subject: 'HydraulicPressure', predicate: 'governedByLaw', object: 'Bernoulli_Pump_Head [dP = rho*g*H]' },
      { subject: 'CoolantFlow', predicate: 'governedByLaw', object: 'Continuity_Equation [Q = Area * v]' },
      { subject: 'ThermalRejection', predicate: 'governedByLaw', object: 'First_Law_Thermodynamics [Q_dot = m_dot*Cp*dT]' },
      { subject: 'AirCooling', predicate: 'governedByLaw', object: 'Psychrometric_Enthalpy [q = m_air*dh]' },

      // 4. Operating Mediums, Nominal Setpoints & Failure Time Delays (tau)
      { subject: 'MCC-01', predicate: 'carriesMedium', object: '415V_3Phase_AC' },
      { subject: 'MCC-01', predicate: 'nominalRating', object: '415V / 1200A [500kVA]' },
      { subject: 'MCC-01', predicate: 'failureDelay', object: 'Instantaneous (<50ms)' },
      { subject: 'MCC-01', predicate: 'hazardLevel', object: 'Cat-4 Arc Flash (40 cal/cm2)' },

      { subject: 'MCC-02', predicate: 'carriesMedium', object: '415V_3Phase_AC' },
      { subject: 'MCC-02', predicate: 'nominalRating', object: '415V / 1200A [500kVA]' },
      { subject: 'MCC-02', predicate: 'failureDelay', object: 'Instantaneous (<50ms)' },
      { subject: 'MCC-02', predicate: 'hazardLevel', object: 'Cat-4 Arc Flash (40 cal/cm2)' },

      { subject: 'CHW-P-05', predicate: 'carriesMedium', object: 'CHW_Hydraulic_Mass' },
      { subject: 'CHW-P-05', predicate: 'nominalRating', object: '1500 GPM @ 5.8 Bar' },
      { subject: 'CHW-P-05', predicate: 'failureDelay', object: 'Inertial Spin-Down (~12s)' },

      { subject: 'CHW-HDR-01', predicate: 'carriesMedium', object: 'Primary_CHW_6degC' },
      { subject: 'CHW-HDR-01', predicate: 'nominalRating', object: '5.5 Bar Header Static Pressure' },
      { subject: 'CHW-HDR-01', predicate: 'failureDelay', object: 'Hydraulic Depressurization (~8s)' },

      { subject: 'CHW-HX-01', predicate: 'carriesMedium', object: 'Secondary_PCW_18degC' },
      { subject: 'CHW-HX-01', predicate: 'nominalRating', object: '850 kW Heat Dissipation Capacity' },
      { subject: 'CHW-HX-01', predicate: 'failureDelay', object: 'Thermal Buffer Depletion (~45s)' },

      { subject: 'CHW-AHU-01', predicate: 'carriesMedium', object: 'Cleanroom_Air' },
      { subject: 'CHW-AHU-01', predicate: 'nominalRating', object: '45,000 CFM @ 21.0 degC' },
      { subject: 'CHW-AHU-01', predicate: 'failureDelay', object: 'Cleanroom Thermal Drift (~180s)' },

      { subject: 'TOOL-LITHO-01', predicate: 'carriesMedium', object: 'Laser_Cavity_PCW' },
      { subject: 'TOOL-LITHO-01', predicate: 'nominalRating', object: '21.5 +/- 0.1 degC Tolerance' },
      { subject: 'TOOL-LITHO-01', predicate: 'failureDelay', object: 'Laser Thermal Mass Starvation (~95s)' },

      { subject: 'TOOL-CMP-01', predicate: 'carriesMedium', object: 'Platen_PCW' },
      { subject: 'TOOL-CMP-01', predicate: 'nominalRating', object: '25.0 GPM Platen Flow' },
      { subject: 'TOOL-CMP-01', predicate: 'failureDelay', object: 'Pad/Slurry Overheating (~110s)' },

      { subject: 'TOOL-CMP-02', predicate: 'carriesMedium', object: 'Carrier_Head_PCW' },
      { subject: 'TOOL-CMP-02', predicate: 'nominalRating', object: '18.0 GPM Head Flow' },
      { subject: 'TOOL-CMP-02', predicate: 'failureDelay', object: 'Carrier Membrane Overheating (~125s)' },
    ];

    // 5. Full Synchronization of Adjacency List (LPG) with RDF Triplestore
    // Ensure all nodes have their rdf:type in the ontology
    const existingTypeSubjects = new Set(
      this.ontology.filter(t => t.predicate === 'rdf:type').map(t => t.subject)
    );
    for (const node of (this.graph as any).graphData.nodes) {
      if (!existingTypeSubjects.has(node.id)) {
        const type = node.data?.type || node.type || 'Equipment';
        this.ontology.push({ subject: node.id, predicate: 'rdf:type', object: type });
        existingTypeSubjects.add(node.id);
      }
    }

    // Ensure all topology edges (adjacency relationships) are in the ontology
    const existingTripleKeys = new Set(
      this.ontology.map(t => `${t.subject}::${t.predicate}::${t.object}`)
    );
    for (const edge of (this.graph as any).graphData.edges) {
      const rel = edge.label || edge.type;
      const key = `${edge.source}::${rel}::${edge.target}`;
      if (!existingTripleKeys.has(key)) {
        this.ontology.push({ subject: edge.source, predicate: rel, object: edge.target });
        existingTripleKeys.add(key);
      }
    }

    // 6. Case 1: UPW-RO-01 Permeate Sensor Drift & O-Ring Leak Triples (Absolute Bottom of Triplestore)
    this.ontology.push(
      { subject: 'UPW-RO-01', predicate: 'hasHistoricalCase', object: 'Case_RO01_2026_ProbeDrift_ORingLeak' },
      { subject: 'Case_RO01_2026_ProbeDrift_ORingLeak', predicate: 'rdf:type', object: 'HistoricalCase' },
      { subject: 'Case_RO01_2026_ProbeDrift_ORingLeak', predicate: 'hasSymptom', object: 'Localized UPW-RO-01 permeate conductivity drift (>0.033 uS/cm) with nominal delta-P (1.4 bar) and healthy sister unit UPW-RO-02 (<0.03 uS/cm)' },
      { subject: 'Case_RO01_2026_ProbeDrift_ORingLeak', predicate: 'hasRootCause', object: 'Local permeate sensor probe calibration drift or unseated permeate tube interconnector O-ring leak on UPW-RO-01' },
      { subject: 'Case_RO01_2026_ProbeDrift_ORingLeak', predicate: 'hasMitigation', object: '1. Perform inline two-point recalibration of conductivity sensor probe UPW-RO-01-COND. 2. Inspect RO-01 permeate tube interconnector O-rings during next scheduled sanitization window.' },
      { subject: 'UPW-RO-01', predicate: 'susceptibleTo', object: 'SensorDrift_ORingLeak' },
      { subject: 'SensorDrift_ORingLeak', predicate: 'inducesDrift', object: 'Permeate_Conductivity_Excursion' },
      { subject: 'SensorDrift_ORingLeak', predicate: 'governedByLaw', object: 'Nernst_Planck_Ion_Transport & ASTM_D1125_Sensor_Electrochemistry' },
      { subject: 'UPW-RO-01', predicate: 'carriesMedium', object: 'Ultrapure_RO_Permeate' },
      { subject: 'UPW-RO-01', predicate: 'nominalRating', object: 'Recovery 78%, Permeate Cond <0.06 uS/cm, dP 1.4 Bar' },
      { subject: 'UPW-RO-01', predicate: 'failureDelay', object: 'Slow Sensor Drift (~10-30 mins)' },

      // 7. Case 2: T-1012 Upstream Cation Resin Breakthrough & Dual-Train RO Contamination Triples
      { subject: 'T-1012', predicate: 'hasHistoricalCase', object: 'Case_T1012_2026_CationBreakthrough_FeedContamination' },
      { subject: 'Case_T1012_2026_CationBreakthrough_FeedContamination', predicate: 'rdf:type', object: 'HistoricalCase' },
      { subject: 'Case_T1012_2026_CationBreakthrough_FeedContamination', predicate: 'hasSymptom', object: 'Symmetric multi-train RO permeate conductivity spike (>0.08 uS/cm) and dP rise (>2.3 bar) on BOTH UPW-RO-01 and UPW-RO-02 accompanied by T-1012 conductivity >7.8 uS/cm and pH 4.8' },
      { subject: 'Case_T1012_2026_CationBreakthrough_FeedContamination', predicate: 'hasDistinguishingFeature', object: 'Symmetric Dual-Train RO Degradation rules out single-element O-ring failure (Case 1); confirms upstream feed contamination' },
      { subject: 'Case_T1012_2026_CationBreakthrough_FeedContamination', predicate: 'hasRootCause', object: 'Strong Acid Cation (SAC) resin exhaustion in SAC-0913/0914 causing un-neutralized mineral slip into buffer tank T-1012' },
      { subject: 'Case_T1012_2026_CationBreakthrough_FeedContamination', predicate: 'hasMitigation', object: '1. Isolate T-1012 and switch S-111 pump suction to N+1 standby tank T-1011. 2. Take SAC-0913/0914 offline and initiate acid regeneration via skid S-121.' },
      { subject: 'T-1012', predicate: 'susceptibleTo', object: 'CationResinExhaustion_MineralSlip' },
      { subject: 'CationResinExhaustion_MineralSlip', predicate: 'inducesDrift', object: 'CommonMode_RO_FeedContamination' },
      { subject: 'CommonMode_RO_FeedContamination', predicate: 'affectsAsset', object: 'UPW-RO-01' },
      { subject: 'CommonMode_RO_FeedContamination', predicate: 'affectsAsset', object: 'UPW-RO-02' },
      { subject: 'SAC-0913', predicate: 'susceptibleTo', object: 'CationResinExhaustion_MineralSlip' },
      { subject: 'SAC-0913', predicate: 'regeneratedBy', object: 'S-121' },
      { subject: 'SAC-0914', predicate: 'susceptibleTo', object: 'CationResinExhaustion_MineralSlip' },
      { subject: 'SAC-0914', predicate: 'regeneratedBy', object: 'S-121' },
      { subject: 'T-1012', predicate: 'carriesMedium', object: 'Decationized_PreTreated_Water' },
      { subject: 'T-1012', predicate: 'nominalRating', object: 'Conductivity <2.0 uS/cm, pH 6.5-7.2, 30k Gal Buffer' },
      { subject: 'T-1012', predicate: 'hasBackupAsset', object: 'T-1011' },
      { subject: 'T-1011', predicate: 'carriesMedium', object: 'Decationized_PreTreated_Water' },
      { subject: 'T-1011', predicate: 'nominalRating', object: 'Conductivity <2.0 uS/cm, pH 6.5-7.2, 30k Gal Buffer (Standby)' },
      { subject: 'T-1011', predicate: 'isAvailableAsFailover', object: 'true' },

      // 8. Case 3: Intake Multi-Media Filter (MMF) Underdrain Rupture & Dual-Tank Silt Breakthrough
      { subject: 'MMF', predicate: 'hasHistoricalCase', object: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough' },
      { subject: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough', predicate: 'rdf:type', object: 'HistoricalCase' },
      { subject: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough', predicate: 'hasSymptom', object: 'Plant-wide pretreatment collapse: Silt and particulate breakthrough contaminating BOTH storage tanks T-1011 & T-1012 (Cond >6.0 uS/cm, pH ~5.0) causing severe colloidal spacer fouling (dP >2.6 bar) and salt passage on BOTH UPW-RO-01 & RO-02' },
      { subject: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough', predicate: 'hasDistinguishingFeature', object: 'Both buffer tanks T-1011 AND T-1012 are contaminated; rules out Case 2 (where standby T-1011 is clean); rules out Case 1 (where sister RO-02 is nominal); confirms intake filtration collapse upstream of both tanks' },
      { subject: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough', predicate: 'hasRootCause', object: 'Underdrain lateral nozzle mesh collapse on Multi-Media Filter Bank MMF causing anthrafilt and garnet sand slip into downstream distribution' },
      { subject: 'Case_MMF_2026_UnderdrainRupture_SiltBreakthrough', predicate: 'hasMitigation', object: '1. Emergency trip of raw water intake pump UPW-P-01 to halt silt intake. 2. Isolate MMF bank and bypass to secondary reserve. 3. Do NOT switch to T-1011 (standby tank also fouled). 4. Initiate high-rate backwash and underdrain rebuild on MMF skid.' },
      { subject: 'MMF', predicate: 'susceptibleTo', object: 'UnderdrainNozzleFailure_MediaSlip' },
      { subject: 'UnderdrainNozzleFailure_MediaSlip', predicate: 'inducesDrift', object: 'PlantWide_Silt_Colloidal_Fouling' },
      { subject: 'PlantWide_Silt_Colloidal_Fouling', predicate: 'affectsAsset', object: 'T-1011' },
      { subject: 'PlantWide_Silt_Colloidal_Fouling', predicate: 'affectsAsset', object: 'T-1012' },
      { subject: 'PlantWide_Silt_Colloidal_Fouling', predicate: 'affectsAsset', object: 'UPW-RO-01' },
      { subject: 'PlantWide_Silt_Colloidal_Fouling', predicate: 'affectsAsset', object: 'UPW-RO-02' },
      { subject: 'MMF', predicate: 'carriesMedium', object: 'Intake_Clarified_Raw_Water' },
      { subject: 'MMF', predicate: 'nominalRating', object: 'Turbidity <0.2 NTU, SDI <3.0, 500 GPM Dual-Bed' },
      { subject: 'MMF', predicate: 'failureDelay', object: 'Rapid Silt Dispersion (~5-15 mins)' }
    );
  }

  public getTopology() {
    return {
      flowData: (this.graph as any).graphData,
      graphData: this.graph.export()
    };
  }

  public getOntology() {
    return this.ontology;
  }

  public setOntology(triples: { subject: string; predicate: string; object: string }[]) {
    this.ontology = triples;
  }

  public addOntologyTriples(newTriples: { subject: string; predicate: string; object: string }[]) {
    this.ontology = [...newTriples, ...this.ontology];
    return this.ontology;
  }

  public addTriple(triple: { subject: string; predicate: string; object: string }): boolean {
    const exists = this.ontology.some(
      t => t.subject === triple.subject && t.predicate === triple.predicate && t.object === triple.object
    );
    if (!exists) {
      this.ontology.push(triple);
      return true;
    }
    return false;
  }

  public removeTriple(subject: string, predicate: string, object: string): boolean {
    const initialLen = this.ontology.length;
    this.ontology = this.ontology.filter(
      t => !(t.subject === subject && t.predicate === predicate && t.object === object)
    );
    return this.ontology.length < initialLen;
  }

  public updateTriple(
    oldTriple: { subject: string; predicate: string; object: string },
    newTriple: { subject: string; predicate: string; object: string }
  ): boolean {
    const idx = this.ontology.findIndex(
      t => t.subject === oldTriple.subject && t.predicate === oldTriple.predicate && t.object === oldTriple.object
    );
    if (idx !== -1) {
      this.ontology[idx] = newTriple;
      return true;
    }
    return false;
  }

  public resetOntologyToInitial(): any[] {
    this.ontology = [];
    this.initializeOntology();
    return this.ontology;
  }

  private liveTelemetry: Record<string, any> = {};

  public setLiveTelemetry(telemetry: Record<string, any>) {
    this.liveTelemetry = { ...this.liveTelemetry, ...telemetry };
  }

  public getLiveTelemetry(): Record<string, any> {
    return this.liveTelemetry;
  }
}

export const digitalTwin = new DigitalTwinCore();
