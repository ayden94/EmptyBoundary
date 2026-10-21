import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EmptyData,
  isNonEmptyArray,
  isNonNullable,
  requireNonEmpty,
} from '@ayden94/empty-boundary';

test('requireNonEmpty: populated array -> preserves original reference', () => {
  const items = [{ id: 1 }];

  const result = requireNonEmpty(items, isNonEmptyArray);

  assert.equal(result, items);
  assert.equal(result[0].id, 1);
});

test('requireNonEmpty: empty array -> throws non Error EmptyData signal', () => {
  const items: readonly number[] = [];

  const run = () => requireNonEmpty(items, isNonEmptyArray);

  assert.throws(run, (value: unknown) =>
    value instanceof EmptyData && !(value instanceof Error));
});

for (const empty of [null, undefined]) {
  test(`requireNonEmpty: ${String(empty)} -> throws EmptyData`, () => {
    const value = empty;

    const run = () => requireNonEmpty(value, isNonNullable);

    assert.throws(run, (signal: unknown) => signal instanceof EmptyData);
  });
}

for (const value of [0, false, '']) {
  test(`requireNonEmpty: non nullable ${JSON.stringify(value)} -> preserves value`, () => {
    const input = value;

    const result = requireNonEmpty(input, isNonNullable);

    assert.equal(result, input);
  });
}

test('requireNonEmpty: custom nested empty criterion -> throws EmptyData', () => {
  const response = { items: [], total: 0 };

  const run = () => requireNonEmpty(response, (value) => value.items.length > 0);

  assert.throws(run, (signal: unknown) => signal instanceof EmptyData);
});

test('requireNonEmpty: custom predicate succeeds -> returns original object', () => {
  const user = { name: 'Ayden' };

  const result = requireNonEmpty(user, (value) => value.name.trim().length > 0);

  assert.equal(result, user);
});

test('requireNonEmpty: predicate throws -> propagates original exception', () => {
  const failure = new Error('predicate failed');
  const predicate = () => { throw failure; };

  const run = () => requireNonEmpty({}, predicate);

  assert.throws(run, (value: unknown) => value === failure);
});
