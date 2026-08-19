import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function nanoid(size: number = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(size);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < size; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function formatGuarani(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "G$ 0";
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return "G$ 0";
  return `G$ ${Math.round(num).toLocaleString("pt-BR")}`;
}
