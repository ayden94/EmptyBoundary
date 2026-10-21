'use client';

import { ErrorBoundary } from '@suspensive/react';
import type { FunctionComponent, ReactNode } from 'react';
import { EmptyData } from './EmptyData.js';

export type EmptyBoundaryFallbackProps = {
  readonly reset: () => void;
};

export type EmptyBoundaryProps = {
  readonly children: ReactNode;
  readonly fallback: ReactNode | FunctionComponent<EmptyBoundaryFallbackProps>;
  readonly resetKeys?: unknown[];
  readonly onReset?: () => void;
};

const isEmptyData = (value: unknown) => value instanceof EmptyData;

export function EmptyBoundary({
  children,
  fallback,
  resetKeys,
  onReset,
}: EmptyBoundaryProps) {
  return (
    <ErrorBoundary
      shouldCatch={isEmptyData}
      fallback={fallback}
      resetKeys={resetKeys}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}
