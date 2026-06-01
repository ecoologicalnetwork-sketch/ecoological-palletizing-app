import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Box, StandardBox } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getBoxWeight = (box: Box | StandardBox): number => {
  return 'weight' in box ? box.weight : box.tareWeight;
};

export const getBoxSku = (box: Box | StandardBox): string => {
  return 'sku' in box ? box.sku : box.id;
};

export const getBoxColor = (box: Box | StandardBox): string => {
  return 'color' in box ? box.color || '#6366f1' : '#10b981'; // Green for standard boxes
};

export function formatInches(val: number) {
  return `${val.toFixed(2)}"`;
}

export function formatWeight(val: number) {
  return `${val.toFixed(1)} lbs`;
}
