import {
  isNonEmptyArray,
  isNonNullable,
  requireNonEmpty,
} from '@ayden94/empty-boundary';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

function expectType<T extends true>(value: T): void {
  void value;
}

type User = { readonly name: string };
type Response =
  | { readonly kind: 'empty' }
  | { readonly kind: 'present'; readonly user: User };

// tsc로만 검증한다. boolean 판정을 타입 가드로 취급하지 않는지도 확인한다.
export function verifyNarrowing(
  user: User | null | undefined,
  items: readonly User[],
  response: Response,
  falsy: 0 | false | null,
): void {
  const presentUser = requireNonEmpty(user, isNonNullable);
  expectType<Equal<typeof presentUser, User>>(true);

  const presentItems = requireNonEmpty(items, isNonEmptyArray);
  expectType<typeof presentItems extends readonly [User, ...User[]] ? true : false>(true);
  const first: User = presentItems[0];
  void first;

  const presentResponse = requireNonEmpty(
    response,
    (value): value is Extract<Response, { kind: 'present' }> =>
      value.kind === 'present',
  );
  expectType<Equal<typeof presentResponse, Extract<Response, { kind: 'present' }>>>(true);

  const booleanPredicate = (value: User | null | undefined): boolean =>
    value !== null && value !== undefined;
  const unrefinedUser = requireNonEmpty(user, booleanPredicate);
  expectType<Equal<typeof unrefinedUser, User | null | undefined>>(true);

  const nonNullableFalsy = requireNonEmpty(falsy, isNonNullable);
  expectType<Equal<typeof nonNullableFalsy, 0 | false>>(true);
}
