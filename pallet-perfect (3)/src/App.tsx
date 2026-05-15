/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PackingDashboard } from './components/PackingDashboard';
import { AdminPanel } from './components/AdminPanel';
import { Box, PalletBase, SOSConfig } from './types';
import { SKU_LIBRARY, PALLET_LIBRARY } from './constants';
import { Settings } from 'lucide-react';

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [boxLibrary, setBoxLibrary] = useState<Box[]>(SKU_LIBRARY);
  const [palletLibrary, setPalletLibrary] = useState<PalletBase[]>(PALLET_LIBRARY);
  const [sosConfig, setSosConfig] = useState<SOSConfig>({
    apiKey: '',
    userId: '',
    accountId: '',
    environment: 'sandbox'
  });

  return (
    <div className="min-h-screen bg-black overflow-x-hidden selection:bg-amber-500 selection:text-black relative">
      {isAdminOpen ? (
        <AdminPanel 
          boxLibrary={boxLibrary}
          palletLibrary={palletLibrary}
          sosConfig={sosConfig}
          onUpdateBoxes={setBoxLibrary}
          onUpdatePallets={setPalletLibrary}
          onUpdateSOSConfig={setSosConfig}
          onClose={() => setIsAdminOpen(false)}
        />
      ) : (
        <>
          <PackingDashboard 
            boxLibrary={boxLibrary}
            palletLibrary={palletLibrary}
            sosConfig={sosConfig}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        </>
      )}
    </div>
  );
}
