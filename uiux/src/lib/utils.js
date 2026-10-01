import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Ghép class Tailwind, xử lý xung đột tiện ích. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
