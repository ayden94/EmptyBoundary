# EmptyBoundary

React만으로 동작하는 빈 상태 경계입니다.
조회 성공 데이터가 비어 있을 때 `EmptyData` 신호를 던져
상위 `EmptyBoundary`에서 빈 화면을 렌더링합니다.

- ESM 패키지와 TypeScript 선언 파일 제공
- React 19만 peer dependency로 사용
- 타입 가드 기반 반환 타입 좁히기
- Suspensive와 Query 라이브러리에 의존하지 않음
- GitHub 공개 저장소이며 npm registry에는 게시하지 않음

## 개발

Node.js 24와 pnpm을 사용합니다.

```bash
corepack enable
pnpm install
pnpm check
pnpm pack
```

`pnpm check`는 lint, 빌드, 런타임 테스트, strict 타입 검사를 실행합니다.
런타임 테스트는 빌드된 패키지의 공개 export를 사용하며,
실제 React 렌더링으로 포착·전파·복구·Suspense 연계를 확인합니다.
CI에서도 같은 명령과 tarball 생성을 검증합니다.

## 패키지 설치

이 저장소에서 먼저 빌드한 뒤 로컬 프로젝트에 설치할 수 있습니다.

```bash
# EmptyBoundary 폴더
pnpm build

# 사용하는 프로젝트 폴더
pnpm add file:../EmptyBoundary
```

다른 환경에는 `pnpm pack`으로 생성한
`ayden94-empty-boundary-0.1.0.tgz`를 전달해 설치할 수 있습니다.

```bash
pnpm add /path/to/ayden94-empty-boundary-0.1.0.tgz
```

소비 프로젝트에는 peer dependency인 `react`가 필요합니다.
패키지는 외부 라이브러리를 번들에 포함하지 않으며 `dist`와 README만 배포합니다.
로컬 파일 의존성을 사용하다 패키지를 수정했다면 다시 빌드하고 소비 프로젝트에서 재설치합니다.

## 기본 사용법

```tsx
import {
  EmptyBoundary,
  isNonEmptyArray,
  requireNonEmpty,
} from '@ayden94/empty-boundary';

type Item = { readonly id: number; readonly name: string };

function ItemList({ data }: { readonly data: readonly Item[] }) {
  const items = requireNonEmpty(data, isNonEmptyArray);
  return <p>첫 항목: {items[0].name}</p>;
}

function Items({ data }: { readonly data: readonly Item[] }) {
  return (
    <EmptyBoundary fallback={<p>항목이 없습니다.</p>} resetKeys={[data]}>
      <ItemList data={data} />
    </EmptyBoundary>
  );
}
```

판정 함수는 **`isNonEmpty` 방향**입니다. true면 데이터를 그대로 반환하고
false면 Error를 상속하지 않는 `EmptyData` 인스턴스를 던집니다.
`EmptyBoundary`는 이 인스턴스만 포착하며 다른 예외는 상위 ErrorBoundary로 전달합니다.
내부 React 클래스 경계가 포착과 초기화를 직접 처리합니다.

## API

### `requireNonEmpty(data, isNonEmpty)`

타입 가드를 넘기면 해당 타입으로 좁힙니다.
boolean만 반환하는 함수는 런타임 판정만 수행하고 반환 타입은 유지합니다.

```tsx
const items = requireNonEmpty(data, isNonEmptyArray);
// 원래 배열 타입과 readonly [Item, ...Item[]]의 교차 타입
// noUncheckedIndexedAccess에서도 items[0]은 undefined가 아님

const user = requireNonEmpty(nullableUser, isNonNullable);
// null과 undefined를 제외

const result = requireNonEmpty(
  response,
  (value): value is PresentResponse => value.kind === 'present',
);
// PresentResponse

const text = requireNonEmpty(input, (value) => value.trim().length > 0);
// string — boolean 판정으로 임의의 non-empty string 타입을 만들지 않음
```

타입 가드의 정확성은 작성자의 책임입니다.
배열은 복사하거나 동결하지 않으므로 다른 참조에서 배열을 변경하지 않아야 합니다.

### `isNonEmptyArray`

배열 길이가 0보다 큰지 확인하고 첫 요소가 있는 배열로 좁힙니다.
읽기 전용 배열과 일반 배열을 모두 지원합니다.

### `isNonNullable`

null과 undefined만 제외합니다. `0`, `false`, `''`는 유효한 값으로 유지합니다.

### `EmptyBoundary`

| prop | 설명 |
| --- | --- |
| `children` | EmptyData를 던질 수 있는 자식 |
| `fallback` | ReactNode 또는 `({ reset }) => ReactNode` 형태의 컴포넌트 |
| `resetKeys` | 요소가 달라지면 빈 경계를 초기화하는 키 배열 |
| `onReset` | 수동 또는 키 변경 초기화 시 호출하는 콜백 |

`fallback={null}`은 의도적으로 아무 UI도 표시하지 않습니다.
fallback이 undefined이면 원래 EmptyData를 상위 오류 경계로 전달합니다.

```tsx
<EmptyBoundary
  resetKeys={[data]}
  fallback={({ reset }) => (
    <div>
      <p>표시할 데이터가 없습니다.</p>
      <button onClick={reset}>다시 확인</button>
    </div>
  )}
>
  <Content data={data} />
</EmptyBoundary>
```

reset은 캐시를 변경하거나 재조회하지 않습니다.
빈 원인이 그대로라면 다시 빈 화면이 됩니다.
재조회가 필요한 경우 호출하는 쪽에서 데이터를 갱신하고 경계를 초기화합니다.
자동 초기화는 resetKeys 요소의 참조/값 변경에 의존합니다.

### `EmptyData`

직접 빈 상태를 전달해야 할 때 사용할 수 있는 신호 클래스입니다.

```tsx
throw new EmptyData();
```

이 신호를 이벤트 핸들러나 타이머에서 던져도 React boundary가 포착하지 않습니다.
경계 아래 자식 컴포넌트의 렌더 중에 던져야 합니다.

## SuspenseQuery 연동 (선택 사항)

아래는 사용하는 앱이 Suspensive를 선택한 경우의 연동 예제입니다.
이 예제에 등장하는 Suspensive 패키지는 EmptyBoundary의 의존성이 아닙니다.
`SuspenseQuery`를 사용하는 프로젝트에서는 Query 구독이 빈 fallback에서도
살아 있도록 render prop **안쪽에** EmptyBoundary를 배치합니다.

```tsx
import { ErrorBoundary, Suspense } from '@suspensive/react';
import { SuspenseQuery } from '@suspensive/react-query-5';

<ErrorBoundary fallback={ErrorView}>
  <Suspense fallback={<Loading />}>
    <SuspenseQuery {...itemsQueryOptions}>
      {({ data }) => (
        <EmptyBoundary fallback={<EmptyView />} resetKeys={[data]}>
          <ItemList data={data} />
        </EmptyBoundary>
      )}
    </SuspenseQuery>
  </Suspense>
</ErrorBoundary>;
```

빈 데이터는 Query 캐시에 성공 결과로 남고,
캐시 데이터가 바뀌면 resetKeys를 통해 빈 화면에서 복구됩니다.
requireNonEmpty를 queryFn/select에 넣는 구성과는 다릅니다.

아래처럼 boundary의 props를 계산하는 시점에 던지면 해당 boundary는 잡을 수 없습니다.

```tsx
// 잘못된 배치: 부모가 JSX를 만드는 중에 throw함
<EmptyBoundary fallback={<EmptyView />}>
  <ItemList data={requireNonEmpty(data, isNonEmptyArray)} />
</EmptyBoundary>
```

requireNonEmpty는 앞의 기본 예제처럼 ItemList 등 **자식 컴포넌트 안에서** 호출합니다.
EmptyBoundary를 SuspenseQuery 바깥에 놓고 render prop에서 직접 던질 수도 있지만,
이 경우 빈 fallback이 Query를 언마운트하므로 외부 resetKeys 또는 수동 reset이 필요합니다.

## 구조

```text
src/       구현과 공개 export
tests/     공개 API 런타임·DOM·타입 계약
dist/      빌드된 ESM과 .d.ts (Git 제외)
.github/   CI
```

기존 `~/Documents/mrdp`는 이 패키지를 로컬 파일 의존성으로 사용하는
별도 실험 앱입니다. 패키지 자체의 빌드와 테스트에는 해당 앱이 필요하지 않습니다.
