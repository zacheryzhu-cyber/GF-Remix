import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GlobalSite } from '../../types';
import { GLOBAL_SITES } from '../../data/globalSitesData';
import { HIGH_RES_WORLD_POLYGONS, GLOBAL_TECH_LIGHTS } from '../../data/worldCoastlineData';
import { RotateCw, ZoomIn, ZoomOut, Compass, Sparkles, Globe } from 'lucide-react';

interface Globe3DProps {
  selectedSite: GlobalSite | null;
  onSelectSite: (site: GlobalSite) => void;
}

// Safe WebGL Detection
const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

export const Globe3D: React.FC<Globe3DProps> = ({ selectedSite, onSelectSite }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const isAutoRotatingRef = useRef<boolean>(true);
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);
  const [hoveredSite, setHoveredSite] = useState<GlobalSite | null>(null);
  const [, setIsDragging] = useState<boolean>(false);

  // Target rotation for smooth transitions when clicking a site
  const targetRotationRef = useRef<{ x: number; y: number } | null>(null);

  // Lat/Lng to 3D Cartesian coordinates on sphere
  const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  // High-performance procedural world map texture generator (4096 x 2048).
  // 4096 wide gives ~0.088 deg per texel, which is what lets the 1:50m coastline
  // detail actually resolve instead of collapsing into the same blob.
  const createWorldTexture = (): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } => {
    const width = 4096;
    const height = 2048;

    // 1. Color Map Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 2. Bump / Relief Map Canvas
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext('2d');

    if (!ctx || !bumpCtx) {
      const fallback = new THREE.CanvasTexture(canvas);
      return { map: fallback, bump: fallback };
    }

    // --- Ocean Background ---
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#040714');
    oceanGrad.addColorStop(0.3, '#070d24');
    oceanGrad.addColorStop(0.5, '#0a1230');
    oceanGrad.addColorStop(0.7, '#070d24');
    oceanGrad.addColorStop(1, '#030612');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    bumpCtx.fillStyle = '#000000';
    bumpCtx.fillRect(0, 0, width, height);

    // Subtle Ocean Bathymetry Waves / Contour Lines
    // Spacings are in texels, so they scale with the texture to keep the
    // ocean backdrop at the same visual density as the coastlines sharpen.
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 80) {
        const offset = Math.sin((x / width) * Math.PI * 8 + y * 0.025) * 12;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Latitude Graticule Lines
    ctx.strokeStyle = 'rgba(79, 110, 247, 0.18)';
    ctx.lineWidth = 2;
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = ((90 - lat) / 180) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Longitude Graticule Lines
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Equator and Tropic Highlights
    const drawParallel = (lat: number, color: string, lineWidth = 2, dashed = false) => {
      const y = ((90 - lat) / 180) * height;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([16, 24]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.restore();
    };

    drawParallel(0, 'rgba(99, 102, 241, 0.45)', 5); // Equator
    drawParallel(23.5, 'rgba(56, 189, 248, 0.25)', 3, true); // Tropic of Cancer
    drawParallel(-23.5, 'rgba(56, 189, 248, 0.25)', 3, true); // Tropic of Capricorn

    // Trace a landmass ring exactly as surveyed. The coastline dataset is real
    // Natural Earth 1:50m geometry sampled well below one texel, so its vertices
    // are already the shoreline - curve-fitting between them would round off
    // headlands, fjords and river mouths and put the coast in the wrong place.
    const buildLandPath = (targetCtx: CanvasRenderingContext2D, points: [number, number][]) => {
      if (points.length < 3) return;

      const pxPoints: { x: number; y: number }[] = points.map(([lng, lat]) => ({
        x: ((lng + 180) / 360) * width,
        y: ((90 - lat) / 180) * height,
      }));

      targetCtx.beginPath();
      targetCtx.moveTo(pxPoints[0].x, pxPoints[0].y);
      for (let i = 1; i < pxPoints.length; i++) {
        targetCtx.lineTo(pxPoints[i].x, pxPoints[i].y);
      }
      targetCtx.closePath();
    };

    // Helper: Draw smooth polygon landmass with dual-layer shelf illumination
    const drawLandPolygon = (
      points: [number, number][],
      fillColor: string,
      strokeColor: string,
      glowColor: string
    ) => {
      if (points.length < 3) return;

      // 1. Continental Shelf Outer Soft Glow
      // Stroke and blur stay near their old texel values even though the texture
      // doubled, so the halo is relatively tighter and no longer swallows the
      // bays and headlands the 1:50m geometry now carries.
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 26;
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 4;
      buildLandPath(ctx, points);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 2. Crisp Inner Coastline Boundary
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      buildLandPath(ctx, points);
      ctx.stroke();
      ctx.restore();

      // 3. Draw on Bump Canvas (Elevation relief)
      bumpCtx.fillStyle = '#ffffff';
      buildLandPath(bumpCtx, points);
      bumpCtx.fill();
    };

    // Render All Geographically Detailed Landmass Polygons
    HIGH_RES_WORLD_POLYGONS.forEach((poly) => {
      drawLandPolygon(
        poly.points,
        'rgba(24, 34, 53, 0.96)',
        'rgba(99, 102, 241, 0.92)',
        'rgba(56, 189, 248, 0.6)'
      );
    });

    // High-Tech Semiconductor Matrix Micro-Dots on Land (Batched)
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    ctx.fillStyle = 'rgba(147, 197, 253, 0.65)';
    ctx.beginPath();
    const step = 16; // Crisp dot matrix resolution at 4096x2048
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // If pixel is land (dark slate-blue color)
        if (r > 15 && g > 25 && b > 40 && !(r < 12 && g < 18 && b < 45)) {
          ctx.rect(x - 1.5, y - 1.5, 3, 3);
        }
      }
    }
    ctx.fill();

    // Render Global Tech Hub Glowing Night Lights
    GLOBAL_TECH_LIGHTS.forEach((hub) => {
      const x = ((hub.lng + 180) / 360) * width;
      const y = ((90 - hub.lat) / 180) * height;

      // Radiant radial flare
      const rad = ctx.createRadialGradient(x, y, 2, x, y, 64 * hub.intensity);
      rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      rad.addColorStop(0.2, 'rgba(251, 191, 36, 0.85)'); // Amber / Gold semiconductor warmth
      rad.addColorStop(0.6, 'rgba(99, 102, 241, 0.4)');
      rad.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(x, y, 64 * hub.intensity, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Core Spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Singapore Megasite Highlight Ring on Texture
    const sgX = ((103.8198 + 180) / 360) * width;
    const sgY = ((90 - 1.3521) / 180) * height;

    const sgRad = ctx.createRadialGradient(sgX, sgY, 2, sgX, sgY, 48);
    sgRad.addColorStop(0, 'rgba(52, 211, 153, 1)');
    sgRad.addColorStop(0.3, 'rgba(16, 185, 129, 0.8)');
    sgRad.addColorStop(0.7, 'rgba(16, 185, 129, 0.2)');
    sgRad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = sgRad;
    ctx.beginPath();
    ctx.arc(sgX, sgY, 48, 0, Math.PI * 2);
    ctx.fill();

    const mapTexture = new THREE.CanvasTexture(canvas);
    mapTexture.wrapS = THREE.RepeatWrapping;
    mapTexture.wrapT = THREE.ClampToEdgeWrapping;

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

    return { map: mapTexture, bump: bumpTexture };
  };

  // Procedural volumetric cloud layer texture
  const createCloudsTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Procedural wispy cloud bands
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 90; i++) {
      const cx = Math.random() * canvas.width;
      const cy = 200 + Math.random() * (canvas.height - 400);
      const rx = 80 + Math.random() * 200;
      const ry = 25 + Math.random() * 60;

      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      grad.addColorStop(0.5, 'rgba(224, 231, 255, 0.1)');
      grad.addColorStop(1, 'rgba(224, 231, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, Math.random() * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  };

  // Helper to create 3D Bezier arc between Singapore and another site
  const createConnectionArc = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    globeRadius: number
  ): { line: THREE.Line; curve: THREE.QuadraticBezierCurve3 } => {
    const distance = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    // Lift midpoint outward based on distance for high arch
    const altitude = globeRadius + Math.min(distance * 0.38, 1.35);
    mid.normalize().multiplyScalar(altitude);

    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.65,
    });

    const line = new THREE.Line(geometry, material);
    return { line, curve };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!isWebGLAvailable()) {
      setWebGlAvailable(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 6.5);
    cameraRef.current = camera;

    // 2. Renderer Setup with Safe Context Creation
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (err) {
      console.warn('Three.js WebGL context creation failed; falling back to 2D topological display:', err);
      setWebGlAvailable(false);
      return;
    }

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xa5b4fc, 2.2);
    dirLight1.position.set(5, 4, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight2.position.set(-6, -3, -4);
    scene.add(dirLight2);

    // 4. Globe Objects Group
    const globeRadius = 2.2;
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // Primary Earth Sphere with Custom Textures
    const earthGeometry = new THREE.SphereGeometry(globeRadius, 96, 96);
    const { map: earthTexture, bump: bumpTexture } = createWorldTexture();
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.08,
      specular: new THREE.Color(0x38bdf8),
      shininess: 24,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

    // Volumetric Rotating Clouds Sphere
    const cloudsGeometry = new THREE.SphereGeometry(globeRadius * 1.015, 64, 64);
    const cloudsTexture = createCloudsTexture();
    const cloudsMaterial = new THREE.MeshBasicMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    cloudsMeshRef.current = cloudsMesh;
    globeGroup.add(cloudsMesh);

    // Atmosphere Glow Layer
    const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.04, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphereMesh);

    // Outer Tech Horizon Halo Ring
    const haloGeometry = new THREE.RingGeometry(globeRadius * 1.15, globeRadius * 1.18, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    haloMesh.rotation.x = Math.PI / 2;
    globeGroup.add(haloMesh);

    // 5. Markers & Connecting Arcs
    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    globeGroup.add(markersGroup);

    const arcsGroup = new THREE.Group();
    arcsGroupRef.current = arcsGroup;
    globeGroup.add(arcsGroup);

    const singaporeSite = GLOBAL_SITES.find((s) => s.id === 'singapore-fab1')!;
    const sgVector = latLngToVector3(singaporeSite.lat, singaporeSite.lng, globeRadius);

    const activePulseParticles: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; speed: number; progress: number }[] = [];

    // Add Markers & Curves for each Site
    GLOBAL_SITES.forEach((site) => {
      const pos = latLngToVector3(site.lat, site.lng, globeRadius);

      // Anchor group
      const markerObj = new THREE.Group();
      markerObj.position.copy(pos);
      markerObj.lookAt(new THREE.Vector3(0, 0, 0)); // align with normal
      markerObj.userData = { site };

      const isSg = site.id === 'singapore-fab1';

      // Core Pin
      const pinGeo = new THREE.SphereGeometry(isSg ? 0.08 : 0.055, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSg ? 0x10b981 : 0x6366f1,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      markerObj.add(pinMesh);

      // Pulsing Halo Ring
      const ringGeo = new THREE.RingGeometry(isSg ? 0.1 : 0.07, isSg ? 0.16 : 0.12, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSg ? 0x34d399 : 0x818cf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.userData = { isPulseRing: true, isSg };
      markerObj.add(ringMesh);

      // Vertical Stalk Light
      const stalkGeo = new THREE.CylinderGeometry(0.012, 0.012, isSg ? 0.32 : 0.2, 8);
      const stalkMat = new THREE.MeshBasicMaterial({
        color: isSg ? 0x10b981 : 0x818cf8,
        transparent: true,
        opacity: 0.9,
      });
      const stalkMesh = new THREE.Mesh(stalkGeo, stalkMat);
      stalkMesh.position.z = isSg ? 0.16 : 0.1;
      stalkMesh.rotation.x = Math.PI / 2;
      markerObj.add(stalkMesh);

      markersGroup.add(markerObj);

      // If not Singapore, draw connecting data arc & traveling particle packet
      if (!isSg) {
        const { line, curve } = createConnectionArc(sgVector, pos, globeRadius);
        arcsGroup.add(line);

        // Traveling Photon Packet Particle
        const photonGeo = new THREE.SphereGeometry(0.035, 12, 12);
        const photonMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.95,
        });
        const photonMesh = new THREE.Mesh(photonGeo, photonMat);
        globeGroup.add(photonMesh);

        activePulseParticles.push({
          mesh: photonMesh,
          curve,
          speed: 0.3 + Math.random() * 0.2,
          progress: Math.random(),
        });
      }
    });

    // Initial Globe Orientation: Focus Singapore / Asia Pacific
    globeGroup.rotation.y = -2.1;
    globeGroup.rotation.x = 0.25;

    // 6. Raycasting & Mouse Interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let mouseIsDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerDown = (e: MouseEvent) => {
      mouseIsDown = true;
      setIsDragging(true);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      targetRotationRef.current = null;
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (mouseIsDown && globeGroupRef.current) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;

        globeGroupRef.current.rotation.y += deltaX * 0.005;
        globeGroupRef.current.rotation.x += deltaY * 0.005;

        // Clamp x rotation
        globeGroupRef.current.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroupRef.current.rotation.x));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else if (isInside && cameraRef.current && markersGroupRef.current) {
        // Hover Raycast Detection only when inside container
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
        if (intersects.length > 0) {
          let topObj: THREE.Object3D | null = intersects[0].object;
          while (topObj && !topObj.userData.site && topObj.parent) {
            topObj = topObj.parent;
          }
          if (topObj && topObj.userData.site) {
            setHoveredSite(topObj.userData.site);
            container.style.cursor = 'pointer';
            return;
          }
        }
        setHoveredSite(null);
        container.style.cursor = mouseIsDown ? 'grabbing' : 'grab';
      }
    };

    const handlePointerUp = () => {
      mouseIsDown = false;
      setIsDragging(false);
      if (container) container.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      if (!container || !cameraRef.current || !markersGroupRef.current) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
      if (intersects.length > 0) {
        let topObj: THREE.Object3D | null = intersects[0].object;
        while (topObj && !topObj.userData.site && topObj.parent) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.userData.site) {
          onSelectSite(topObj.userData.site);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z += e.deltaY * 0.003;
      cameraRef.current.position.z = Math.max(3.8, Math.min(10.0, cameraRef.current.position.z));
    };

    // Touch support for mobile / tablets
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        mouseIsDown = true;
        setIsDragging(true);
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
        targetRotationRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (mouseIsDown && globeGroupRef.current && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;

        globeGroupRef.current.rotation.y += deltaX * 0.005;
        globeGroupRef.current.rotation.x += deltaY * 0.005;
        globeGroupRef.current.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroupRef.current.rotation.x));

        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      mouseIsDown = false;
      setIsDragging(false);
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('click', handleClick);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Handle Resize with Debouncing to prevent ResizeObserver loop limit errors
    let resizeFrameId: number | null = null;
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(handleResize);
    });
    resizeObserver.observe(container);

    // 7. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Clouds rotation offset
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0008;
      }

      // Animated traveling data photons along the arcs
      activePulseParticles.forEach((packet) => {
        packet.progress = (packet.progress + delta * packet.speed) % 1;
        const pt = packet.curve.getPoint(packet.progress);
        packet.mesh.position.copy(pt);
      });

      // Pulsing rings animation
      markersGroup.children.forEach((marker) => {
        marker.children.forEach((child) => {
          if (child.userData.isPulseRing) {
            const scale = 1 + Math.sin(elapsedTime * 3.5) * 0.35;
            child.scale.set(scale, scale, scale);
            const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.opacity = 0.5 + Math.sin(elapsedTime * 3.5) * 0.35;
            }
          }
        });
      });

      // Smooth target rotation transition (when site clicked)
      if (targetRotationRef.current && globeGroupRef.current) {
        globeGroupRef.current.rotation.y += (targetRotationRef.current.y - globeGroupRef.current.rotation.y) * 0.06;
        globeGroupRef.current.rotation.x += (targetRotationRef.current.x - globeGroupRef.current.rotation.x) * 0.06;
        if (
          Math.abs(targetRotationRef.current.y - globeGroupRef.current.rotation.y) < 0.001 &&
          Math.abs(targetRotationRef.current.x - globeGroupRef.current.rotation.x) < 0.001
        ) {
          targetRotationRef.current = null;
        }
      } else if (isAutoRotatingRef.current && !mouseIsDown && globeGroupRef.current) {
        // Continuous slow auto-rotation
        globeGroupRef.current.rotation.y += 0.0018;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      resizeObserver.disconnect();
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      try {
        renderer.dispose();
      } catch {
        // ignore disposal errors
      }
    };
  }, []);

  // When selectedSite changes, smoothly rotate globe to face it
  useEffect(() => {
    if (!selectedSite || !globeGroupRef.current) return;
    const targetY = -((selectedSite.lng + 180) * (Math.PI / 180)) + Math.PI / 2;
    const targetX = (selectedSite.lat * (Math.PI / 180)) * 0.4;
    targetRotationRef.current = { x: targetX, y: targetY };
  }, [selectedSite]);

  // Camera Zoom Control Buttons
  const handleZoomIn = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.max(3.8, cameraRef.current.position.z - 0.8);
  };

  const handleZoomOut = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.min(10.0, cameraRef.current.position.z + 0.8);
  };

  const handleResetOrientation = () => {
    const sgSite = GLOBAL_SITES.find((s) => s.id === 'singapore-fab1')!;
    onSelectSite(sgSite);
    if (cameraRef.current) cameraRef.current.position.set(0, 1.5, 6.5);
  };

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 shadow-2xl flex flex-col justify-between">
      {/* Top Overlay Badge & Stats */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white text-xs font-mono shadow-lg">
          <Globe className="w-4 h-4 text-indigo-400 animate-spin-slow" />
          <span className="font-bold tracking-wide">3D GLOBAL TOPOLOGY & SITES</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div className="text-[11px] text-slate-400 font-mono bg-slate-900/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800/80 w-fit">
          Rotate: Drag mouse | Zoom: Scroll wheel | Sites: 7 Global Nodes
        </div>
      </div>

      {/* Floating Hover Card */}
      {hoveredSite && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-xl p-3 shadow-xl max-w-xs animate-fade-in text-white font-sans">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700/60">
              {hoveredSite.code}
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                hoveredSite.isAccessible
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {hoveredSite.isAccessible ? '● ACCESSIBLE HUB' : '○ RESTRICTED'}
            </span>
          </div>
          <h4 className="font-bold text-xs mt-1.5 text-slate-100">{hoveredSite.name}</h4>
          <p className="text-[10px] text-slate-300 mt-0.5">{hoveredSite.city}, {hoveredSite.country}</p>
          <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div>
              <span className="text-slate-400 block text-[9px]">Wafer Capacity</span>
              <span className="text-indigo-200 font-semibold">{hoveredSite.waferCapacity}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">Avg cPk</span>
              <span className="text-emerald-300 font-bold">{hoveredSite.cPkAvg}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Click node to view full details</span>
          </div>
        </div>
      )}

      {/* Main 3D Canvas or 2D High-Tech Topological Map Fallback */}
      {webGlAvailable ? (
        <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />
      ) : (
        <div className="w-full h-full flex-1 relative flex items-center justify-center p-6 overflow-hidden">
          {/* High-Tech Grid Background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* SVG Multi-Site World Topology View */}
          <svg className="w-full h-full max-h-[440px] max-w-4xl" viewBox="0 0 1000 500">
            {/* World Grid Lines */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#312e81" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <line x1="500" y1="0" x2="500" y2="500" stroke="#312e81" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

            {/* Inter-facility Network Arcs from Singapore (approx 788, 246) */}
            {GLOBAL_SITES.filter(s => s.id !== 'singapore-fab1').map((site) => {
              const sgX = ((103.8198 + 180) / 360) * 1000;
              const sgY = ((90 - 1.3521) / 180) * 500;
              const x = ((site.lng + 180) / 360) * 1000;
              const y = ((90 - site.lat) / 180) * 500;
              const midX = (sgX + x) / 2;
              const midY = Math.min(sgY, y) - 60;
              const isSelected = selectedSite?.id === site.id;

              return (
                <g key={`arc-${site.id}`}>
                  <path
                    d={`M ${sgX} ${sgY} Q ${midX} ${midY} ${x} ${y}`}
                    fill="none"
                    stroke={isSelected ? '#38bdf8' : '#4f46e5'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    strokeDasharray={isSelected ? 'none' : '4 4'}
                    opacity={isSelected ? 0.9 : 0.45}
                  />
                </g>
              );
            })}

            {/* Global Site Nodes */}
            {GLOBAL_SITES.map((site) => {
              const x = ((site.lng + 180) / 360) * 1000;
              const y = ((90 - site.lat) / 180) * 500;
              const isSelected = selectedSite?.id === site.id;
              const isHovered = hoveredSite?.id === site.id;
              const isSg = site.id === 'singapore-fab1';

              return (
                <g
                  key={site.id}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => onSelectSite(site)}
                  onMouseEnter={() => setHoveredSite(site)}
                  onMouseLeave={() => setHoveredSite(null)}
                >
                  {/* Outer Pulsing Glow */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected || isSg ? 16 : 10}
                    fill={isSg ? 'rgba(16, 185, 129, 0.25)' : isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(99, 102, 241, 0.15)'}
                    className="animate-ping"
                  />
                  {/* Node Outer Ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected || isSg ? 10 : 7}
                    fill="#0f172a"
                    stroke={isSg ? '#34d399' : isSelected ? '#38bdf8' : isHovered ? '#a5b4fc' : '#6366f1'}
                    strokeWidth={isSelected || isSg ? 3 : 2}
                  />
                  {/* Node Inner Core */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected || isSg ? 4 : 2.5}
                    fill={isSg ? '#34d399' : isSelected ? '#38bdf8' : '#ffffff'}
                  />
                  {/* Site City Label */}
                  <text
                    x={x}
                    y={y + 20}
                    textAnchor="middle"
                    fill={isSelected || isSg ? '#e2e8f0' : '#94a3b8'}
                    fontSize={isSelected || isSg ? 11 : 9}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {site.city.split(',')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Floating Control Toolbar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Quick Site Focus Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
          {GLOBAL_SITES.map((site) => {
            const isSelected = selectedSite?.id === site.id;
            return (
              <button
                key={site.id}
                onClick={() => onSelectSite(site)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 shrink-0 backdrop-blur-md border ${
                  isSelected
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-950/80 ring-1 ring-emerald-400/50'
                    : site.isAccessible
                    ? 'bg-emerald-950/50 text-emerald-300/90 border-emerald-600/50 hover:bg-emerald-900/70'
                    : 'bg-slate-900/70 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-emerald-300 animate-pulse shadow-xs shadow-emerald-300' : site.isAccessible ? 'bg-emerald-400' : 'bg-slate-400'
                  }`}
                />
                <span>{site.city.split(',')[0]}</span>
                {site.isAccessible && (
                  <span className={`text-[9px] px-1 rounded font-bold ${
                    isSelected 
                      ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-400/50' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3D View Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1.5 rounded-lg text-xs border transition ${
              isAutoRotating ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-950/50' : 'border-transparent text-slate-400 hover:text-white'
            }`}
            title={isAutoRotating ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
          >
            <RotateCw className={`w-4 h-4 ${isAutoRotating ? 'animate-spin-slow' : ''}`} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetOrientation}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition flex items-center gap-1 text-xs font-mono font-bold px-2"
            title="Focus Singapore Hub"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Focus SGP</span>
          </button>
        </div>
      </div>
    </div>
  );
};

