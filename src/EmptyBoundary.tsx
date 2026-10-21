'use client';

import { Component } from 'react';
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

type EmptyBoundaryState =
  | { readonly hasError: false; readonly error: null }
  | { readonly hasError: true; readonly error: unknown };

class BaseEmptyBoundary extends Component<EmptyBoundaryProps, EmptyBoundaryState> {
  override state: EmptyBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): EmptyBoundaryState {
    return { hasError: true, error };
  }

  override componentDidUpdate(
    previousProps: EmptyBoundaryProps,
    previousState: EmptyBoundaryState,
  ) {
    if (!this.state.hasError || !previousState.hasError) {
      return;
    }

    const previousKeys = previousProps.resetKeys ?? [];
    const nextKeys = this.props.resetKeys ?? [];
    if (
      previousKeys.length !== nextKeys.length ||
      previousKeys.some((value, index) => !Object.is(value, nextKeys[index]))
    ) {
      this.reset();
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (!(this.state.error instanceof EmptyData)) {
      throw this.state.error;
    }

    const Fallback = this.props.fallback;
    if (Fallback === undefined) {
      throw this.state.error;
    }

    return typeof Fallback === 'function'
      ? <Fallback reset={this.reset} />
      : Fallback;
  }
}

export function EmptyBoundary(props: EmptyBoundaryProps) {
  return <BaseEmptyBoundary {...props} />;
}
