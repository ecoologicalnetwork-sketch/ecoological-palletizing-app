import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInches(val: number) {
  return `${val.toFixed(2)}"`;
}

export function formatWeight(val: number) {
  return `${val.toFixed(1)} lbs`;
}
