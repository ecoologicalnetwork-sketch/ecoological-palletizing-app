import { Box, StandardBox, PackedItem, Pallet, Dimensions, Position } from '../types';
import { BUFFER, MAX_PALLET_HEIGHT, OVERHANG_GRACE } from '../constants';

const getWeight = (box: Box | StandardBox): number => 'weight' in box ? box.weight : box.tareWeight;

/**
 * 3D Bin Packing Implementation for Pallet Perfect
 * Strategy: Layer-based Greedy Max-Out
 */

/**
 * Gets all unique orientations for a box, sorted by preference.
 * Preference: "Laid down on longest side" (largest dimension horizontal).
 */
function getOrientations(dims: Dimensions): Dimensions[] {
  const { length: l, width: w, height: h } = dims;
  const all = [
    { length: l, width: w, height: h },
    { length: w, width: l, height: h },
    { length: l, width: h, height: w },
    { length: h, width: l, height: w },
    { length: w, width: h, height: l },
    { length: h, width: w, height: l },
  ];

  // Filter unique dimensions
  const unique = all.filter((d, idx, self) => 
    idx === self.findIndex(o => o.length === d.length && o.width === d.width && o.height === d.height)
  );

  const maxDim = Math.max(l, w, h);

  // Sort by preference
  unique.sort((a, b) => {
    // Preference 1: Longest side is horizontal
    const aLongestHorizontal = Math.max(a.length, a.width) === maxDim;
    const bLongestHorizontal = Math.max(b.length, b.width) === maxDim;
    
    if (aLongestHorizontal && !bLongestHorizontal) return -1;
    if (!aLongestHorizontal && bLongestHorizontal) return 1;
    
    // Preference 2: Lowest height (stability)
    if (a.height !== b.height) return a.height - b.height;
    
    // Preference 3: Shorter length (compactness in corner)
    return a.length - b.length;
  });

  return unique;
}

export function packPallets(
  boxesToPack: { box: Box | StandardBox; quantity: number }[],
  palletBases: Dimensions | Dimensions[],
  maxPalletHeight?: number,
  maxPalletWidth?: number,
  maxPalletLength?: number,
  minSupportOverlap?: number
): Pallet[] {
  const finalMaxHeight = maxPalletHeight && maxPalletHeight > 0 ? maxPalletHeight : 99999;
  const finalMaxWidth = maxPalletWidth && maxPalletWidth > 0 ? maxPalletWidth : 99999;
  const finalMaxLength = maxPalletLength && maxPalletLength > 0 ? maxPalletLength : 99999;

  const allBoxes: (Box | StandardBox)[] = [];
  boxesToPack.forEach(({ box, quantity }) => {
    for (let i = 0; i < quantity; i++) {
      allBoxes.push({
        ...box,
        dimensions: {
          length: box.dimensions.length + BUFFER,
          width: box.dimensions.width + BUFFER,
          height: box.dimensions.height + BUFFER,
        }
      } as any);
    }
  });

  // Sort by footprint area (desc) predominantly to build a solid base, then weight
  allBoxes.sort((a, b) => {
    const areaA = a.dimensions.length * a.dimensions.width;
    const areaB = b.dimensions.length * b.dimensions.width;
    if (Math.abs(areaB - areaA) > 1) return areaB - areaA;
    return getWeight(b) - getWeight(a);
  });

  const bases = Array.isArray(palletBases) ? palletBases : [palletBases];

  // Pass 1: Try packing ONLY laid down
  const resultLaidDown = runPack(allBoxes, bases, finalMaxHeight, finalMaxWidth, finalMaxLength, true, minSupportOverlap);
  // Pass 2: Try packing with all orientations allowed (standing on end allowed)
  const resultAll = runPack(allBoxes, bases, finalMaxHeight, finalMaxWidth, finalMaxLength, false, minSupportOverlap);

  const totalItemCount = allBoxes.length;
  const laidDownPackedCount = resultLaidDown.reduce((sum, p) => sum + p.items.length, 0);
  const allPackedCount = resultAll.reduce((sum, p) => sum + p.items.length, 0);

  // If Laid Down successfully packed all boxes AND used the same or fewer pallets, select it!
  // Otherwise, use All Orientations (which permits standing on end)
  if (laidDownPackedCount === totalItemCount && resultLaidDown.length <= resultAll.length) {
    return resultLaidDown;
  }
  return resultAll;
}

function runPack(
  allBoxes: (Box | StandardBox)[],
  bases: Dimensions[],
  maxPalletHeight: number,
  maxPalletWidth: number,
  maxPalletLength: number,
  laidDownOnly: boolean,
  minSupportOverlap?: number
): Pallet[] {
  const finalMinSupportOverlap = minSupportOverlap !== undefined && minSupportOverlap >= 0 ? minSupportOverlap / 100 : 0.55;
  const pallets: Pallet[] = [];
  let currentBoxes = [...allBoxes];
  let palletIndex = 1;

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
    const palletL = Math.min(currentBase.length + OVERHANG_GRACE, maxPalletLength);
    const palletW = Math.min(currentBase.width + OVERHANG_GRACE, maxPalletWidth);

    // Try to pack each box into the best available spot on the pallet
    let i = 0;
    while (i < currentBoxes.length) {
      const box = currentBoxes[i];
      let placed = false;

      // We search for the best position (Lowest Z, then Lowest Y, then Lowest X)
      const potentialZ = Array.from(new Set([currentBase.height, ...placedItems.map(p => p.position.z + p.dimensions.height)]))
        .sort((a, b) => a - b);

      for (const z of potentialZ) {
        const minHeight = Math.min(box.dimensions.length, box.dimensions.width, box.dimensions.height);
        if (z + minHeight > maxPalletHeight) continue;

        let orientations = getOrientations(box.dimensions);
        if (laidDownOnly) {
          const maxDim = Math.max(box.dimensions.length, box.dimensions.width, box.dimensions.height);
          orientations = orientations.filter(dims => Math.max(dims.length, dims.width) >= maxDim - 0.1);
        }

        for (const dims of orientations) {
          if (z + dims.height > maxPalletHeight) continue;

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

              if (isBase || currentSupport >= finalMinSupportOverlap) {
                const compressed = compressToCorner(candidate, placedItems, palletL, palletW, currentBase.height, finalMinSupportOverlap);
                
                if (!isBase && calculateSupportRatio(compressed, itemsBelow) < finalMinSupportOverlap) continue;

                const compIsBase = compressed.position.z <= currentBase.height + 0.1;
                const unsafeStack = !compIsBase && getUnstableDepth(compressed, placedItems, currentBase.height) >= 1 && countLateralTouches(compressed, placedItems) === 0;

                if (unsafeStack) {
                  continue;
                }

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
  boxesToPack: (Box | StandardBox)[],
  palletBaseDimensions: Dimensions,
  maxPalletHeight?: number,
  maxPalletWidth?: number,
  maxPalletLength?: number,
  minSupportOverlap?: number
): PackedItem[] {
  const finalMaxHeight = maxPalletHeight && maxPalletHeight > 0 ? maxPalletHeight : 99999;
  const finalMaxWidth = maxPalletWidth && maxPalletWidth > 0 ? maxPalletWidth : 99999;
  const finalMaxLength = maxPalletLength && maxPalletLength > 0 ? maxPalletLength : 99999;

  // Pass 1: Try laid down only
  const laidDown = runRepack(fixedItems, boxesToPack, palletBaseDimensions, finalMaxHeight, finalMaxWidth, finalMaxLength, true, minSupportOverlap);
  // Pass 2: Try all orientations
  const all = runRepack(fixedItems, boxesToPack, palletBaseDimensions, finalMaxHeight, finalMaxWidth, finalMaxLength, false, minSupportOverlap);

  const totalItemCount = fixedItems.length + boxesToPack.length;
  if (laidDown.length === totalItemCount) {
    return laidDown;
  }
  return all;
}

function runRepack(
  fixedItems: PackedItem[],
  boxesToPack: (Box | StandardBox)[],
  palletBaseDimensions: Dimensions,
  maxPalletHeight: number,
  maxPalletWidth: number,
  maxPalletLength: number,
  laidDownOnly: boolean,
  minSupportOverlap?: number
): PackedItem[] {
  const finalMinSupportOverlap = minSupportOverlap !== undefined && minSupportOverlap >= 0 ? minSupportOverlap / 100 : 0.55;
  let placedItems = [...fixedItems];
  const palletL = Math.min(palletBaseDimensions.length + OVERHANG_GRACE, maxPalletLength);
  const palletW = Math.min(palletBaseDimensions.width + OVERHANG_GRACE, maxPalletWidth);
  let currentBoxes = [...boxesToPack];

  let i = 0;
  while (i < currentBoxes.length) {
    const box = currentBoxes[i];
    let placed = false;

    const potentialZ = Array.from(new Set([palletBaseDimensions.height, ...placedItems.map(p => p.position.z + p.dimensions.height)]))
      .sort((a, b) => a - b);

    for (const z of potentialZ) {
      const minHeight = Math.min(box.dimensions.length, box.dimensions.width, box.dimensions.height);
      if (z + minHeight > maxPalletHeight) continue;

      let orientations = getOrientations(box.dimensions);
      if (laidDownOnly) {
        const maxDim = Math.max(box.dimensions.length, box.dimensions.width, box.dimensions.height);
        orientations = orientations.filter(dims => Math.max(dims.length, dims.width) >= maxDim - 0.1);
      }

      for (const dims of orientations) {
        if (z + dims.height > maxPalletHeight) continue;

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
            
            if (isBase || calculateSupportRatio(candidate, itemsBelow) >= finalMinSupportOverlap) {
              const compressed = compressToCorner(candidate, placedItems, palletL, palletW, palletBaseDimensions.height, finalMinSupportOverlap);
              if (!isBase && calculateSupportRatio(compressed, itemsBelow) < finalMinSupportOverlap) continue;

              const compIsBase = compressed.position.z <= palletBaseDimensions.height + 0.1;
              const unsafeStack = !compIsBase && getUnstableDepth(compressed, placedItems, palletBaseDimensions.height) >= 1 && countLateralTouches(compressed, placedItems) === 0;

              if (unsafeStack) {
                continue;
              }

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

function compressToCorner(
  item: PackedItem,
  others: PackedItem[],
  palletL: number,
  palletW: number,
  baseHeight: number,
  finalMinSupportOverlap: number
): PackedItem {
  let current = { ...item };
  let improved = true;
  const step = 0.5;

  while (improved) {
    improved = false;
    
    // Try sliding in X direction towards 0
    if (current.position.x > 0) {
      const nextX = Math.max(0, current.position.x - step);
      const testX = { ...current, position: { ...current.position, x: nextX } };
      
      const isBase = current.position.z <= baseHeight + 0.1;
      const itemsBelow = others.filter(i => Math.abs((i.position.z + i.dimensions.height) - current.position.z) < 0.1);

      if (!others.some(o => overlaps(testX, o)) && (isBase || calculateSupportRatio(testX, itemsBelow) >= finalMinSupportOverlap)) {
        current = testX;
        improved = true;
      }
    }

    // Try sliding in Y direction towards 0
    if (current.position.y > 0) {
      const nextY = Math.max(0, current.position.y - step);
      const testY = { ...current, position: { ...current.position, y: nextY } };
      
      const isBase = current.position.z <= baseHeight + 0.1;
      const itemsBelow = others.filter(i => Math.abs((i.position.z + i.dimensions.height) - current.position.z) < 0.1);

      if (!others.some(o => overlaps(testY, o)) && (isBase || calculateSupportRatio(testY, itemsBelow) >= finalMinSupportOverlap)) {
        current = testY;
        improved = true;
      }
    }
  }

  return current;
}

function overlapsInXY(a: PackedItem, b: PackedItem): boolean {
  return (
    a.position.x < b.position.x + b.dimensions.length &&
    a.position.x + a.dimensions.length > b.position.x &&
    a.position.y < b.position.y + b.dimensions.width &&
    a.position.y + a.dimensions.width > b.position.y
  );
}

function getUnstableDepth(item: PackedItem, placedItems: PackedItem[], baseHeight: number): number {
  const itemsBelow = placedItems.filter(p => Math.abs((p.position.z + p.dimensions.height) - item.position.z) < 0.1);
  if (itemsBelow.length === 0) return 0;
  
  let bestBelow: PackedItem | null = null;
  let maxOverlap = 0;
  const boxRect = {
    x: item.position.x,
    y: item.position.y,
    l: item.dimensions.length,
    w: item.dimensions.width
  };
  
  for (const p of itemsBelow) {
    const pRect = {
      x: p.position.x,
      y: p.position.y,
      l: p.dimensions.length,
      w: p.dimensions.width
    };
    const overlap = getIntersectionArea(boxRect, pRect);
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestBelow = p;
    }
  }
  
  if (!bestBelow) return 0;
  
  const isStable = (
    bestBelow.position.z <= baseHeight + 0.1 ||
    bestBelow.dimensions.length * bestBelow.dimensions.width >= 150 ||
    countLateralTouches(bestBelow, placedItems) > 0
  );
  
  if (isStable) return 0;
  
  return 1 + getUnstableDepth(bestBelow, placedItems, baseHeight);
}

function countLateralTouches(item: PackedItem, others: PackedItem[]): number {
  let count = 0;
  
  for (const o of others) {
    if (o.id === item.id) continue;
    
    // Check if Z intervals overlap to touch laterally
    const zOverlap = (
      item.position.z < o.position.z + o.dimensions.height &&
      item.position.z + item.dimensions.height > o.position.z
    );
    if (!zOverlap) continue;

    // Check adjacent on X (sharing a vertical boundary on X, overlapping on Y)
    const yOverlap = (
      item.position.y < o.position.y + o.dimensions.width &&
      item.position.y + item.dimensions.width > o.position.y
    );
    if (yOverlap) {
      // Adjacent on left: o.x + o.length is close to item.x
      if (Math.abs((o.position.x + o.dimensions.length) - item.position.x) < 0.1) {
        count++;
        continue;
      }
      // Adjacent on right: item.x + item.length is close to o.x
      if (Math.abs((item.position.x + item.dimensions.length) - o.position.x) < 0.1) {
        count++;
        continue;
      }
    }

    // Check adjacent on Y (sharing a vertical boundary on Y, overlapping on X)
    const xOverlap = (
      item.position.x < o.position.x + o.dimensions.length &&
      item.position.x + item.dimensions.length > o.position.x
    );
    if (xOverlap) {
      // Adjacent on front: o.y + o.width is close to item.y
      if (Math.abs((o.position.y + o.dimensions.width) - item.position.y) < 0.1) {
        count++;
        continue;
      }
      // Adjacent on back: item.y + item.width is close to o.y
      if (Math.abs((item.position.y + item.dimensions.width) - o.position.y) < 0.1) {
        count++;
        continue;
      }
    }
  }

  return count;
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
