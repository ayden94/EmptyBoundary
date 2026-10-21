import { EmptyData } from './EmptyData.js';

export function requireNonEmpty<T, Present extends T>(
  data: T,
  isNonEmpty: (value: T) => value is Present,
): Present;
export function requireNonEmpty<T>(
  data: T,
  isNonEmpty: (value: T) => boolean,
): T;
export function requireNonEmpty<T>(
  data: T,
  isNonEmpty: (value: T) => boolean,
): T {
  if (!isNonEmpty(data)) {
    throw new EmptyData();
  }

  return data;
}

export function isNonEmptyArray<T extends readonly unknown[]>(
  value: T,
): value is T & readonly [T[number], ...T[number][]] {
  return value.length > 0;
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
