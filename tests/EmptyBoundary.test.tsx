import {
  EmptyBoundary,
  EmptyData,
  isNonEmptyArray,
  requireNonEmpty,
} from '@ayden94/empty-boundary';
import type { EmptyBoundaryFallbackProps } from '@ayden94/empty-boundary';
import { ErrorBoundary, Suspense } from '@suspensive/react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

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

for (const { label, value } of [
  { label: 'Error', value: new Error('render failure') },
  { label: 'plain object', value: { code: 'FAILURE' } },
  { label: 'null', value: null },
  { label: 'undefined', value: undefined },
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

test('EmptyBoundary: fallback throws -> propagates fallback failure to parent', async (context) => {
  const { root, container, caught } = fixture(context);
  const failure = new Error('fallback failure');
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
