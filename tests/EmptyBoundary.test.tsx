import {
  EmptyBoundary,
  EmptyData,
  isNonEmptyArray,
  requireNonEmpty,
} from '@ayden94/empty-boundary';
import type { EmptyBoundaryFallbackProps } from '@ayden94/empty-boundary';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { Component, Suspense, act, createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

class ErrorBoundary extends Component<{
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}, { readonly failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function fixture(context: TestContext) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const caught: unknown[] = [];
  const root = createRoot(container, {
    onCaughtError: (value: unknown) => { caught.push(value); },
  });

  context.after(async () => {
    await act(() => root.unmount());
    container.remove();
  });

  return { container, caught, root };
}

function ThrowValue({ value }: { readonly value: unknown }): never {
  throw value;
}

test('EmptyBoundary: EmptyData signal -> renders static fallback', async (context) => {
  const { root, container, caught } = fixture(context);
  const signal = new EmptyData();

  await act(() => root.render(
    <EmptyBoundary fallback={<p data-state="empty" />}>
      <ThrowValue value={signal} />
    </EmptyBoundary>,
  ));

  assert.ok(container.querySelector('[data-state="empty"]'));
  assert.equal(caught.at(-1), signal);
});

test('EmptyBoundary: undefined fallback -> propagates original signal to parent', async (context) => {
  const { root, container, caught } = fixture(context);
  const signal = new EmptyData();

  await act(() => root.render(
    <ErrorBoundary fallback={<p data-state="outer-error" />}>
      <EmptyBoundary fallback={undefined}>
        <ThrowValue value={signal} />
      </EmptyBoundary>
    </ErrorBoundary>,
  ));

  assert.ok(container.querySelector('[data-state="outer-error"]'));
  assert.equal(caught.at(-1), signal);
});

test('EmptyBoundary: null fallback -> renders an intentionally empty view', async (context) => {
  const { root, container, caught } = fixture(context);
  const signal = new EmptyData();

  await act(() => root.render(
    <EmptyBoundary fallback={null}>
      <ThrowValue value={signal} />
    </EmptyBoundary>,
  ));

  assert.equal(container.childNodes.length, 0);
  assert.equal(caught.at(-1), signal);
});

for (const { label, value } of [
  { label: 'Error', value: new Error('render failure') },
  { label: 'plain object', value: { code: 'FAILURE' } },
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
  { label: 'zero', value: 0 },
  { label: 'false', value: false },
  { label: 'empty string', value: '' },
]) {
  test(`EmptyBoundary: ${label} thrown -> propagates to outer boundary`, async (context) => {
    const { root, container, caught } = fixture(context);
    const inner = (
      <EmptyBoundary fallback={<p data-state="empty" />}>
        <ThrowValue value={value} />
      </EmptyBoundary>
    );

    await act(() => root.render(
      <ErrorBoundary fallback={<p data-state="outer-error" />}>
        {inner}
      </ErrorBoundary>,
    ));

    assert.ok(container.querySelector('[data-state="outer-error"]'));
    assert.equal(container.querySelector('[data-state="empty"]'), null);
    assert.equal(caught.at(-1), value);
  });
}

test('EmptyBoundary: fallback reset after cause changes -> renders children', async (context) => {
  const { root, container } = fixture(context);
  let empty = true;
  function Content() {
    requireNonEmpty('ready', () => !empty);
    return createElement('p', { 'data-state': 'present' });
  }
  await act(() => root.render(
    <EmptyBoundary
      onReset={() => { empty = false; }}
      fallback={({ reset }: EmptyBoundaryFallbackProps) =>
        <button onClick={reset} type="button" />}
    >
      <Content />
    </EmptyBoundary>,
  ));
  const button = container.querySelector('button');
  assert.ok(button);

  await act(() => button.click());

  assert.ok(container.querySelector('[data-state="present"]'));
  assert.equal(container.querySelector('button'), null);
});

test('EmptyBoundary: changed data resetKey -> recovers from empty fallback', async (context) => {
  const { root, container } = fixture(context);
  let resets = 0;
  function Items({ data }: { readonly data: readonly string[] }) {
    requireNonEmpty(data, isNonEmptyArray);
    return createElement('p', { 'data-state': 'present' });
  }
  function tree(data: readonly string[]) {
    return (
      <EmptyBoundary
        resetKeys={[data]}
        onReset={() => { resets += 1; }}
        fallback={<p data-state="empty" />}
      >
        <Items data={data} />
      </EmptyBoundary>
    );
  }
  await act(() => root.render(tree([])));

  await act(() => root.render(tree(['ready'])));

  assert.ok(container.querySelector('[data-state="present"]'));
  assert.equal(resets, 1);
});

for (const failure of [new Error('fallback failure'), new EmptyData()]) {
  test(`EmptyBoundary: fallback throws ${failure.constructor.name} -> propagates to parent`, async (context) => {
    const { root, container, caught } = fixture(context);
    const inner = (
      <EmptyBoundary fallback={() => { throw failure; }}>
        <ThrowValue value={new EmptyData()} />
      </EmptyBoundary>
    );

    await act(() => root.render(
      <ErrorBoundary fallback={<p data-state="outer-error" />}>
        {inner}
      </ErrorBoundary>,
    ));

    assert.ok(container.querySelector('[data-state="outer-error"]'));
    assert.equal(caught.at(-1), failure);
  });
}

test('EmptyBoundary: new empty result and resetKey together -> does not reset immediately', async (context) => {
  const { root, container } = fixture(context);
  let resets = 0;
  function Content({ empty }: { readonly empty: boolean }) {
    requireNonEmpty('ready', () => !empty);
    return <p data-state="present" />;
  }
  function tree(empty: boolean) {
    return (
      <EmptyBoundary
        resetKeys={[empty]}
        onReset={() => { resets += 1; }}
        fallback={<p data-state="empty" />}
      >
        <Content empty={empty} />
      </EmptyBoundary>
    );
  }
  await act(() => root.render(tree(false)));

  await act(() => root.render(tree(true)));

  assert.ok(container.querySelector('[data-state="empty"]'));
  assert.equal(resets, 0);
});

test('EmptyBoundary: unchanged resetKeys -> keeps fallback after children change', async (context) => {
  const { root, container } = fixture(context);
  function Content({ empty }: { readonly empty: boolean }) {
    requireNonEmpty('ready', () => !empty);
    return <p data-state="present" />;
  }
  function tree(empty: boolean) {
    return (
      <EmptyBoundary resetKeys={[NaN]} fallback={<p data-state="empty" />}>
        <Content empty={empty} />
      </EmptyBoundary>
    );
  }
  await act(() => root.render(tree(true)));

  await act(() => root.render(tree(false)));

  assert.ok(container.querySelector('[data-state="empty"]'));
  assert.equal(container.querySelector('[data-state="present"]'), null);
});

test('EmptyBoundary: pending promise -> delegates loading to Suspense', async (context) => {
  const { root, container } = fixture(context);
  const deferred = Promise.withResolvers<void>();
  let ready = false;
  function Content() {
    if (!ready) {
      throw deferred.promise;
    }
    return createElement('p', { 'data-state': 'present' });
  }
  await act(() => root.render(
    <Suspense fallback={<p data-state="loading" />}>
      <EmptyBoundary fallback={<p data-state="empty" />}>
        <Content />
      </EmptyBoundary>
    </Suspense>,
  ));
  assert.ok(container.querySelector('[data-state="loading"]'));

  await act(async () => {
    ready = true;
    deferred.resolve();
    await deferred.promise;
  });

  assert.ok(container.querySelector('[data-state="present"]'));
  assert.equal(container.querySelector('[data-state="empty"]'), null);
});
