import React, { useState } from 'react';
import { Box, PalletBase, Dimensions, SOSConfig, StandardBox } from '../types';
import { 
  ArrowLeft, Download, Upload, Plus, Trash2, Save, 
  Package, Database, LayoutGrid, Check, X, AlertCircle,
  Globe, Key, User, ShieldCheck, BoxIcon, Sliders
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  boxLibrary: Box[];
  palletLibrary: PalletBase[];
  standardBoxLibrary: StandardBox[];
  sosConfig: SOSConfig;
  onUpdateBoxes: (boxes: Box[]) => void;
  onUpdatePallets: (pallets: PalletBase[]) => void;
  onUpdateStandardBoxes: (boxes: StandardBox[]) => void;
  onUpdateSOSConfig: (config: SOSConfig) => void;
  onClose: () => void;
}

export const AdminPanel = ({ 
  boxLibrary, 
  palletLibrary, 
  standardBoxLibrary,
  sosConfig,
  onUpdateBoxes, 
  onUpdatePallets, 
  onUpdateStandardBoxes,
  onUpdateSOSConfig,
  onClose 
}: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState<'boxes' | 'pallets' | 'sos' | 'standard_boxes' | 'constraints'>('boxes');
  const [tempBoxes, setTempBoxes] = useState<Box[]>([...boxLibrary]);
  const [tempPallets, setTempPallets] = useState<PalletBase[]>([...palletLibrary]);
  const [tempStandardBoxes, setTempStandardBoxes] = useState<StandardBox[]>([...standardBoxLibrary]);
  const [tempSOS, setTempSOS] = useState<SOSConfig>({ ...sosConfig });
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    // Deduplicate boxes by SKU (latest one wins)
    const uniqueBoxes = Array.from(new Map(tempBoxes.map(b => [b.sku, b])).values());
    // Deduplicate pallets by ID
    const uniquePallets = Array.from(new Map(tempPallets.map(p => [p.id, p])).values());
    // Deduplicate standard boxes by ID
    const uniqueStdBoxes = Array.from(new Map(tempStandardBoxes.map(b => [b.id, b])).values());
    
    onUpdateBoxes(uniqueBoxes);
    onUpdatePallets(uniquePallets);
    onUpdateStandardBoxes(uniqueStdBoxes);
    onUpdateSOSConfig(tempSOS);
    
    setTempBoxes(uniqueBoxes);
    setTempPallets(uniquePallets);
    setTempStandardBoxes(uniqueStdBoxes);
    setHasChanges(false);
  };

  const addBox = () => {
    const newBox: Box = {
      sku: `NEW-${Math.random().toString(36).substring(7).toUpperCase()}`,
      name: 'New Product',
      dimensions: { length: 12, width: 12, height: 12 },
      weight: 10,
      color: '#6366f1'
    };
    setTempBoxes([newBox, ...tempBoxes]);
    setHasChanges(true);
  };

  const addPallet = () => {
    const newPallet: PalletBase = {
      id: `PAL-${Math.random().toString(36).substring(7).toUpperCase()}`,
      name: 'New Pallet Size',
      dimensions: { length: 48, width: 40, height: 5.5 },
      tareWeight: 50,
      maxWeight: 2500
    };
    setTempPallets([newPallet, ...tempPallets]);
    setHasChanges(true);
  };

  const addStandardBox = () => {
    const newBox: StandardBox = {
      id: `STD-${Math.random().toString(36).substring(7).toUpperCase()}`,
      name: 'Standard Shipping Box',
      dimensions: { length: 18, width: 18, height: 18 },
      weightCapacity: 50,
      tareWeight: 1.5
    };
    setTempStandardBoxes([newBox, ...tempStandardBoxes]);
    setHasChanges(true);
  };

  const removeBox = (index: number) => {
    const newBoxes = [...tempBoxes];
    newBoxes.splice(index, 1);
    setTempBoxes(newBoxes);
    setHasChanges(true);
  };

  const removePallet = (index: number) => {
    const newPallets = [...tempPallets];
    newPallets.splice(index, 1);
    setTempPallets(newPallets);
    setHasChanges(true);
  };

  const removeStandardBox = (index: number) => {
    const newBoxes = [...tempStandardBoxes];
    newBoxes.splice(index, 1);
    setTempStandardBoxes(newBoxes);
    setHasChanges(true);
  };

  const clearAll = (type: 'boxes' | 'pallets' | 'standard_boxes') => {
    if (!confirm(`Are you sure you want to clear the entire ${type === 'boxes' ? 'Box Library' : type === 'pallets' ? 'Pallet Inventory' : 'Standard Box Library'}?`)) return;
    if (type === 'boxes') setTempBoxes([]);
    else if (type === 'pallets') setTempPallets([]);
    else setTempStandardBoxes([]);
    setHasChanges(true);
  };

  const updateBox = (sku: string, updates: Partial<Box>) => {
    setTempBoxes(tempBoxes.map(b => b.sku === sku ? { ...b, ...updates } : b));
    setHasChanges(true);
  };

  const updatePallet = (id: string, updates: Partial<PalletBase>) => {
    setTempPallets(tempPallets.map(p => p.id === id ? { ...p, ...updates } : p));
    setHasChanges(true);
  };

  const updateStandardBox = (id: string, updates: Partial<StandardBox>) => {
    setTempStandardBoxes(tempStandardBoxes.map(b => b.id === id ? { ...b, ...updates } : b));
    setHasChanges(true);
  };

  const exportData = (type: 'boxes' | 'pallets') => {
    let ws: XLSX.WorkSheet;
    if (type === 'boxes') {
      const flattenedBoxes = tempBoxes.map(b => ({
        SKU: b.sku,
        Name: b.name,
        Length: b.dimensions.length,
        Width: b.dimensions.width,
        Height: b.dimensions.height,
        Weight: b.weight,
        Color: b.color || '#6366f1'
      }));
      ws = XLSX.utils.json_to_sheet(flattenedBoxes);
    } else {
      const flattenedPallets = tempPallets.map(p => ({
        ID: p.id,
        Name: p.name,
        Length: p.dimensions.length,
        Width: p.dimensions.width,
        Height: p.dimensions.height,
        TareWeight: p.tareWeight,
        MaxWeight: p.maxWeight
      }));
      ws = XLSX.utils.json_to_sheet(flattenedPallets);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'boxes' ? 'Box Library' : 'Pallet Inventory');
    XLSX.writeFile(wb, `pallet_perfect_${type}.xlsx`);
  };

  const triggerImport = (type: 'boxes' | 'pallets') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const importedData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (importedData.length === 0) {
            alert('The spreadsheet appears to be empty.');
            return;
          }

          const firstRow = importedData[0];
          if (type === 'boxes') {
            const hasBoxHeaders = 'SKU' in firstRow || 'sku' in firstRow;
            if (!hasBoxHeaders && !confirm('No SKU column detected. Some items may have generated IDs. Try importing anyway?')) return;
            
            const boxes: Box[] = importedData.map((row, index) => {
              const l = Number(row.Length || row.length);
              const w = Number(row.Width || row.width);
              const h = Number(row.Height || row.height);
              const weight = Number(row.Weight || row.weight);

              return {
                sku: String(row.SKU || row.sku || `BOX-${Date.now()}-${index}`),
                name: String(row.Name || row.name || 'Imported Product'),
                dimensions: {
                  length: isNaN(l) || l <= 0 ? 12 : l,
                  width: isNaN(w) || w <= 0 ? 12 : w,
                  height: isNaN(h) || h <= 0 ? 12 : h
                },
                weight: isNaN(weight) || weight <= 0 ? 10 : weight,
                color: String(row.Color || row.color || '#6366f1')
              };
            });
            
            setTempBoxes(prev => {
              // Deduplicate across existing and new items
              const combined = [...prev, ...boxes];
              const uniqueMap = new Map();
              combined.forEach(item => {
                // If SKU exists, the later one (from the import) wins for updates
                uniqueMap.set(item.sku, item);
              });
              return Array.from(uniqueMap.values());
            });
          } else {
            const hasPalletHeaders = 'ID' in firstRow || 'id' in firstRow || 'TareWeight' in firstRow;
            // Stronger heuristic: if it has SKU but no pallet-specific terms, it's likely a box file
            if (!hasPalletHeaders && ('SKU' in firstRow || 'sku' in firstRow)) {
              alert('Wait! This appears to be a Product SKU file. You are currently in the Pallet Sizes tab. Please switch to "Box Library" to import these items, or ensure your Pallet file has an "ID" column.');
              return;
            }

            const pallets: PalletBase[] = importedData.map((row, index) => {
              const l = Number(row.Length || row.length);
              const w = Number(row.Width || row.width);
              const h = Number(row.Height || row.height);
              const tare = Number(row.TareWeight || row.tareWeight || row.Tare_Weight);
              const max = Number(row.MaxWeight || row.maxWeight || row.Max_Weight);

              return {
                id: String(row.ID || row.id || `PAL-${Date.now()}-${index}`),
                name: String(row.Name || row.name || 'Imported Pallet'),
                dimensions: {
                  length: isNaN(l) || l <= 0 ? 48 : l,
                  width: isNaN(w) || w <= 0 ? 40 : w,
                  height: isNaN(h) || h <= 0 ? 5.5 : h
                },
                tareWeight: isNaN(tare) || tare <= 0 ? 50 : tare,
                maxWeight: isNaN(max) || max <= 0 ? 2500 : max
              };
            });
            
            setTempPallets(prev => {
              const combined = [...prev, ...pallets];
              const uniqueMap = new Map();
              combined.forEach(item => {
                uniqueMap.set(item.id, item);
              });
              return Array.from(uniqueMap.values());
            });
          }
          setHasChanges(true);
        } catch (err) {
          alert('Invalid file format. Please ensure you are using the correct template.');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Warehouse Management</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Library & Pallet Config</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-sm shadow-lg transition-all"
            >
              <Save size={16} /> Save Changes
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-sm transition-all"
          >
            Close Panel
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-64 bg-white border-r border-slate-200 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('boxes')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'boxes' ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <Package size={18} /> Box Library
          </button>
          <button 
            onClick={() => setActiveTab('pallets')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'pallets' ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <LayoutGrid size={18} /> Pallet Sizes
          </button>
          <button 
            onClick={() => setActiveTab('standard_boxes')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'standard_boxes' ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <BoxIcon size={18} /> Standard Boxes
          </button>
          <button 
            onClick={() => setActiveTab('constraints')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'constraints' ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <Sliders size={18} /> Constraints
          </button>
          
          <div className="pt-8 px-4">
             <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Integrations</div>
             <button 
              onClick={() => setActiveTab('sos')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'sos' ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <Database size={14} /> SOS INVENTORY
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
                  {activeTab === 'boxes' ? 'Product SKU Library' : activeTab === 'pallets' ? 'Pallet Base Inventory' : activeTab === 'standard_boxes' ? 'Standard Box Sizes' : activeTab === 'constraints' ? 'Build Constraints' : 'SOS Integration Settings'}
                </h2>
                <p className="text-slate-500 font-medium">
                  {activeTab === 'boxes' ? 'Manage dimensions and weight constants for individual boxes.' : 
                   activeTab === 'pallets' ? 'Manage standard pallet base dimensions and weights.' :
                   activeTab === 'standard_boxes' ? 'Manage standard shipping boxes used for bulk consolidated orders.' :
                   activeTab === 'constraints' ? 'Define maximum height, width, and length constraints for pallet builds.' :
                   'Configure the connection to SOS Inventory API for real-time SO fetching.'}
                </p>
              </div>
              
              <div className="flex gap-2">
                {activeTab !== 'sos' && activeTab !== 'constraints' && (
                  <>
                    <button 
                      onClick={() => clearAll(activeTab as 'boxes' | 'pallets')}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all"
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                    <button 
                      onClick={() => triggerImport(activeTab as 'boxes' | 'pallets')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all"
                    >
                      <Upload size={14} /> Import Excel
                    </button>
                    <button 
                      onClick={() => exportData(activeTab as 'boxes' | 'pallets')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                    <button 
                      onClick={activeTab === 'boxes' ? addBox : activeTab === 'pallets' ? addPallet : addStandardBox}
                      className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest rounded-sm shadow-xl transition-all"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content Logic */}
            {activeTab === 'sos' ? (
              <div className="max-w-3xl">
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Key size={12} /> Application API Key
                      </label>
                      <input 
                        type="password" 
                        value={tempSOS.apiKey}
                        onChange={(e) => { setTempSOS({ ...tempSOS, apiKey: e.target.value }); setHasChanges(true); }}
                        placeholder="••••••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-emerald-500 outline-none transition-stroke"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <User size={12} /> User ID
                      </label>
                      <input 
                        type="text" 
                        value={tempSOS.userId}
                        onChange={(e) => { setTempSOS({ ...tempSOS, userId: e.target.value }); setHasChanges(true); }}
                        placeholder="user_123"
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-emerald-500 outline-none transition-stroke"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Database size={12} /> Account ID
                      </label>
                      <input 
                        type="text" 
                        value={tempSOS.accountId}
                        onChange={(e) => { setTempSOS({ ...tempSOS, accountId: e.target.value }); setHasChanges(true); }}
                        placeholder="acc_987"
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-emerald-500 outline-none transition-stroke"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Globe size={12} /> API Environment
                      </label>
                      <select 
                        value={tempSOS.environment}
                        onChange={(e) => { setTempSOS({ ...tempSOS, environment: e.target.value as 'production' | 'sandbox' }); setHasChanges(true); }}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded text-sm focus:border-emerald-500 outline-none transition-stroke"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-4 text-slate-400">
                    <ShieldCheck className="text-emerald-500" size={24} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Connection Verification</p>
                      <p className="text-[10px] font-medium">All API communication is encrypted. Credentials are stored securely in local environment.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'constraints' ? (
              <div className="max-w-3xl">
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 space-y-8">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Build Constraints</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-600">
                          <Sliders size={12} className="text-indigo-500" /> Max Pallet Height Limit (inches)
                        </label>
                        <input 
                          type="number" 
                          value={tempSOS.maxPalletHeight !== undefined && tempSOS.maxPalletHeight !== null ? tempSOS.maxPalletHeight : ''}
                          onChange={(e) => { 
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            setTempSOS({ ...tempSOS, maxPalletHeight: val }); 
                            setHasChanges(true); 
                          }}
                          placeholder="No height limit (Unlimited)"
                          min="0"
                          max="200"
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-indigo-500 outline-none transition-stroke"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Standard maximum build height limit including pallet tare height. Default is usually 92 inches.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-600">
                          <Sliders size={12} className="text-indigo-500" /> Max Pallet Width Limit (inches)
                        </label>
                        <input 
                          type="number" 
                          value={tempSOS.maxPalletWidth !== undefined && tempSOS.maxPalletWidth !== null ? tempSOS.maxPalletWidth : ''}
                          onChange={(e) => { 
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            setTempSOS({ ...tempSOS, maxPalletWidth: val }); 
                            setHasChanges(true); 
                          }}
                          placeholder="No width limit / Pallet Base Width"
                          min="0"
                          max="200"
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-indigo-500 outline-none transition-stroke"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Standard maximum build width limit. If not defined, the physical pallet base width is used.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-600">
                          <Sliders size={12} className="text-indigo-500" /> Max Pallet Length Limit (inches)
                        </label>
                        <input 
                          type="number" 
                          value={tempSOS.maxPalletLength !== undefined && tempSOS.maxPalletLength !== null ? tempSOS.maxPalletLength : ''}
                          onChange={(e) => { 
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            setTempSOS({ ...tempSOS, maxPalletLength: val }); 
                            setHasChanges(true); 
                          }}
                          placeholder="No length limit / Pallet Base Length"
                          min="0"
                          max="200"
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-indigo-500 outline-none transition-stroke"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Standard maximum build length limit. If not defined, the physical pallet base length is used.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-600">
                          <Sliders size={12} className="text-indigo-500" /> Min Box Support Overlap (%)
                        </label>
                        <input 
                          type="number" 
                          value={tempSOS.minSupportOverlap !== undefined && tempSOS.minSupportOverlap !== null ? tempSOS.minSupportOverlap : ''}
                          onChange={(e) => { 
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                            setTempSOS({ ...tempSOS, minSupportOverlap: val }); 
                            setHasChanges(true); 
                          }}
                          placeholder="Standard (55%)"
                          min="0"
                          max="100"
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded font-mono text-sm focus:border-indigo-500 outline-none transition-stroke"
                        />
                        <p className="text-[10px] text-slate-400 font-medium">Minimum contact surface area required with items below to allow support. Default standard is 55%.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-4 text-slate-500">
                    <ShieldCheck className="text-emerald-500" size={24} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Build Bounds Enforced</p>
                      <p className="text-[10px] font-medium">If empty/cleared, no constraints are applied. These settings dynamically control 3D packing volumes and pallet requirements.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 border-b border-slate-200">
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       {activeTab === 'boxes' ? 'SKU / Name' : activeTab === 'pallets' ? 'Pallet Name' : 'Box Name'}
                     </th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Dimensions (L x W x H)</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       {activeTab === 'boxes' ? 'Weight (lbs)' : activeTab === 'pallets' ? 'Tare / Max Cape' : 'Capacity / Tare'}
                     </th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {activeTab === 'boxes' ? (
                     tempBoxes.map((box, index) => (
                       <tr key={`${box.sku}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <input 
                             type="text" 
                             value={box.sku}
                             onChange={(e) => updateBox(box.sku, { sku: e.target.value })}
                             className="block w-full font-mono text-sm font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 outline-none"
                           />
                           <input 
                             type="text" 
                             value={box.name}
                             onChange={(e) => updateBox(box.sku, { name: e.target.value })}
                             className="block w-full text-xs text-slate-400 bg-transparent border-none p-0 focus:ring-0 outline-none"
                           />
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500">
                             <input 
                               type="number" 
                               value={box.dimensions.length}
                               onChange={(e) => updateBox(box.sku, { dimensions: { ...box.dimensions, length: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={box.dimensions.width}
                               onChange={(e) => updateBox(box.sku, { dimensions: { ...box.dimensions, width: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={box.dimensions.height}
                               onChange={(e) => updateBox(box.sku, { dimensions: { ...box.dimensions, height: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <input 
                             type="number" 
                             value={box.weight}
                             onChange={(e) => updateBox(box.sku, { weight: Number(e.target.value) })}
                             className="w-20 bg-slate-50 border border-slate-200 rounded p-1 text-sm font-bold"
                           />
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => removeBox(index)}
                             className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                       </tr>
                     ))
                   ) : activeTab === 'pallets' ? (
                     tempPallets.map((pallet, index) => (
                       <tr key={`${pallet.id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <input 
                             type="text" 
                             value={pallet.name}
                             onChange={(e) => updatePallet(pallet.id, { name: e.target.value })}
                             className="block w-full text-sm font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 outline-none"
                           />
                           <div className="text-[10px] text-slate-400 font-mono uppercase">{pallet.id}</div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500">
                             <input 
                               type="number" 
                               value={pallet.dimensions.length}
                               onChange={(e) => updatePallet(pallet.id, { dimensions: { ...pallet.dimensions, length: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={pallet.dimensions.width}
                               onChange={(e) => updatePallet(pallet.id, { dimensions: { ...pallet.dimensions, width: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={pallet.dimensions.height}
                               onChange={(e) => updatePallet(pallet.id, { dimensions: { ...pallet.dimensions, height: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-4">
                             <div>
                               <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Tare</div>
                               <input 
                                 type="number" 
                                 value={pallet.tareWeight}
                                 onChange={(e) => updatePallet(pallet.id, { tareWeight: Number(e.target.value) })}
                                 className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold"
                               />
                             </div>
                             <div>
                               <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Max</div>
                               <input 
                                 type="number" 
                                 value={pallet.maxWeight}
                                 onChange={(e) => updatePallet(pallet.id, { maxWeight: Number(e.target.value) })}
                                 className="w-20 bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold"
                               />
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => removePallet(index)}
                             className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                       </tr>
                     ))
                   ) : (
                     tempStandardBoxes.map((box, index) => (
                       <tr key={`${box.id}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <input 
                             type="text" 
                             value={box.name}
                             onChange={(e) => updateStandardBox(box.id, { name: e.target.value })}
                             className="block w-full text-sm font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 outline-none"
                           />
                           <div className="text-[10px] text-slate-400 font-mono uppercase">{box.id}</div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500">
                             <input 
                               type="number" 
                               value={box.dimensions.length}
                               onChange={(e) => updateStandardBox(box.id, { dimensions: { ...box.dimensions, length: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={box.dimensions.width}
                               onChange={(e) => updateStandardBox(box.id, { dimensions: { ...box.dimensions, width: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                             <span>x</span>
                             <input 
                               type="number" 
                               value={box.dimensions.height}
                               onChange={(e) => updateStandardBox(box.id, { dimensions: { ...box.dimensions, height: Number(e.target.value) }})}
                               className="w-12 bg-slate-50 border border-slate-200 rounded p-1"
                             />
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-4">
                             <div>
                               <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Cap</div>
                               <input 
                                 type="number" 
                                 value={box.weightCapacity}
                                 onChange={(e) => updateStandardBox(box.id, { weightCapacity: Number(e.target.value) })}
                                 className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold"
                               />
                             </div>
                             <div>
                               <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Tare</div>
                               <input 
                                 type="number" 
                                 value={box.tareWeight}
                                 onChange={(e) => updateStandardBox(box.id, { tareWeight: Number(e.target.value) })}
                                 className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold"
                               />
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => removeStandardBox(index)}
                             className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
               
               {activeTab === 'boxes' ? tempBoxes.length === 0 && (
                 <div className="p-12 text-center">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No boxes in library</p>
                 </div>
               ) : activeTab === 'pallets' ? tempPallets.length === 0 && (
                 <div className="p-12 text-center">
                    <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pallets in inventory</p>
                 </div>
               ) : activeTab === 'standard_boxes' ? tempStandardBoxes.length === 0 && (
                 <div className="p-12 text-center">
                    <BoxIcon size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No standard boxes configured</p>
                 </div>
               ) : null}
            </div>
           )}
          </div>
        </main>
      </div>
    </div>
  );
};
