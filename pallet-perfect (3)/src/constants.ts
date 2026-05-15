import { Box, Pallet, Dimensions, PalletBase } from './types';

export const BUFFER = 0.125; // 1/8 inch
export const OVERHANG_GRACE = 0.75; // 3/4 inch
export const MAX_PALLET_HEIGHT = 92; // inches

export const PALLET_LIBRARY: PalletBase[] = [
  { id: 'STD-4840', name: 'Standard GMA (48x40)', dimensions: { length: 48, width: 40, height: 5.5 }, tareWeight: 50, maxWeight: 2500 },
  { id: 'SQ-4242', name: 'Square Industrial (42x42)', dimensions: { length: 42, width: 42, height: 5.5 }, tareWeight: 45, maxWeight: 2200 },
  { id: 'EU-1200', name: 'Euro Pallet (1200x800)', dimensions: { length: 47.2, width: 31.5, height: 5.5 }, tareWeight: 55, maxWeight: 3300 },
];

export const SKU_LIBRARY: Box[] = [
  { sku: 'SH-FL-001', name: 'Fender Flare Box A', dimensions: { length: 24, width: 12, height: 10 }, weight: 15, color: '#3b82f6' },
  { sku: 'SH-BR-002', name: 'Brush Guard Large', dimensions: { length: 36, width: 18, height: 12 }, weight: 45, color: '#ef4444' },
  { sku: 'SH-WS-003', name: 'Windshield Guard', dimensions: { length: 40, width: 8, height: 6 }, weight: 12, color: '#10b981' },
  { sku: 'SH-SM-004', name: 'Small Parts Box', dimensions: { length: 12, width: 12, height: 8 }, weight: 8, color: '#f59e0b' },
  { sku: 'SH-XL-005', name: 'Oversize Panel B', dimensions: { length: 46, width: 20, height: 4 }, weight: 35, color: '#8b5cf6' },
  { sku: 'SH-MD-006', name: 'Standard Medium Box', dimensions: { length: 18, width: 18, height: 12 }, weight: 22, color: '#ec4899' },
  { sku: 'BT1001', name: 'Body Trim Box', dimensions: { length: 32, width: 12, height: 12 }, weight: 18, color: '#06b6d4' },
  { sku: 'DT1001', name: 'Door Trim Box', dimensions: { length: 20, width: 10, height: 10 }, weight: 14, color: '#84cc16' },
  { sku: 'MGT02', name: 'Mounting Gear Kit', dimensions: { length: 7, width: 5, height: 5 }, weight: 5, color: '#f43f5e' },
  { sku: 'GU1001', name: 'Guard Unit Box', dimensions: { length: 16, width: 9, height: 4 }, weight: 9, color: '#6366f1' },
  { sku: 'FF2001', name: 'Fender Flare FF-Type', dimensions: { length: 28, width: 15, height: 9 }, weight: 26, color: '#14b8a6' },
];

export const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f43f5e', '#6366f1', '#14b8a6', '#f97316'
];
