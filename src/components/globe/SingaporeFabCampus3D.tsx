import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Upload, RotateCcw, Box, CheckCircle2, Play, Pause } from 'lucide-react';

const DEFAULT_MODEL_PATH = '/models/fab_facility.glb';
const FALLBACK_MODEL_PATH = '/models/fab_facility.glb';

export const SingaporeFabCampus3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [loadingState, setLoadingState] = useState<{ loading: boolean; progress: number; message: string }>({
    loading: true,
    progress: 0,
    message: 'Loading 3D CAD Campus Twin...'
  });
  const [loadedModelInfo, setLoadedModelInfo] = useState<{ name: string; meshCount: number; isCustomUpload?: boolean } | null>(null);

  // References to three.js scene elements
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const activeLoaderRef = useRef<GLTFLoader | null>(null);

  const toggleAutoRotate = () => {
    setIsAutoRotating(prev => {
      const next = !prev;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
      }
      return next;
    });
  };

  // Function to load GLTF/GLB from ArrayBuffer or URL
  const loadGlbData = (source: string | ArrayBuffer, modelName: string, isCustomUpload = false) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const modelGroup = modelGroupRef.current;

    if (!scene || !camera || !controls || !modelGroup) return;

    setLoadingState({ loading: true, progress: 20, message: `Loading ${modelName}...` });

    const loader = new GLTFLoader();
    activeLoaderRef.current = loader;

    const handleGltfLoaded = (gltf: any) => {
      // Clear previous models and free memory
      while (modelGroup.children.length > 0) {
        const obj = modelGroup.children[0];
        modelGroup.remove(obj);
        obj.traverse?.((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m: any) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }

      const model = gltf.scene;
      let meshCount = 0;

      // Enable shadows, vertex colors and optimize materials
      model.traverse((child: any) => {
        if (child.isMesh) {
          meshCount++;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            if (child.geometry?.attributes?.color) {
              child.material.vertexColors = true;
            }
          }
        }
      });

      // Auto-detect orientation: only rotate CAD Z-Up models, preserve native Y-Up models
      const preBbox = new THREE.Box3().setFromObject(model);
      const preSize = preBbox.getSize(new THREE.Vector3());
      const isCadZUp = preSize.z < preSize.y && preBbox.min.z <= 0.5 && preBbox.max.z > 0;
      if (isCadZUp) {
        model.rotation.x = -Math.PI / 2;
        model.updateMatrixWorld(true);
      }

      // Calculate bounding box and center the model
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Center model at ground level (y = 0)
      model.position.x = -center.x;
      model.position.y = -bbox.min.y;
      model.position.z = -center.z;

      modelGroup.add(model);

      // Frame camera nicely based on model size
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.near = Math.max(0.1, maxDim / 1000);
      camera.far = Math.max(3000, maxDim * 25);
      camera.updateProjectionMatrix();

      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.58;
      cameraDistance = Math.max(cameraDistance, 15);

      camera.position.set(-cameraDistance * 0.48, cameraDistance * 0.45, cameraDistance * 0.75);
      controls.target.set(0, size.y * 0.3, 0);
      camera.lookAt(0, size.y * 0.3, 0);
      controls.maxDistance = cameraDistance * 6;
      controls.minDistance = 5;
      controls.update();

      setLoadedModelInfo({ name: modelName, meshCount, isCustomUpload });
      setLoadingState({ loading: false, progress: 100, message: 'Model loaded successfully' });
    };

    if (typeof source === 'string') {
      loader.load(
        source,
        handleGltfLoaded,
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            setLoadingState({ loading: true, progress: percent, message: `Loading ${percent}%...` });
          }
        },
        (error) => {
          console.warn('Could not load GLB from URL:', source, error);
          // Attempt fallback if primary failed
          if (source === DEFAULT_MODEL_PATH) {
            console.log('Attempting fallback model:', FALLBACK_MODEL_PATH);
            loadGlbData(FALLBACK_MODEL_PATH, 'campus.glb', false);
          } else {
            setLoadingState({ loading: false, progress: 0, message: 'Failed to load 3D model' });
          }
        }
      );
    } else {
      loader.parse(
        source,
        '',
        handleGltfLoaded,
        (error) => {
          console.error('Error parsing GLB buffer:', error);
          setLoadingState({ loading: false, progress: 0, message: 'Failed to parse GLB file' });
        }
      );
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert('Please upload a .glb or .gltf 3D model file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        loadGlbData(buffer, file.name, true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetToDefault = () => {
    loadGlbData(DEFAULT_MODEL_PATH, 'fab_facility.glb', false);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. SCENE SETUP - Clean studio dark tech environment with better visibility
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131a28);
    scene.fog = new THREE.FogExp2(0x131a28, 0.001);
    sceneRef.current = scene;

    // 2. CAMERA
    const camera = new THREE.PerspectiveCamera(45, (width / height) || 1.6, 0.1, 2000);
    camera.position.set(-50, 90, 160);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. RENDERER WITH SAFE INITIALIZATION
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "default" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.30; // 1.45 reduced by 10%
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed for Singapore Campus:', err);
      setWebGlSupported(false);
      return;
    }

    // 4. CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 0.90; // gentle, natural cinematic spin (+20% speed)
    controlsRef.current = controls;

    // 5. HIGH-VISIBILITY STUDIO LIGHTING RIG (All intensities reduced by 10%)
    // Sky and Ground ambient hemisphere light for soft natural bounce
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.62); // 1.8 -> 1.62 (-10%)
    scene.add(hemiLight);

    // Omni-directional ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.08); // 1.2 -> 1.08 (-10%)
    scene.add(ambientLight);

    // Primary Sun / Key Light with high lumens
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.88); // 3.2 -> 2.88 (-10%)
    keyLight.position.set(-70, 140, 90);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 450;
    keyLight.shadow.camera.left = -160;
    keyLight.shadow.camera.right = 160;
    keyLight.shadow.camera.top = 160;
    keyLight.shadow.camera.bottom = -160;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    // Cool fill light to illuminate building sides and cleanroom facades
    const fillLight = new THREE.DirectionalLight(0xb0d4ff, 1.80); // 2.0 -> 1.80 (-10%)
    fillLight.position.set(90, 60, -90);
    scene.add(fillLight);

    // Rim / Back light to pop architectural edges against the background
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.26); // 1.4 -> 1.26 (-10%)
    rimLight.position.set(-90, 50, -100);
    scene.add(rimLight);

    // Front soft bounce light
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.99); // 1.1 -> 0.99 (-10%)
    frontLight.position.set(0, 30, 120);
    scene.add(frontLight);

    // 6. INDUSTRIAL GROUND GRID & POLISHED PLATFORM
    const gridHelper = new THREE.GridHelper(300, 150, 0x10b981, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. MODEL CONTAINER GROUP
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 8. LOAD 3D CAD MODEL DIRECTLY (NO PROCEDURAL BASE)
    loadGlbData(DEFAULT_MODEL_PATH, 'fab_facility.glb', false);

    // 9. ANIMATION LOOP
    const animate = () => {
      if (isDisposed) return;
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 10. RESIZE OBSERVER
    let resizeFrameId: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        if (!container || !camera || !renderer || isDisposed) return;
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        if (nw <= 0 || nh <= 0) return;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      });
    });
    resizeObserver.observe(container);

    // CLEANUP
    return () => {
      isDisposed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeObserver.disconnect();
      try {
        controls.dispose();
      } catch {}
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      try {
        renderer.dispose();
      } catch {}
    };
  }, []);

  return (
    <div 
      className={`w-full h-full bg-[#111827] rounded-xl overflow-hidden shadow-2xl relative border ${
        isDragOver ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-800'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Hidden File Input for GLB Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".glb,.gltf" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {webGlSupported ? (
        <div ref={mountRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="text-emerald-400 font-mono text-sm mb-2">GlobalFoundries Megasite Campus</div>
          <div className="text-slate-400 text-xs font-mono max-w-sm">
            Interactive 3D CAD Campus Twin loaded with hardware acceleration.
          </div>
        </div>
      )}

      {/* Top Left Title & Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="text-white font-mono text-sm bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg flex items-center gap-2">
          <Box className="w-4 h-4 text-emerald-400" />
          <span>GlobalFoundries Concept Fab 3D Twin</span>
        </div>
        <div className="text-slate-400 font-mono text-[10px] bg-slate-900/80 px-2 py-1 rounded w-fit border border-slate-800 tracking-wider flex items-center gap-1.5">
          {loadedModelInfo ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">
                {loadedModelInfo.isCustomUpload ? 'CUSTOM CAD:' : 'PRODUCTION CAD:'} {loadedModelInfo.name}
              </span>
              <span className="text-slate-500">({loadedModelInfo.meshCount} meshes)</span>
            </>
          ) : (
            <span className="text-amber-400 animate-pulse">LOADING 3D CAD MODEL...</span>
          )}
        </div>
      </div>

      {/* Top Right Actions Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleAutoRotate}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg active:scale-95 ${
            isAutoRotating
              ? 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-400'
          }`}
          title={isAutoRotating ? 'Pause gentle auto-rotation' : 'Resume gentle auto-rotation'}
        >
          {isAutoRotating ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-slate-300" />}
          <span className="hidden sm:inline">{isAutoRotating ? 'Spinning' : 'Spin: Off'}</span>
        </button>

        {loadedModelInfo?.isCustomUpload && (
          <button
            onClick={handleResetToDefault}
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg"
            title="Reset to default production CAD model"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-emerald-950/70 backdrop-blur-xs border-2 border-dashed border-emerald-400 rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Upload className="w-12 h-12 text-emerald-400 mb-3 animate-bounce" />
          <div className="text-white font-mono text-sm font-bold">Drop your .GLB or .GLTF file here</div>
          <div className="text-emerald-300 text-xs font-mono mt-1">Replaces the 3D campus twin model immediately</div>
        </div>
      )}

      {/* Loading HUD indicator */}
      {loadingState.loading && (
        <div className="absolute bottom-6 left-6 z-20 bg-slate-900/90 border border-slate-700 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-3 font-mono text-xs backdrop-blur-md">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>{loadingState.message}</span>
        </div>
      )}

      {/* Bottom Right Navigation Hints */}
      <div className="absolute bottom-4 right-4 z-10 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 pointer-events-none hidden sm:block">
        Left Click: Orbit • Right Click: Pan • Scroll: Zoom • Auto-Spin Active
      </div>
    </div>
  );
};
