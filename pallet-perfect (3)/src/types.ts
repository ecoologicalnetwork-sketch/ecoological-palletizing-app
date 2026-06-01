/**
 * Core types for the Pallet Perfect application.
 */

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Box {
  sku: string;
  name: string;
  dimensions: Dimensions;
  weight: number;
  color?: string;
}

export interface StandardBox {
  id: string;
  name: string;
  dimensions: Dimensions;
  weightCapacity: number;
  tareWeight: number;
}

export interface PackedItem {
  id: string;
  box: Box | StandardBox;
  position: Position;
  dimensions: Dimensions; // Includes buffer
  isScanned: boolean;
  layer: number;
  itemType?: 'box' | 'paper' | 'filler';
}

export interface PalletBase {
  id: string;
  name: string;
  dimensions: Dimensions;
  tareWeight: number;
  maxWeight: number;
}

export interface Pallet {
  id: string;
  name: string;
  dimensions: Dimensions;
  tareWeight: number;
  items: PackedItem[];
  maxWeight: number;
}

export interface SalesOrder {
  id: string;
  customer: string;
  items: {
    sku: string;
    quantity: number;
  }[];
}

export type BuildStep = 'input' | 'consolidation' | 'confirmation' | 'packing' | 'summary';

export interface SOSConfig {
  apiKey: string;
  userId: string;
  accountId: string;
  environment: 'production' | 'sandbox';
  maxPalletHeight?: number;
  maxPalletWidth?: number;
  maxPalletLength?: number;
  minSupportOverlap?: number;
}

export interface HistoricalLog {
  timestamp: string;
  soNumbers: string[];
  totalWeight: number;
  maxHeight: number;
  palletsCount: number;
  operator: string;
}
