import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveFileUrl(url: string) {
  if (!url) return '';
  return url.replace('http://backend:5000', 'http://localhost:5000');
}
