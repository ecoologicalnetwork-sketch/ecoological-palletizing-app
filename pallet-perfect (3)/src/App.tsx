/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PackingDashboard } from './components/PackingDashboard';
import { AdminPanel } from './components/AdminPanel';
import { 
  auth, 
  signIn, 
  fetchBoxLibrary, 
  fetchPalletLibrary, 
  fetchSOSConfig,
  fetchStandardBoxLibrary,
  saveBoxLibrary,
  savePalletLibrary,
  saveSOSConfig,
  saveStandardBoxLibrary
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Box, PalletBase, SOSConfig, StandardBox } from './types';
import { Settings, LogIn, Lock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [boxLibrary, setBoxLibrary] = useState<Box[]>([]);
  const [palletLibrary, setPalletLibrary] = useState<PalletBase[]>([]);
  const [standardBoxLibrary, setStandardBoxLibrary] = useState<StandardBox[]>([]);
  const [sosConfig, setSosConfig] = useState<SOSConfig>({
    apiKey: '',
    userId: '',
    accountId: '',
    environment: 'sandbox',
    maxPalletHeight: 92,
    minSupportOverlap: 55
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadPersistentData();
    }
  }, [user]);

  const loadPersistentData = async () => {
    setDataLoading(true);
    try {
      const [boxes, pallets, config, stdBoxes] = await Promise.all([
        fetchBoxLibrary(),
        fetchPalletLibrary(),
        fetchSOSConfig(),
        fetchStandardBoxLibrary()
      ]);

      if (boxes.length > 0) setBoxLibrary(boxes);
      if (pallets.length > 0) setPalletLibrary(pallets);
      if (stdBoxes.length > 0) setStandardBoxLibrary(stdBoxes);
      if (config) setSosConfig(config);
    } catch (error) {
      console.error("Failed to load persistent data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleUpdateBoxes = (boxes: Box[]) => {
    setBoxLibrary(boxes);
    saveBoxLibrary(boxes);
  };

  const handleUpdatePallets = (pallets: PalletBase[]) => {
    setPalletLibrary(pallets);
    savePalletLibrary(pallets);
  };

  const handleUpdateStandardBoxes = (boxes: StandardBox[]) => {
    setStandardBoxLibrary(boxes);
    saveStandardBoxLibrary(boxes);
  };

  const handleUpdateSosConfig = (config: SOSConfig) => {
    setSosConfig(config);
    saveSOSConfig(config);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-12 rounded-sm shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-indigo-600/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(79,70,229,0.2)]">
            <Lock size={40} />
          </div>
          <div>
            <h1 className="text-white font-black text-3xl uppercase tracking-tighter italic mb-2">Pallet Perfect</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Enterprise Warehouse Engine</p>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Please authenticate with your company Google account to access the persistent warehouse libraries and optimization tools.
          </p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-indigo-600 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-sm transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <LogIn size={20} /> Authorize with Google
          </button>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            Identity Verified • SSL ENCRYPTED • SOC-2 COMPLIANT
          </p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Synchronizing Libraries...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden selection:bg-amber-500 selection:text-black relative">
      {isAdminOpen ? (
        <AdminPanel 
          boxLibrary={boxLibrary}
          palletLibrary={palletLibrary}
          standardBoxLibrary={standardBoxLibrary}
          sosConfig={sosConfig}
          onUpdateBoxes={handleUpdateBoxes}
          onUpdatePallets={handleUpdatePallets}
          onUpdateStandardBoxes={handleUpdateStandardBoxes}
          onUpdateSOSConfig={handleUpdateSosConfig}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : (
        <PackingDashboard 
          boxLibrary={boxLibrary}
          palletLibrary={palletLibrary}
          standardBoxLibrary={standardBoxLibrary}
          sosConfig={sosConfig}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      )}
    </div>
  );
}
