import { Box, PackedItem, Pallet, Dimensions, Position } from '../types';
import { BUFFER, MAX_PALLET_HEIGHT, OVERHANG_GRACE } from '../constants';

/**
 * 3D Bin Packing Implementation for Pallet Perfect
 * Strategy: Layer-based Greedy Max-Out
 */

export function packPallets(
  boxesToPack: { box: Box; quantity: number }[],
  palletBases: Dimensions | Dimensions[]
): Pallet[] {
  const allBoxes: Box[] = [];
  boxesToPack.forEach(({ box, quantity }) => {
    for (let i = 0; i < quantity; i++) {
      allBoxes.push({
        ...box,
        dimensions: {
          length: box.dimensions.length + BUFFER,
          width: box.dimensions.width + BUFFER,
          height: box.dimensions.height + BUFFER,
        }
      });
    }
  });

  // Sort by footprint area (desc) predominantly to build a solid base, then weight
  allBoxes.sort((a, b) => {
    const areaA = a.dimensions.length * a.dimensions.width;
    const areaB = b.dimensions.length * b.dimensions.width;
    if (Math.abs(areaB - areaA) > 1) return areaB - areaA;
    return b.weight - a.weight;
  });

  const pallets: Pallet[] = [];
  let currentBoxes = [...allBoxes];
  let palletIndex = 1;

  const bases = Array.isArray(palletBases) ? palletBases : [palletBases];

  while (currentBoxes.length > 0) {
    const currentBase = bases[palletIndex - 1] || bases[bases.length - 1];
    const pallet: Pallet = {
      id: `pallet-${palletIndex++}`,
      name: `Pallet ${palletIndex - 1}`,
      dimensions: currentBase,
      tareWeight: 45,
      items: [],
      maxWeight: 2500,
    };

    let placedItems: PackedItem[] = [];
    const palletL = currentBase.length + OVERHANG_GRACE;
    const palletW = currentBase.width + OVERHANG_GRACE;

    // Try to pack each box into the best available spot on the pallet
    let i = 0;
    while (i < currentBoxes.length) {
      const box = currentBoxes[i];
      let placed = false;

      // We search for the best position (Lowest Z, then Lowest Y, then Lowest X)
      const potentialZ = Array.from(new Set([currentBase.height, ...placedItems.map(p => p.position.z + p.dimensions.height)]))
        .sort((a, b) => a - b);

      for (const z of potentialZ) {
        if (z + box.dimensions.height > MAX_PALLET_HEIGHT) continue;

        const potentialX = Array.from(new Set([0, ...placedItems.map(p => p.position.x), ...placedItems.map(p => p.position.x + p.dimensions.length)]))
          .filter(x => x + box.dimensions.length <= palletL)
          .sort((a, b) => a - b);
        
        const potentialY = Array.from(new Set([0, ...placedItems.map(p => p.position.y), ...placedItems.map(p => p.position.y + p.dimensions.width)]))
          .filter(y => y + box.dimensions.width <= palletW)
          .sort((a, b) => a - b);

        const orientations = [
          box.dimensions,
          { length: box.dimensions.width, width: box.dimensions.length, height: box.dimensions.height }
        ].filter((d, idx, self) => 
          idx === self.findIndex(o => o.length === d.length && o.width === d.width)
        );

        for (const dims of orientations) {
          if (z + dims.height > MAX_PALLET_HEIGHT) continue;

          const potentialX = Array.from(new Set([0, ...placedItems.map(p => p.position.x), ...placedItems.map(p => p.position.x + p.dimensions.length)]))
            .filter(x => x + dims.length <= palletL)
            .sort((a, b) => a - b);
          
          const potentialY = Array.from(new Set([0, ...placedItems.map(p => p.position.y), ...placedItems.map(p => p.position.y + p.dimensions.width)]))
            .filter(y => y + dims.width <= palletW)
            .sort((a, b) => a - b);

          for (const y of potentialY) {
            for (const x of potentialX) {
              const candidate: PackedItem = {
                id: Math.random().toString(36).substr(2, 9),
                box: box,
                position: { x, y, z },
                dimensions: dims,
                isScanned: false,
                layer: z,
                itemType: 'box'
              };

              // Check Collision
              const hasCollision = placedItems.some(item => overlaps(candidate, item));
              if (hasCollision) continue;

              // Check Support
              const isBase = z <= currentBase.height + 0.1;
              const itemsBelow = placedItems.filter(item => Math.abs((item.position.z + item.dimensions.height) - z) < 0.1);
              
              const currentSupport = isBase ? 1 : calculateSupportRatio(candidate, itemsBelow);

              if (isBase || currentSupport >= 0.55) {
                const compressed = compressToCorner(candidate, placedItems, palletL, palletW);
                
                if (!isBase && calculateSupportRatio(compressed, itemsBelow) < 0.55) continue;

                placedItems.push(compressed);
                currentBoxes.splice(i, 1);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
          if (placed) break;
        }
        if (placed) break;
      }

      if (!placed) {
        i++;
      }
    }

    pallet.items = placedItems;
    pallets.push(pallet);
    
    if (pallet.items.length === 0 && currentBoxes.length > 0) {
      console.error("Box too big for pallet", currentBoxes[0]);
      break; 
    }
  }

  return pallets;
}

/**
 * Repacks a pallet starting from a specific set of items and remaining items.
 * Used when a user manually moves a box and wants to recalculate everything above it.
 */
export function repackPallet(
  fixedItems: PackedItem[],
  boxesToPack: Box[],
  palletBaseDimensions: Dimensions
): PackedItem[] {
  let placedItems = [...fixedItems];
  const palletL = palletBaseDimensions.length + OVERHANG_GRACE;
  const palletW = palletBaseDimensions.width + OVERHANG_GRACE;
  let currentBoxes = [...boxesToPack];

  let i = 0;
  while (i < currentBoxes.length) {
    const box = currentBoxes[i];
    let placed = false;

    // We only look for Z levels AT OR ABOVE the lowest newly placing point? 
    // Actually, just find best fits given what's already there.
    const potentialZ = Array.from(new Set([palletBaseDimensions.height, ...placedItems.map(p => p.position.z + p.dimensions.height)]))
      .sort((a, b) => a - b);

    for (const z of potentialZ) {
      if (z + box.dimensions.height > MAX_PALLET_HEIGHT) continue;

      const orientations = [
        box.dimensions,
        { length: box.dimensions.width, width: box.dimensions.length, height: box.dimensions.height }
      ].filter((d, idx, self) => 
        idx === self.findIndex(o => o.length === d.length && o.width === d.width)
      );

      for (const dims of orientations) {
        const potentialX = Array.from(new Set([0, ...placedItems.map(p => p.position.x), ...placedItems.map(p => p.position.x + p.dimensions.length)]))
          .filter(x => x + dims.length <= palletL)
          .sort((a, b) => a - b);
        
        const potentialY = Array.from(new Set([0, ...placedItems.map(p => p.position.y), ...placedItems.map(p => p.position.y + p.dimensions.width)]))
          .filter(y => y + dims.width <= palletW)
          .sort((a, b) => a - b);

        for (const y of potentialY) {
          for (const x of potentialX) {
            const candidate: PackedItem = {
              id: Math.random().toString(36).substr(2, 9),
              box: box,
              position: { x, y, z },
              dimensions: dims,
              isScanned: false,
              layer: z,
              itemType: 'box'
            };

            if (placedItems.some(item => overlaps(candidate, item))) continue;

            const isBase = z <= palletBaseDimensions.height + 0.1;
            const itemsBelow = placedItems.filter(item => Math.abs((item.position.z + item.dimensions.height) - z) < 0.1);
            
            if (isBase || calculateSupportRatio(candidate, itemsBelow) >= 0.55) {
              const compressed = compressToCorner(candidate, placedItems, palletL, palletW);
              if (!isBase && calculateSupportRatio(compressed, itemsBelow) < 0.55) continue;

              placedItems.push(compressed);
              currentBoxes.splice(i, 1);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }
      if (placed) break;
    }

    if (!placed) i++;
  }

  return placedItems;
}

function compressToCorner(item: PackedItem, others: PackedItem[], palletL: number, palletW: number): PackedItem {
  let current = { ...item };
  let improved = true;
  const step = 0.5;

  while (improved) {
    improved = false;
    
    // Try sliding in X direction towards 0
    if (current.position.x > 0) {
      const nextX = Math.max(0, current.position.x - step);
      const testX = { ...current, position: { ...current.position, x: nextX } };
      
      const isBase = current.position.z <= 6;
      const itemsBelow = others.filter(i => Math.abs((i.position.z + i.dimensions.height) - current.position.z) < 0.1);

      if (!others.some(o => overlaps(testX, o)) && (isBase || calculateSupportRatio(testX, itemsBelow) >= 0.55)) {
        current = testX;
        improved = true;
      }
    }

    // Try sliding in Y direction towards 0
    if (current.position.y > 0) {
      const nextY = Math.max(0, current.position.y - step);
      const testY = { ...current, position: { ...current.position, y: nextY } };
      
      const isBase = current.position.z <= 6;
      const itemsBelow = others.filter(i => Math.abs((i.position.z + i.dimensions.height) - current.position.z) < 0.1);

      if (!others.some(o => overlaps(testY, o)) && (isBase || calculateSupportRatio(testY, itemsBelow) >= 0.55)) {
        current = testY;
        improved = true;
      }
    }
  }

  return current;
}

function overlaps(a: PackedItem, b: PackedItem): boolean {
  return (
    a.position.x < b.position.x + b.dimensions.length &&
    a.position.x + a.dimensions.length > b.position.x &&
    a.position.y < b.position.y + b.dimensions.width &&
    a.position.y + a.dimensions.width > b.position.y &&
    a.position.z < b.position.z + b.dimensions.height &&
    a.position.z + a.dimensions.height > b.position.z
  );
}

function calculateSupportRatio(item: PackedItem, itemsBelow: PackedItem[]): number {
  if (itemsBelow.length === 0) return 0;

  const boxRect = {
    x: item.position.x,
    y: item.position.y,
    l: item.dimensions.length,
    w: item.dimensions.width
  };

  let totalIntersectionArea = 0;
  for (const below of itemsBelow) {
    const belowRect = {
      x: below.position.x,
      y: below.position.y,
      l: below.dimensions.length,
      w: below.dimensions.width
    };
    totalIntersectionArea += getIntersectionArea(boxRect, belowRect);
  }

  const boxArea = boxRect.l * boxRect.w;
  return totalIntersectionArea / boxArea;
}

function getIntersectionArea(
  rect1: { x: number; y: number; l: number; w: number },
  rect2: { x: number; y: number; l: number; w: number }
): number {
  const x1 = Math.max(rect1.x, rect2.x);
  const y1 = Math.max(rect1.y, rect2.y);
  const x2 = Math.min(rect1.x + rect1.l, rect2.x + rect2.l);
  const y2 = Math.min(rect1.y + rect1.w, rect2.y + rect2.w);

  if (x2 > x1 && y2 > y1) {
    return (x2 - x1) * (y2 - y1);
  }
  return 0;
}
