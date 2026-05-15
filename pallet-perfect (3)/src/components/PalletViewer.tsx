import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Pallet, PackedItem } from '../types';
import { cn } from '../lib/utils';
import { RotateCw, Move, Trash2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useRef } from 'react';

interface BoxProps {
  item: PackedItem;
}

const Box3D = ({ item }: BoxProps) => {
  const { position, dimensions, box, isScanned } = item;
  
  // Center is position + half-dimensions
  const meshPosition: [number, number, number] = [
    position.x + dimensions.length / 2,
    position.z + dimensions.height / 2,
    -(position.y + dimensions.width / 2)
  ];

  const baseColor = box.color || '#3b82f6';
  const opacity = isScanned ? 1 : 0.25;

  return (
    <mesh position={meshPosition}>
      <boxGeometry args={[dimensions.length, dimensions.height, dimensions.width]} />
      <meshStandardMaterial 
        color={baseColor} 
        transparent={!isScanned}
        opacity={opacity}
        metalness={0.1}
        roughness={0.8}
        emissive={isScanned ? '#000' : baseColor}
        emissiveIntensity={isScanned ? 0 : 0.2}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(dimensions.length, dimensions.height, dimensions.width)]} />
        <lineBasicMaterial color={isScanned ? "#000" : baseColor} transparent opacity={isScanned ? 0.3 : 0.6} />
      </lineSegments>
    </mesh>
  );
};

interface Pallet3DProps {
  pallets: Pallet[];
  activePalletIdx: number;
  landmarksVisible?: boolean;
}

const LANDMARKS = [
  { name: 'Door to Finishing Room', pos: [150, 0, 0] as [number, number, number] },
  { name: 'Panel Saw', pos: [0, 0, 150] as [number, number, number] },
  { name: 'Bay Door', pos: [-150, 0, 0] as [number, number, number] },
  { name: 'Pallet Rack', pos: [0, 0, -150] as [number, number, number] },
];

const WarehouseEnvironment = () => {
  return (
    <group>
      {/* Finishing Room Wall (X+) */}
      <group position={[500, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 60, 0]}>
          <boxGeometry args={[1000, 120, 2]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* Finishing Doors */}
        <group position={[0, 45, 1.1]}>
          <mesh position={[-24.5, 0, 0]} castShadow>
            <boxGeometry args={[48, 90, 2]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[24.5, 0, 0]} castShadow>
            <boxGeometry args={[48, 90, 2]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          <mesh position={[0, 0, -0.5]}>
            <boxGeometry args={[100, 94, 1]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>

      {/* Panel Saw Wall (Z+) - SWAPPED */}
      <group position={[0, 0, 500]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 60, 0]}>
          <boxGeometry args={[1000, 120, 2]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        {/* Panel Saw Representation */}
        <group position={[0, 30, 2]}>
          <mesh castShadow>
            <boxGeometry args={[120, 60, 4]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <mesh position={[0, -10, 3]}>
            <boxGeometry args={[140, 5, 10]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      </group>

      {/* Bay Door Wall (X-) */}
      <group position={[-500, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 60, 0]}>
          <boxGeometry args={[1000, 120, 2]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* Large Roll-up Bay Door */}
        <mesh position={[0, 60, 1.1]}>
          <boxGeometry args={[144, 120, 2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Pallet Rack Wall (Z-) - SWAPPED */}
      <group position={[0, 0, -500]}>
        <mesh position={[0, 60, 0]}>
          <boxGeometry args={[1000, 120, 2]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        {/* Pallet Racking Representation */}
        <group position={[0, 0, -10]} rotation={[0, Math.PI, 0]}>
          {[ -200, -100, 0, 100, 200 ].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, 60, 0]}>
                <boxGeometry args={[4, 120, 40]} />
                <meshStandardMaterial color="#1e40af" />
              </mesh>
              <mesh position={[0, 40, 0]}>
                <boxGeometry args={[100, 4, 40]} />
                <meshStandardMaterial color="#ea580c" />
              </mesh>
              <mesh position={[0, 80, 0]}>
                <boxGeometry args={[100, 4, 40]} />
                <meshStandardMaterial color="#ea580c" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

export const PalletViewer = ({ pallets, activePalletIdx, landmarksVisible = true }: Pallet3DProps) => {
  const controlsRef = useRef<any>(null);
  
  // Calculate spacing and positions
  const palletLayouts = useMemo(() => {
    let currentX = 0;
    return pallets.map((p) => {
      const footprint = p.dimensions.length;
      const xPos = currentX;
      currentX += footprint * 2.5; // Two footprints apart + some margin
      return { xPos, pallet: p };
    });
  }, [pallets]);

  // Center the view on the active pallet
  useEffect(() => {
    if (controlsRef.current && palletLayouts[activePalletIdx]) {
      const { xPos } = palletLayouts[activePalletIdx];
      controlsRef.current.target.set(xPos, 20, 0);
      controlsRef.current.update();
    }
  }, [activePalletIdx, palletLayouts]);

  const handleZoom = (delta: number) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;
    const target = controls.target;
    const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
    const distance = camera.position.distanceTo(target);
    const newDistance = Math.max(50, Math.min(1000, distance + delta));
    
    camera.position.copy(target).add(direction.multiplyScalar(newDistance));
    controls.update();
  };

  const resetCamera = () => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;
    const activeLayout = palletLayouts[activePalletIdx];
    camera.position.set(activeLayout.xPos + 180, 120, 180);
    controls.target.set(activeLayout.xPos, 20, 0);
    controls.update();
  };

  const activePallet = pallets[activePalletIdx];

  return (
    <div className="w-full h-full bg-slate-100 rounded-sm overflow-hidden relative border border-slate-200">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[180, 120, 180]} fov={40} />
        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          enableZoom={true} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1}
          maxDistance={1000}
          minDistance={40}
        />
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 300, 0]} intensity={1.5} castShadow />
        <directionalLight position={[200, 200, 200]} intensity={0.5} />
        
        <Suspense fallback={null}>
          {palletLayouts.map((layout, idx) => {
            const p = layout.pallet;
            const isCurrent = idx === activePalletIdx;
            
            const currentItem = isCurrent ? p.items.find(i => !i.isScanned) : null;
            const activeZLayer = currentItem ? Math.floor(currentItem.position.z) : Infinity;
            
            const visibleItems = p.items.filter(item => {
              if (!isCurrent) return true; // Show all for non-active
              if (item.isScanned) return true;
              const itemLayerZ = Math.floor(item.position.z);
              if (itemLayerZ <= activeZLayer) return true;
              return false;
            });

            return (
              <group key={idx} position={[layout.xPos - (p.dimensions.length / 2), 0, p.dimensions.width / 2]}>
                {/* Identification Tag */}
                <Html position={[p.dimensions.length / 2, 0, p.dimensions.width / 2 + 10]} center>
                  <div className={cn(
                    "px-3 py-1.5 rounded-sm border shadow-xl flex flex-col items-center gap-1 transition-all",
                    isCurrent ? "bg-indigo-600 border-indigo-500 scale-110" : "bg-white border-slate-200 opacity-60"
                  )}>
                    <span className={cn("text-[8px] font-black uppercase tracking-tighter", isCurrent ? "text-indigo-100" : "text-slate-400")}>Target Deck</span>
                    <span className={cn("text-xs font-mono font-black", isCurrent ? "text-white" : "text-slate-800")}>
                      {p.dimensions.length}" x {p.dimensions.width}"
                    </span>
                    {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mt-1" />}
                  </div>
                </Html>

                {/* Pallet Base */}
                <mesh position={[p.dimensions.length / 2, 2.75, -p.dimensions.width / 2]} receiveShadow>
                  <boxGeometry args={[p.dimensions.length, 5.5, p.dimensions.width]} />
                  <meshStandardMaterial color={isCurrent ? "#94a3b8" : "#cbd5e1"} />
                </mesh>

                {/* Packed Items */}
                {visibleItems.map((item) => (
                  <Box3D 
                    key={item.id} 
                    item={item} 
                  />
                ))}
              </group>
            );
          })}

          {/* Landmarks - relative to active pallet */}
          {landmarksVisible && palletLayouts[activePalletIdx] && LANDMARKS.map((lm, i) => (
            <Html key={i} position={[palletLayouts[activePalletIdx].xPos + lm.pos[0], lm.pos[1], lm.pos[2]]} center>
              <div className="px-2 py-1 bg-slate-900 text-white text-[8px] font-black rounded-sm whitespace-nowrap opacity-60 uppercase tracking-widest border border-slate-700 pointer-events-none">
                {lm.name}
              </div>
            </Html>
          ))}

          <WarehouseEnvironment />
          
          <Grid
            infiniteGrid
            fadeDistance={1500}
            sectionSize={48}
            cellSize={12}
            sectionThickness={1}
            sectionColor="#94a3b8"
            cellColor="#cbd5e1"
          />
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        <button 
          onClick={() => handleZoom(-100)}
          className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-sm shadow-lg transition-all"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          onClick={() => handleZoom(100)}
          className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-sm shadow-lg transition-all"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          onClick={resetCamera}
          className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-sm shadow-lg transition-all mt-2"
          title="Reset View"
        >
          <Maximize size={18} />
        </button>
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-0.5 pointer-events-none select-none">
        <h3 className="text-slate-900 font-black text-xl uppercase tracking-tighter italic">{activePallet.name}</h3>
        <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">{activePallet.items.length} units queued • Pallet {activePalletIdx + 1} of {pallets.length}</p>
      </div>

      <div className="absolute bottom-6 right-6 bg-white shadow-xl border border-slate-200 p-4 rounded-sm text-[10px] uppercase font-mono text-slate-500 w-48 pointer-events-none select-none">
        <div className="flex justify-between gap-4 mb-2">
          <span className="font-bold">Build Height</span>
          <span className={cn(
            "font-black",
            activePallet.items.reduce((max, item) => Math.max(max, item.position.z + item.dimensions.height), 0) > 90 ? "text-red-500" : "text-indigo-600"
          )}>92" LIMIT</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
           <div 
             className="h-full bg-indigo-600 transition-all duration-1000" 
             style={{ width: `${Math.min(100, (activePallet.items.reduce((max, item) => Math.max(max, item.position.z + item.dimensions.height), 0) / 92) * 100)}%` }}
           />
        </div>
      </div>
    </div>
  );
};
