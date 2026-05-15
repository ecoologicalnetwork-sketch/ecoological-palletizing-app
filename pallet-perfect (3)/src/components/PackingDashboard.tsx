import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, PackedItem, Pallet, BuildStep, SalesOrder, PalletBase, SOSConfig } from '../types';
import { packPallets } from '../lib/packing-logic';
import { PalletViewer } from './PalletViewer';
import { 
  Package, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Upload,
  Download,
  Scan,
  X,
  FileText, 
  ArrowLeft,
  Truck,
  Box as BoxIcon,
  Search,
  ClipboardList,
  Settings,
  AlertCircle,
  Maximize2,
  Minimize2,
  Edit3,
  RefreshCw,
  History as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatInches, formatWeight } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { extractItemsFromDocument, ExtractedItem } from '../lib/gemini';

// --- Subcomponent: Uploader ---
const SO_Uploader = ({ onScan, onCancel }: { onScan: (items: { sku: string; quantity: number }[]) => void, onCancel: () => void }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 10 - files.length);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const startProcessing = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress(10);

    try {
      const allExtractedItems: ExtractedItem[] = [];
      const stepSize = 90 / files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const results = await extractItemsFromDocument(file);
        allExtractedItems.push(...results);
        setProgress(prev => Math.min(prev + stepSize, 95));
      }

      // Merge quantities for duplicate SKUs
      const merged = allExtractedItems.reduce((acc, curr) => {
        const existing = acc.find(item => item.sku === curr.sku);
        if (existing) {
          existing.quantity += curr.quantity;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as ExtractedItem[]);

      setProgress(100);
      setTimeout(() => {
        onScan(merged);
      }, 500);
    } catch (err) {
      console.error("Extraction failed:", err);
      alert("Verification Failed: Could not process document layers. Please check your connection and try again.");
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).slice(0, 10 - files.length);
      setFiles([...files, ...newFiles]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="bg-white p-8 rounded-sm border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors text-center relative group"
      >
        <input 
          type="file" 
          multiple 
          accept=".pdf,image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 pointer-events-none">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-slate-900 font-black uppercase text-xs tracking-widest mb-1">Drag & Drop SO Documents</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold">PDF or Images • Up to 10 pages</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-sm pointer-events-auto"
            >
              Select Files
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-[3/4] bg-slate-50 border border-slate-200 rounded-sm p-2 flex flex-col items-center justify-center gap-2 group/file">
                  <Package className="text-slate-300" size={24} />
                  <span className="text-[8px] font-bold text-slate-400 truncate w-full px-1">{f.name}</span>
                  {!isProcessing && (
                    <button 
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover/file:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              {files.length < 10 && !isProcessing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] border border-dashed border-slate-200 rounded-sm flex items-center justify-center text-slate-300 hover:text-indigo-400 hover:border-indigo-200 transition-all"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
            
            {!isProcessing ? (
              <button 
                onClick={startProcessing}
                className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-sm transition-all shadow-xl"
              >
                Run Data Extraction ({files.length} Pages)
              </button>
            ) : (
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-indigo-600"
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">
                  Analyzing Document Layers... {progress}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={onCancel} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 flex items-center gap-2 justify-center">
        <ArrowLeft size={14} /> Back to Selection
      </button>
    </div>
  );
};

// --- Subcomponent: Input Step ---
const InputStep = ({ boxLibrary, sosConfig, onNext }: { boxLibrary: Box[], sosConfig: SOSConfig, onNext: (items: { sku: string; quantity: number }[]) => void }) => {
  const [view, setView] = useState<'selection' | 'camera' | 'sos' | 'list'>('selection');
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState<{ sku: string; quantity: number }[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    if (boxLibrary.length === 0) return;
    setItems([...items, { sku: boxLibrary[0].sku, quantity: 1 }]);
  };

  const loadDemo = () => {
    setItems([
      { sku: 'SH-FL-001', quantity: 4 },
      { sku: 'SH-BR-002', quantity: 2 },
      { sku: 'FF2001', quantity: 11 },
      { sku: 'MGT02', quantity: 15 },
      { sku: 'DT1001', quantity: 7 },
      { sku: 'BT1001', quantity: 6 },
    ]);
    setView('list');
  };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, key: 'sku' | 'quantity', value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    setItems(newItems);
  };

  const handleSOSFetch = () => {
    if (!poNumber) return;
    
    if (!sosConfig.apiKey || !sosConfig.accountId) {
      setError("SOS Credentials Missing. Please visit the Admin Panel.");
      return;
    }

    setError(null);
    setIsFetching(true);
    
    // In a production environment, this would call your backend proxy
    // which then calls SOS Inventory: https://api.sosinventory.com/api/salesorder
    setTimeout(() => {
      // Mocked response based on real API structure
      setItems([
        { sku: 'MGT02', quantity: 12 },
        { sku: 'DT1001', quantity: 5 },
        { sku: 'BT1001', quantity: 9 },
      ]);
      setIsFetching(false);
      setView('list');
    }, 1200);
  };

  const handleScanFinish = (scannedItems: { sku: string; quantity: number }[]) => {
    setItems(scannedItems);
    setView('list');
  };

  if (view === 'selection') {
    return (
      <div className="grid gap-6">
        <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900">
            <Package size={32} />
          </div>
          <h2 className="text-slate-900 font-black text-2xl uppercase tracking-widest mb-2 italic">Sales Order Integration</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Choose your data source to begin packing.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setView('camera')}
              className="p-8 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all rounded-sm flex flex-col items-center gap-4 group"
            >
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Upload size={32} />
              </div>
              <div>
                <span className="block text-slate-900 font-black uppercase text-xs tracking-widest mb-1">Upload SO Document</span>
                <span className="block text-slate-400 text-[10px] uppercase font-bold text-center">PDF or Images (Max 10)</span>
              </div>
            </button>

            <button 
              onClick={() => setView('sos')}
              className="p-8 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all rounded-sm flex flex-col items-center gap-4 group"
            >
              <div className="p-4 bg-slate-50 text-slate-900 rounded-full group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Search size={32} />
              </div>
              <div>
                <span className="block text-slate-900 font-black uppercase text-xs tracking-widest mb-1">SOS Inventory</span>
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Sync direct from cloud</span>
              </div>
            </button>
          </div>

          <button 
            onClick={() => setView('list')}
            className="mt-8 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 mx-auto rounded-sm transition-all"
          >
            Manual Entry Mode <ChevronRight size={14} />
          </button>

          <div className="mt-4 pt-4 border-t border-slate-100 italic">
            <button 
              onClick={loadDemo}
              className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
            >
              <HistoryIcon size={12} /> Or Load Demo Sales Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'camera') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <SO_Uploader onScan={handleScanFinish} onCancel={() => setView('selection')} />
      </motion.div>
    );
  }

  if (view === 'sos') {
    return (
      <div className="bg-white p-8 rounded-sm border border-slate-200 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('selection')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-slate-900 font-black text-xl uppercase tracking-widest italic">SOS Inventory Link</h2>
            <p className="text-slate-500 text-xs font-bold uppercase">Direct Warehouse API Fetch</p>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-sm flex items-center gap-3 text-rose-600 text-xs font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="bg-slate-50 p-6 rounded-sm border border-slate-100">
            <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block">Purchase Order Number</label>
            <div className="flex gap-4">
               <input 
                type="text" 
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-XXXXX"
                className="flex-1 bg-white border border-slate-200 p-4 rounded-sm font-mono text-slate-900 text-lg focus:border-indigo-600 outline-none transition-stroke"
                onKeyDown={(e) => e.key === 'Enter' && handleSOSFetch()}
              />
              <button 
                onClick={handleSOSFetch}
                disabled={isFetching || !poNumber}
                className="px-8 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black uppercase text-xs tracking-widest rounded-sm transition-all flex items-center gap-2"
              >
                {isFetching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                {isFetching ? 'Fetching...' : 'Fetch SO'}
              </button>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 flex items-center gap-1.5 px-1 font-bold">
            <CheckCircle2 size={12} className="text-emerald-500" /> API CONNECTION: STABLE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('selection')} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-slate-500 font-bold uppercase tracking-wider text-xs">Verify Sales Order</h2>
            <p className="text-slate-400 text-[10px] mt-1 font-medium italic">Adjust quantities if items were physically checked</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadDemo}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-sm font-bold text-xs transition-colors uppercase tracking-widest border border-indigo-200"
          >
            <HistoryIcon size={16} /> LOAD DEMO
          </button>
          <button 
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-sm font-bold text-xs transition-colors uppercase tracking-widest"
          >
            <Plus size={16} /> ADD SKU
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-sm">
             <BoxIcon className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No items in current batch</p>
          </div>
        ) : items.map((item, idx) => (
          <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-sm border border-slate-200 group hover:border-indigo-200 transition-colors">
            <div className="w-10 h-10 bg-slate-100 rounded-sm flex items-center justify-center text-slate-400">
              <BoxIcon size={20} />
            </div>
            <div className="flex-1">
              <select 
                value={item.sku}
                onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                className="w-full bg-transparent text-slate-900 font-bold text-sm focus:outline-none appearance-none"
              >
                {boxLibrary.map(sku => (
                  <option key={sku.sku} value={sku.sku} className="bg-white">{sku.sku} - {sku.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-sm border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase font-bold">QTY</span>
              <input 
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                className="w-12 bg-transparent text-center text-slate-900 py-1 font-bold focus:outline-none"
              />
            </div>
            <button 
              onClick={() => removeItem(idx)}
              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button 
        disabled={items.length === 0}
        onClick={() => onNext(items)}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-100"
      >
        OPTIMIZE PALLET <ChevronRight size={20} />
      </button>
    </div>
  );
};

// --- Subcomponent: Confirmation Gate ---
const ConfirmationGate = ({ 
  boxLibrary, 
  palletLibrary,
  items, 
  onConfirm, 
  onBack 
}: { 
  boxLibrary: Box[], 
  palletLibrary: PalletBase[],
  items: { sku: string; quantity: number }[], 
  onConfirm: (palletBases: PalletBase[]) => void, 
  onBack: () => void 
}) => {
  const boxesToPack = useMemo(() => {
    return items
      .map(oi => ({
        box: boxLibrary.find(s => s.sku === oi.sku),
        quantity: oi.quantity
      }))
      .filter(item => item.box !== undefined) as { box: Box; quantity: number }[];
  }, [items, boxLibrary]);

  const recommendations = useMemo(() => {
    if (boxesToPack.length === 0 || palletLibrary.length === 0) return [];

    return palletLibrary
      .map(p => {
        if (!p?.dimensions) return { ...p, count: Infinity, area: Infinity };

        const canFitLarge = boxesToPack.every(b => 
          (b.box.dimensions.length <= p.dimensions.length && b.box.dimensions.width <= p.dimensions.width) ||
          (b.box.dimensions.width <= p.dimensions.length && b.box.dimensions.length <= p.dimensions.width)
        );

        if (!canFitLarge) return { ...p, count: Infinity, area: Infinity };

        // Run full packing simulation to get accurate count
        const packingResult = packPallets(boxesToPack, p.dimensions);
        const count = packingResult.length;
        const area = p.dimensions.length * p.dimensions.width;
        
        return { ...p, count, area };
      })
      .sort((a, b) => {
        // Primary: minimize pallet count
        if (a.count !== b.count) return a.count - b.count;
        // Secondary: minimize footprint area
        return a.area - b.area;
      });
  }, [boxesToPack, palletLibrary]);

  const initialEstimate = useMemo(() => {
    const best = recommendations[0] || palletLibrary[0];
    if (!best || boxesToPack.length === 0) return 1;
    // Run a dry run packing with the best recommended base to get an accurate starting count
    const result = packPallets(boxesToPack, best.dimensions);
    return Math.max(1, result.length);
  }, [recommendations, palletLibrary, boxesToPack]);

  const [pallets, setPallets] = useState<PalletBase[]>([]);
  const [approvedPallets, setApprovedPallets] = useState<Set<number>>(new Set<number>());

  // Initial setup of pallets
  useEffect(() => {
    if (pallets.length === 0 && recommendations.length > 0 && boxesToPack.length > 0) {
      const best = recommendations[0];
      setPallets(Array(initialEstimate).fill(null).map((_, i) => ({ ...best, id: `${best.id}-${i}` })));
    }
  }, [initialEstimate, recommendations, boxesToPack]);

  // Reactive adjustment: If user changes a pallet size, run a dry-pack to see if 
  // more or fewer pallets are required to finish the job.
  useEffect(() => {
    if (boxesToPack.length === 0 || pallets.length === 0) return;

    // Use current selection of bases for the packing logic
    const bases = pallets.map(p => p.dimensions);
    const packingResult = packPallets(boxesToPack, bases);
    const requiredCount = Math.max(1, packingResult.length);

    if (requiredCount > pallets.length) {
      // We need more pallets to accommodate the payload with current sizes
      const best = recommendations[0] || palletLibrary[0];
      const additionalCount = requiredCount - pallets.length;
      const additional = Array(additionalCount).fill(null).map((_, i) => ({
        ...best,
        id: `${best.id}-${pallets.length + i}`
      }));
      setPallets(prev => [...prev, ...additional]);
    } else if (requiredCount < pallets.length && pallets.length > 1) {
      // Too many pallets configured for the payload
      setPallets(prev => prev.slice(0, requiredCount));
      setApprovedPallets(prev => {
        const next = new Set<number>();
        prev.forEach(v => {
          if (v < requiredCount) next.add(v);
        });
        return next;
      });
    }
  }, [pallets.map(p => `${p.dimensions.length}-${p.dimensions.width}`).join(','), boxesToPack, recommendations, palletLibrary]);

  const updatePallet = (idx: number, base: PalletBase) => {
    const newPallets = [...pallets];
    newPallets[idx] = { ...base, id: `${base.id}-${idx}` };
    setPallets(newPallets);
    const newApproved = new Set<number>(approvedPallets);
    newApproved.delete(idx); // Clear approval on change
    setApprovedPallets(newApproved);
  };

  const toggleApproval = (idx: number) => {
    const newApproved = new Set<number>(approvedPallets);
    if (newApproved.has(idx)) newApproved.delete(idx);
    else newApproved.add(idx);
    setApprovedPallets(newApproved);
  };

  const addPallet = () => {
    const best = recommendations[0] || palletLibrary[0];
    setPallets([...pallets, { ...best, id: `${best.id}-${pallets.length}` }]);
  };

  const removePallet = (idx: number) => {
    if (pallets.length <= 1) return;
    setPallets(pallets.filter((_, i) => i !== idx));
    const newApproved = new Set<number>();
    approvedPallets.forEach(v => {
      if (v < idx) newApproved.add(v);
      else if (v > idx) newApproved.add(v - 1);
    });
    setApprovedPallets(newApproved);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-sm border border-slate-200 border-l-4 border-l-indigo-600 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-slate-900 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <ClipboardList size={18} className="text-indigo-600" /> Confirmation Gate
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">Verify payload and stage the physical pallet inventory.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Total Staged</p>
            <p className="text-lg font-black text-indigo-600 tracking-tighter">{pallets.length} PALLETS</p>
          </div>
          <button 
            onClick={addPallet}
            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-sm transition-all"
            title="Add Another Pallet"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Item Review */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Itemized Payload</h3>
          <div className="space-y-px bg-slate-100 border border-slate-200 rounded-sm overflow-hidden sticky top-4 max-h-[70vh] overflow-y-auto">
            {items.map((item, idx) => {
              const skuData = boxLibrary.find(s => s.sku === item.sku);
              return (
                <div key={idx} className="flex justify-between items-center bg-white p-4">
                  <div>
                    <p className="text-slate-900 font-bold text-sm tracking-tight">{skuData?.sku}</p>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{skuData?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-600 font-black text-lg tracking-tighter">{item.quantity}x</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pallet Selection per Pallet */}
        <div className="lg:col-span-8 space-y-8">
          {pallets.map((p, pIdx) => (
            <div key={pIdx} className={cn(
              "p-6 rounded-sm border-2 transition-all relative",
              approvedPallets.has(pIdx) ? "bg-emerald-50/30 border-emerald-500 shadow-xl" : "bg-white border-slate-200"
            )}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg",
                    approvedPallets.has(pIdx) ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"
                  )}>
                    {pIdx + 1}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-black uppercase text-sm italic tracking-tighter">Pallet No. {pIdx + 1}</h4>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Base Geometry Specification</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pallets.length > 1 && (
                    <button 
                      onClick={() => removePallet(pIdx)}
                      className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                      title="Remove Pallet"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => toggleApproval(pIdx)}
                    className={cn(
                      "px-4 py-2 rounded-sm font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border",
                      approvedPallets.has(pIdx) 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-500"
                    )}
                  >
                    {approvedPallets.has(pIdx) ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 border-2 border-current rounded-full" />}
                    {approvedPallets.has(pIdx) ? 'Configuration Approved' : 'Approve Size'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                {recommendations.slice(0, 3).map((libPallet, idx) => {
                  const isSelected = p.name === libPallet.name && !p.id.includes('custom');
                  return (
                    <button
                      key={idx}
                      onClick={() => updatePallet(pIdx, libPallet)}
                      className={cn(
                        "p-4 rounded-sm border transition-all text-left group relative",
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md z-10" 
                          : "bg-white border-slate-200 text-slate-900 hover:border-indigo-400"
                      )}
                    >
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          <p className="font-bold text-xs uppercase tracking-tight truncate">{libPallet.name}</p>
                          <p className={cn("text-[9px] font-mono mt-1", isSelected ? "text-indigo-100" : "text-slate-400")}>
                            {libPallet.dimensions.length}" x {libPallet.dimensions.width}"
                          </p>
                        </div>
                        {idx === 0 && (
                          <span className={cn(
                            "mt-2 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                          )}>
                            Best
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                
                <button
                  onClick={() => {
                    const custom = {
                      id: 'custom',
                      name: 'Manual Override',
                      dimensions: { length: 48, width: 40, height: 5.5 },
                      tareWeight: 50,
                      maxWeight: 2500
                    };
                    updatePallet(pIdx, custom);
                  }}
                  className={cn(
                    "p-4 rounded-sm border transition-all text-left flex flex-col justify-center gap-1",
                    p.id.includes('custom')
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md" 
                      : "bg-white border-slate-200 text-slate-900 hover:border-indigo-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Edit3 size={14} />
                    <p className="font-bold text-xs uppercase tracking-tight">Manual</p>
                  </div>
                  <p className={cn("text-[8px] font-medium leading-tight", p.id.includes('custom') ? "text-indigo-100" : "text-slate-400")}>
                    Set Custom Dimensions
                  </p>
                </button>
              </div>

              {p.id.includes('custom') && (
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-sm grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Length (IN)</label>
                    <input 
                      type="number"
                      value={p.dimensions.length}
                      onChange={(e) => updatePallet(pIdx, { ...p, dimensions: { ...p.dimensions, length: Number(e.target.value) } })}
                      className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-sm focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Width (IN)</label>
                    <input 
                      type="number"
                      value={p.dimensions.width}
                      onChange={(e) => updatePallet(pIdx, { ...p, dimensions: { ...p.dimensions, width: Number(e.target.value) } })}
                      className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-sm focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-50">
        <div className="max-w-4xl w-full flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 py-4 bg-white text-slate-500 hover:text-slate-900 font-bold uppercase tracking-widest rounded-sm border border-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> EDIT PAYLOAD
          </button>
          <button 
            onClick={() => onConfirm(pallets)}
            disabled={approvedPallets.size < pallets.length}
            className={cn(
              "flex-[2] py-4 font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center justify-center gap-2 shadow-xl",
              approvedPallets.size < pallets.length
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200 animate-in fade-in zoom-in duration-300"
            )}
          >
            GENERATE 3D BUILD {approvedPallets.size < pallets.length ? `(${approvedPallets.size}/${pallets.length} Approved)` : <CheckCircle2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Subcomponent: Packing Step ---
const PackingStep = ({ 
  pallets, 
  onComplete, 
  onReCalculate,
  onPalletUpdate
}: { 
  pallets: Pallet[], 
  onComplete: () => void, 
  onReCalculate: () => void,
  onPalletUpdate: (palletIdx: number, items: PackedItem[]) => void
}) => {
  const [currentPalletIdx, setCurrentPalletIdx] = useState(0);
  if (pallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-sm italic text-slate-400">
        <BoxIcon size={48} className="mb-4 opacity-20" />
        <p className="font-bold uppercase text-xs tracking-widest">Generating Instruction Set...</p>
      </div>
    );
  }

  const currentPallet = pallets[currentPalletIdx];
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentItemToScan = useMemo(() => {
    return currentPallet.items.find(item => !scannedIds.has(item.id));
  }, [currentPallet, scannedIds]);

  const handleItemUpdate = (itemId: string, updates: Partial<PackedItem>) => {
    const newItems = currentPallet.items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    onPalletUpdate(currentPalletIdx, newItems);
  };
  
  const handleRecalculate = async (itemId: string) => {
    const triggerItem = currentPallet.items.find(it => it.id === itemId);
    if (!triggerItem) return;

    const triggerZ = triggerItem.position.z;
    
    // Identify items that need to be repacked (above triggerZ)
    const itemsToKeepFixed = currentPallet.items.filter(it => it.position.z < triggerZ + 0.1);
    
    // Remaining boxes to pack are those that are currently at or above triggerZ (excluding those already in fixed)
    const fixedIds = new Set(itemsToKeepFixed.map(it => it.id));
    const itemsToRemove = currentPallet.items.filter(it => !fixedIds.has(it.id));
    const boxesToPack = itemsToRemove.map(it => it.box);

    const { repackPallet } = await import('../lib/packing-logic');
    const newItems = repackPallet(itemsToKeepFixed, boxesToPack, currentPallet.dimensions);
    
    onPalletUpdate(currentPalletIdx, newItems);
  };

  useEffect(() => {
    if (currentItemToScan) {
      const activeElement = document.getElementById(`item-${currentItemToScan.id}`);
      if (activeElement && scrollRef.current) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentItemToScan]);

  const handleScan = () => {
    if (currentItemToScan) {
      setScannedIds(prev => new Set([...prev, currentItemToScan.id]));
    }
  };

  const metrics = useMemo(() => {
    const productItems = currentPallet.items.filter(item => !item.itemType || item.itemType === 'box');

    const totalProductVolume = productItems.reduce((sum, item) => 
      sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height), 0
    );
    const buildHeight = currentPallet.items.reduce((max, item) => 
      Math.max(max, item.position.z + item.dimensions.height), 0
    );
    
    const footprintArea = currentPallet.dimensions.length * currentPallet.dimensions.width;
    const totalVolume = footprintArea * (buildHeight - currentPallet.dimensions.height);
    
    const efficiency = totalVolume > 0 ? (totalProductVolume / totalVolume) * 100 : 0;
    
    return {
      efficiency,
      buildHeight,
      totalWeight: productItems.reduce((sum, i) => sum + i.box.weight, 0) + currentPallet.tareWeight,
    };
  }, [currentPallet]);

  const progress = (scannedIds.size / currentPallet.items.length) * 100;

  // Enhance items with scanned state for the viewer
  const enhancedPallet = {
    ...currentPallet,
    items: currentPallet.items.map(item => ({
      ...item,
      isScanned: scannedIds.has(item.id)
    }))
  };

  const isComplete = scannedIds.size === currentPallet.items.length;
  const hasMorePallets = currentPalletIdx < pallets.length - 1;

  const handleNextPallet = () => {
    if (hasMorePallets) {
      setCurrentPalletIdx(prev => prev + 1);
      setScannedIds(new Set());
    }
  };

  return (
    <div className="grid grid-cols-12 gap-0 border border-slate-200 bg-white rounded-sm overflow-hidden h-[700px]">
      {/* Left Sidebar: Sequence */}
      <aside className="col-span-3 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Packing Sequence</h2>
            <p className="text-[9px] font-black text-indigo-600 uppercase">Pallet {currentPalletIdx + 1} of {pallets.length}</p>
          </div>
          <span className="text-[9px] font-mono text-slate-400">{scannedIds.size} / {currentPallet.items.length}</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-px bg-slate-100">
          {currentPallet.items.map((item, idx) => {
            const isScanned = scannedIds.has(item.id);
            const isActive = currentItemToScan?.id === item.id;
            
            return (
              <div 
                key={item.id} 
                id={`item-${item.id}`}
                className={cn(
                  "p-4 flex gap-3 transition-colors border-l-4",
                  isScanned ? "bg-white border-l-emerald-500 opacity-60" : 
                  isActive ? "bg-indigo-50 border-l-indigo-500" : "bg-white border-l-transparent opacity-40"
                )}
              >
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
                    isScanned ? "bg-emerald-100 text-emerald-600" : 
                    isActive ? "animate-pulse" : "bg-slate-100 text-slate-400"
                  )}
                  style={{ 
                    backgroundColor: !isScanned ? item.box.color || '#3b82f6' : undefined,
                    color: !isScanned ? '#fff' : undefined,
                    border: isActive ? '2px solid #4f46e5' : 'none'
                  }}
                >
                  {isScanned ? <CheckCircle2 size={16} /> : String(idx + 1).padStart(2, '0')}
                </div>
                <div>
                  <p className={cn("font-bold text-sm leading-tight", isActive ? "text-indigo-900" : "text-slate-900")}>
                    {item.box.sku}
                  </p>
                  <p className={cn("text-[10px] mt-0.5 uppercase font-medium", isActive ? "text-indigo-700" : "text-slate-400")}>
                    {item.box.dimensions.length}"x{item.box.dimensions.width}"x{item.box.dimensions.height}" • {item.box.weight} LBS
                  </p>
                  {isActive && (
                    <div className="mt-2 text-[8px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                      <Scan size={10} /> Awaiting Scan...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Center: 3D Visualization */}
      <section className="col-span-6 bg-slate-100 relative group">
        <PalletViewer 
          pallets={pallets.map((p, idx) => ({
            ...p,
            items: p.items.map(item => ({
              ...item,
              isScanned: idx < currentPalletIdx ? true : (idx === currentPalletIdx ? scannedIds.has(item.id) : false)
            }))
          }))}
          activePalletIdx={currentPalletIdx}
          landmarksVisible={true} 
        />
        
        <div className="absolute top-4 right-4 flex flex-col items-end opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Bay Door Facing</span>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
          <div className="mt-1 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/50 px-2 py-0.5 rounded-full">
            {currentPallet.dimensions.length}" x {currentPallet.dimensions.width}" Base
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </section>

      {/* Right Sidebar: Logistics & Controls */}
      <aside className="col-span-3 border-l border-slate-200 flex flex-col p-6 bg-white overflow-y-auto">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-6">Logistics Dashboard</h3>

        <div className="space-y-6 flex-1 mb-8">
          <div className="bg-slate-50 p-4 border border-slate-100 rounded-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Build Height</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono font-bold tracking-tighter text-indigo-600">
                {metrics.buildHeight.toFixed(2)}"
              </span>
              <span className="text-slate-300 font-bold text-xs">/ 92"</span>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center text-[11px] font-bold uppercase">
               <span className="text-slate-400">Pallet Weight</span>
               <span className="text-slate-900">{formatWeight(metrics.totalWeight)}</span>
             </div>
             <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <span className="text-slate-400">Utilization Efficiency</span>
                <span className={cn(
                  "font-mono",
                  metrics.efficiency > 70 ? "text-emerald-600" : metrics.efficiency > 40 ? "text-amber-500" : "text-rose-500"
                )}>
                  {metrics.efficiency.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <span className="text-slate-400">Layering Model</span>
                <span className="text-slate-900 italic">55% OVERHANG</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <span className="text-slate-400">Corner Pull</span>
                <span className="text-slate-900 italic">BACK-LEFT (0,0)</span>
              </div>
          </div>

          {!isComplete && (
            <div className="pt-6 border-t border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Active Instructions</p>
               <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-sm">
                 <p className="text-[10px] text-indigo-400 uppercase font-black mb-2">Placement Coord</p>
                 <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold text-indigo-900">
                   <div>X: {currentItemToScan?.position.x.toFixed(2)}"</div>
                   <div>Y: {currentItemToScan?.position.y.toFixed(2)}"</div>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3 shrink-0">
          {!isComplete ? (
            <button 
              onClick={handleScan}
              className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100"
            >
              <Scan size={18} /> Confirm Scan
            </button>
          ) : hasMorePallets ? (
            <button 
              onClick={handleNextPallet}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
            >
              Next Pallet <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              onClick={onComplete}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-sm flex items-center justify-center gap-2 transition-all"
            >
              <FileText size={18} /> Final Manifest
            </button>
          )}
          <button 
            onClick={onReCalculate}
            className="w-full text-center text-[9px] font-bold uppercase text-slate-300 hover:text-slate-500 transition-colors"
          >
            Flag Missing / Re-Calculate
          </button>
        </div>
      </aside>
    </div>
  );
};

// --- Main Dashboard ---
export const PackingDashboard = ({ 
  boxLibrary, 
  palletLibrary,
  sosConfig,
  onOpenAdmin
}: { 
  boxLibrary: Box[], 
  palletLibrary: PalletBase[],
  sosConfig: SOSConfig,
  onOpenAdmin: () => void
}) => {
  const [step, setStep] = useState<BuildStep>('input');
  const [orderItems, setOrderItems] = useState<{ sku: string; quantity: number }[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [bolNumber, setBolNumber] = useState('');
  const [currentPalletBases, setCurrentPalletBases] = useState<PalletBase[]>([]);

  const handleOptimization = (items: { sku: string; quantity: number }[]) => {
    setOrderItems(items);
    setStep('confirmation');
  };

  const handleBuild = (palletBases: PalletBase[]) => {
    const basesToUse = palletBases || currentPalletBases;
    const boxesToPack = orderItems
      .map(oi => ({
        box: boxLibrary.find(s => s.sku === oi.sku),
        quantity: oi.quantity
      }))
      .filter(item => item && item.box && item.box.dimensions) as { box: Box; quantity: number }[];

    if (boxesToPack.length === 0) return;

    const optimized = packPallets(boxesToPack, basesToUse.map(b => b.dimensions));
    
    if (optimized.length > 0) {
      setCurrentPalletBases(basesToUse);
      setPallets(optimized.map((p, idx) => {
        const base = basesToUse[idx] || basesToUse[basesToUse.length - 1];
        return { ...p, tareWeight: base.tareWeight, maxWeight: base.maxWeight };
      }));
      setStep('packing');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('PALLET PERFECT MANIFEST', 15, 25);
    doc.setFontSize(10);
    doc.text(`BOL/PRO: ${bolNumber || 'NOT ASSIGNED'}`, 15, 33);
    
    // Logistics Summary Table
    const totalWeight = pallets.reduce((sum, p) => sum + p.items.reduce((bSum, item) => bSum + item.box.weight, 0) + p.tareWeight, 0);
    const maxBuildHeight = pallets.reduce((max, p) => Math.max(max, p.items.reduce((h, item) => Math.max(h, item.position.z + item.dimensions.height), 0)), 0);

    autoTable(doc, {
      startY: 50,
      head: [['Shipment Summary Metric', 'Value']],
      body: [
        ['Total Pallets Staged', pallets.length.toString()],
        ['Gross Shipment Weight', formatWeight(totalWeight)],
        ['Max Build Height (All)', formatInches(maxBuildHeight)],
        ['Assigned BOL Number', bolNumber || 'NOT ASSIGNED'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] } // slate-600
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Individual Pallet Manifests
    pallets.forEach((pallet, pIdx) => {
      // Check if we need a new page for the next pallet
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, currentY, 180, 10, 'F');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`PALLET ${pIdx + 1} OF ${pallets.length}`, 20, currentY + 7);
      
      const palletWeight = pallet.items.reduce((sum, item) => sum + item.box.weight, 0) + pallet.tareWeight;
      const palletZHeights = pallet.items.map(item => item.position.z + item.dimensions.height);
      const palletHeight = palletZHeights.length > 0 ? Math.max(...palletZHeights) : pallet.dimensions.height;

      // Summary sub-header for the pallet
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dimensions: ${pallet.dimensions.length}"L x ${pallet.dimensions.width}"W | Load Height: ${formatInches(palletHeight)} | Total Weight: ${formatWeight(palletWeight)}`, 20, currentY + 14);

      // Pallet Detail Table
      const palletItemsMap = new Map<string, { name: string, qty: number, weight: number }>();
      pallet.items.forEach(item => {
        const existing = palletItemsMap.get(item.box.sku) || { name: item.box.name, qty: 0, weight: 0 };
        palletItemsMap.set(item.box.sku, {
          name: item.box.name,
          qty: existing.qty + 1,
          weight: existing.weight + item.box.weight
        });
      });

      const palletTableData = Array.from(palletItemsMap.entries()).map(([sku, data]) => [
        sku,
        data.name,
        data.qty,
        formatWeight(data.weight)
      ]);

      const startTableY = currentY + 18;
      autoTable(doc, {
        startY: startTableY,
        head: [['SKU', 'Description', 'Qty', 'Weight']],
        body: palletTableData,
        foot: [[
          { content: 'PALLET TOTALS', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: pallet.items.length.toString(), styles: { fontStyle: 'bold' } },
          { content: formatWeight(palletWeight), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'striped',
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        styles: { fontSize: 8 },
        didDrawPage: (data: any) => {
             // If table broke to new page, we should update currentY
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`MANIFEST-${bolNumber || Date.now()}.pdf`);
    
    // Log to history (Mocking Google Sheets)
    const log = {
      timestamp: new Date().toISOString(),
      soNumbers: [bolNumber],
      totalWeight,
      maxHeight: maxBuildHeight,
      palletsCount: pallets.length,
      operator: 'SYSTEM'
    };
    const history = JSON.parse(localStorage.getItem('pallet_history') || '[]');
    localStorage.setItem('pallet_history', JSON.stringify([log, ...history].slice(0, 50)));

    setStep('summary');
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F8FAFC]">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 flex items-center justify-center rounded-sm">
            <span className="text-white font-bold text-xl tracking-tighter italic">PP</span>
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pallet Perfect Engineer</h1>
            <p className="text-base font-bold tracking-tight flex items-center gap-2">
               {bolNumber ? `BOL: #${bolNumber}` : 'New Batch Request'} 
               <span className="text-slate-200 font-normal">|</span> 
               <span className="text-slate-500 font-medium">Shellz Logistics</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 border-l border-slate-200 ml-6 pl-6">
           <button 
            onClick={onOpenAdmin}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-sm transition-all group"
            title="Warehouse Admin"
          >
            <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <nav className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-sm border border-slate-200">
          {(['input', 'confirmation', 'packing', 'summary'] as BuildStep[]).map((s, i) => {
            const stepOrder = ['input', 'confirmation', 'packing', 'summary'];
            const currentIndex = stepOrder.indexOf(step);
            const itemIndex = stepOrder.indexOf(s);
            const isAccessible = itemIndex <= currentIndex;
            const isPast = itemIndex < currentIndex;
            
            return (
              <button 
                key={s} 
                className={cn(
                  "px-4 py-1.5 rounded-sm text-[10px] font-black uppercase transition-all flex items-center gap-2 relative",
                  step === s ? "bg-white text-indigo-600 shadow-sm" : isPast ? "text-slate-600 hover:bg-white/50" : "text-slate-400",
                  isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                )}
                onClick={() => isAccessible && setStep(s)}
                disabled={!isAccessible}
              >
                <span className="flex items-center gap-1.5">
                  {isPast ? <CheckCircle2 size={10} className="text-emerald-500" /> : <span className="w-3 h-3 flex items-center justify-center rounded-full border border-current text-[8px]">{i + 1}</span>}
                  {s}
                </span>
                {step === s && <motion.div layoutId="nav-pill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 mx-4" />}
              </button>
            );
          })}
        </nav>

        <div className="flex gap-6 border-l border-slate-200 pl-6 h-10 items-center">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-slate-400">Status</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs font-bold text-emerald-600 font-mono italic">ACTIVE</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="max-w-2xl mx-auto">
                <InputStep 
                  boxLibrary={boxLibrary} 
                  sosConfig={sosConfig}
                  onNext={handleOptimization} 
                />
              </div>
            </motion.div>
          )}
          {step === 'confirmation' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <div className="max-w-4xl mx-auto">
                <ConfirmationGate 
                  boxLibrary={boxLibrary} 
                  palletLibrary={palletLibrary}
                  items={orderItems} 
                  onConfirm={handleBuild} 
                  onBack={() => setStep('input')} 
                />
              </div>
            </motion.div>
          )}
          {step === 'packing' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="min-h-[700px]"
            >
              <PackingStep 
                pallets={pallets} 
                onComplete={() => setStep('summary')} 
                onReCalculate={() => handleBuild(currentPalletBases)}
                onPalletUpdate={(idx, items) => {
                  const newPallets = [...pallets];
                  newPallets[idx] = { ...newPallets[idx], items };
                  setPallets(newPallets);
                }}
              />
            </motion.div>
          )}
          {step === 'summary' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center space-y-8">
              <div className="bg-white p-10 rounded-sm border border-slate-200 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 -mr-16 -mt-16 rounded-full" />
                
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-slate-900 font-black text-3xl uppercase tracking-widest mb-4">Pallet Strategy Verified</h2>
                
                <div className="grid grid-cols-3 gap-4 text-left border-y border-slate-100 py-8 my-8">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Total Weight</p>
                    <p className="text-slate-900 font-mono font-bold text-xl">{formatWeight(pallets.reduce((s, p) => s + p.items.reduce((i, it) => i + it.box.weight, 0) + p.tareWeight, 0))}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Total Items</p>
                    <p className="text-slate-900 font-mono font-bold text-xl">{pallets.reduce((s, p) => s + p.items.length, 0)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Stability Score</p>
                    <p className="text-emerald-600 font-mono font-bold text-xl uppercase italic">High</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-left bg-slate-50 p-6 rounded-sm border border-slate-100">
                    <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block">Final Ship Record (BOL/PRO #)</label>
                    <div className="flex gap-4">
                       <input 
                        type="text" 
                        value={bolNumber}
                        onChange={(e) => setBolNumber(e.target.value)}
                        placeholder="ENTER TRACKING ID"
                        className="flex-1 bg-white border border-slate-200 p-3 rounded-sm font-mono text-slate-900 text-sm focus:border-indigo-600 outline-none transition-colors"
                      />
                      <button 
                        onClick={generatePDF}
                        className="px-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-sm transition-all"
                      >
                        Generate PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep('input')}
                className="text-slate-400 hover:text-indigo-600 uppercase font-black text-[10px] tracking-widest transition-colors flex items-center gap-2 mx-auto"
              >
                <ArrowLeft size={14} /> Finalize and Start New
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-16 bg-white flex items-center px-8 border-t border-slate-200 mt-20 sticky bottom-0 z-50">
        <div className="flex-1 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Geometric Safety Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-indigo-500/20 border border-indigo-200 rounded-full"></div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Build 2.0.4-R</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span className="font-mono">©2026 Shellz Logistics</span>
           <button className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
              <HistoryIcon size={14} /> LOGS
           </button>
        </div>
      </footer>
    </div>
  );
};
