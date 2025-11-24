
import React, { useEffect, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  GridHelper
} from 'three';
import { RaceState, CommandType } from '../types';

interface TrackMapProps {
  state: RaceState;
  praScore: number | undefined;
  command: CommandType | null;
}

const TrackMap: React.FC<TrackMapProps> = ({ state, praScore, command }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Animation State for Hero Car (Synced to Data)
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);

  // Independent Animation State for AI Cars
  const rivalProgressRef = useRef(0.05);  // Pink
  const traffic1ProgressRef = useRef(0.3); // Violet
  const traffic2ProgressRef = useRef(0.7); // Purple

  // Sync state for Hero Car
  useEffect(() => {
    targetProgressRef.current = state.lapProgress / 100;
    // Handle lap wrap-around
    if (Math.abs(targetProgressRef.current - progressRef.current) > 0.5) {
       progressRef.current = targetProgressRef.current;
    }
  }, [state.lapProgress]);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- SETUP ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new Scene();
    scene.background = new Color(0x0055aa); // Classic Blueprint Blue

    // ORTHOGRAPHIC CAMERA (For true 2D Blueprint look)
    const frustumSize = 320;
    const aspect = width / height;
    const camera = new OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );
    camera.position.set(0, 100, 0); // Looking down
    camera.lookAt(0, 0, 0);
    // Orient so T1 is Top Left-ish
    camera.rotation.z = Math.PI; 

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // --- BLUEPRINT GRID ---
    const gridHelper = new GridHelper(600, 60, 0x4488ff, 0x4488ff);
    gridHelper.position.y = -1;
    (gridHelper.material as LineBasicMaterial).opacity = 0.3;
    (gridHelper.material as LineBasicMaterial).transparent = true;
    scene.add(gridHelper);

    const gridMajor = new GridHelper(600, 10, 0x88ccff, 0x000000);
    gridMajor.position.y = -0.5;
    (gridMajor.material as LineBasicMaterial).opacity = 0.1;
    (gridMajor.material as LineBasicMaterial).transparent = true;
    scene.add(gridMajor);

    // --- COTA GEOMETRY (Blueprint Shape) ---
    const points = [
        new Vector3(20, 0, 150),   // Start/Finish (Bottom)
        new Vector3(-60, 0, 150),  // Up hill to T1 (Top Left in this rotation)
        new Vector3(-80, 0, 120),  // T1 Hairpin
        new Vector3(-60, 0, 100),  // T2
        new Vector3(-40, 0, 110),  // T3 (Esses Start)
        new Vector3(-20, 0, 90),   // T4
        new Vector3(0, 0, 100),    // T5
        new Vector3(20, 0, 80),    // T6
        new Vector3(40, 0, 90),    // T7
        new Vector3(60, 0, 70),    // T8
        new Vector3(80, 0, 50),    // T9
        new Vector3(100, 0, 30),   // T10
        new Vector3(140, 0, -60),  // T11 (Far Hairpin)
        new Vector3(-50, 0, -40),  // Back Straight End (T12)
        new Vector3(-80, 0, -20),  // T13
        new Vector3(-60, 0, 0),    // T14
        new Vector3(-80, 0, 20),   // T15
        new Vector3(-20, 0, 40),   // T16 (Stadium)
        new Vector3(10, 0, 60),    // T17
        new Vector3(30, 0, 100),   // T18
        new Vector3(0, 0, 120),    // T19
        new Vector3(20, 0, 140),   // T20
        new Vector3(20, 0, 150)    // Close Loop
    ];

    const curve = new CatmullRomCurve3(points);
    curve.closed = true;
    curve.tension = 0.4;

    // Track Line
    const tubeGeo = new TubeGeometry(curve, 300, 6, 8, true);
    const tubeMat = new MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.8, 
        wireframe: false
    });
    const trackMesh = new Mesh(tubeGeo, tubeMat);
    scene.add(trackMesh);

    const edgesGeo = new BufferGeometry().setFromPoints(curve.getPoints(400));
    const edgesMat = new LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const trackLine = new Line(edgesGeo, edgesMat);
    scene.add(trackLine);

    // --- CARS (Bright Neon Rectangles) ---
    const createMarker = (color: number, scale: number) => {
        const geo = new BoxGeometry(scale, 2, scale * 1.5);
        const mat = new MeshBasicMaterial({ color: color });
        const mesh = new Mesh(geo, mat);
        scene.add(mesh);
        return mesh;
    };

    // 1. HERO (ORANGE) - User
    const carHero = createMarker(0xff6600, 12); 

    // 2. RIVAL (PINK) - Aggressive
    const carRival = createMarker(0xff00ff, 12);

    // 3. TRAFFIC A (VIOLET) - Slower
    const carTrafficA = createMarker(0x8a2be2, 10);

    // 4. TRAFFIC B (PURPLE) - Variable
    const carTrafficB = createMarker(0x5500aa, 10);

    // Ghost Line
    const ghostPoints = curve.getPoints(100).map(p => p.clone().add(new Vector3(0, 2, 0)));
    const ghostGeo = new BufferGeometry().setFromPoints(ghostPoints);
    const ghostMat = new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
    const ghostLine = new Line(ghostGeo, ghostMat);
    scene.add(ghostLine);

    // --- ANIMATION LOOP ---
    let animationId: number;
    const animate = () => {
        animationId = requestAnimationFrame(animate);

        // --- 1. HERO CAR PHYSICS (Synced to State) ---
        // Base simulation speed derived from telemetry speed (km/h)
        // 250kph -> approx 0.001 progress per frame
        const currentSpeedFactor = Math.max(0.0005, stateRef.current.telemetry.speed / 250000);
        
        const diff = progressRef.current - targetProgressRef.current;
        if (Math.abs(diff) > 0.5) {
             progressRef.current = targetProgressRef.current;
        } else {
             progressRef.current += (targetProgressRef.current - progressRef.current) * 0.1;
        }
        // Manual increment if data is stale
        progressRef.current = (progressRef.current + currentSpeedFactor) % 1;

        // --- 2. AI CAR PHYSICS (Independent Speeds) ---
        
        // Pink (Rival): slightly faster (+2%)
        rivalProgressRef.current = (rivalProgressRef.current + currentSpeedFactor * 1.02) % 1;
        
        // Violet (Traffic A): slower (-15%)
        traffic1ProgressRef.current = (traffic1ProgressRef.current + currentSpeedFactor * 0.85) % 1;

        // Purple (Traffic B): slower (-10%)
        traffic2ProgressRef.current = (traffic2ProgressRef.current + currentSpeedFactor * 0.90) % 1;

        // --- UPDATE POSITIONS ---
        const carHeight = 8; // Lift above track

        const updateCarPos = (mesh: Mesh, progress: number) => {
            const pt = curve.getPointAt(progress);
            const tan = curve.getTangentAt(progress);
            mesh.position.copy(pt).add(new Vector3(0, carHeight, 0));
            mesh.lookAt(pt.clone().add(tan).add(new Vector3(0, carHeight, 0)));
        };

        updateCarPos(carHero, progressRef.current);
        updateCarPos(carRival, rivalProgressRef.current);
        updateCarPos(carTrafficA, traffic1ProgressRef.current);
        updateCarPos(carTrafficB, traffic2ProgressRef.current);

        // Strategy Visuals
        const isAction = command === CommandType.BOX_NOW || command === CommandType.MANDATORY_PIT;
        ghostLine.material.opacity = isAction ? 0.6 : 0;
        
        renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        const aspect = w / h;
        
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
        
        renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    return () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animationId);
        if (mountRef.current) mountRef.current.innerHTML = '';
        renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full flex-1 bg-[#0055aa] rounded-3xl border-4 border-[#004488] overflow-hidden shadow-2xl min-h-[400px]">
        {/* The 3D Canvas */}
        <div ref={mountRef} className="w-full h-full" />
        
        {/* BLUEPRINT OVERLAY TEXT */}
        <div className="absolute bottom-6 right-8 text-right pointer-events-none opacity-80 select-none">
            <h1 className="text-5xl lg:text-7xl font-black font-mono-race text-white/20 tracking-tighter leading-none">
                CIRCUIT OF
            </h1>
            <h1 className="text-5xl lg:text-7xl font-black font-mono-race text-white tracking-tighter leading-none">
                THE AMERICAS
            </h1>
            <div className="mt-2 flex justify-end gap-6 text-xs font-mono text-white/60">
                <span>SECTOR MAP 2025</span>
                <span>DOC NO. 6</span>
                <span>SCALE: 1:2000</span>
            </div>
        </div>

        {/* Status Label */}
        <div className="absolute top-6 left-6 pointer-events-none">
             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                 <span className="text-xl font-mono-race text-white">LIVE TELEMETRY</span>
             </div>
        </div>
    </div>
  );
};

export default TrackMap;
