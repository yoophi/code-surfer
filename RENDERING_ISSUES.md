# Rendering Issues

이 문서는 React 19, Astro 문서 사이트, pnpm workspace 전환 이후 `/` route의 Code Surfer preview에서 확인한 렌더링 문제와 지금까지 시도한 해결 방법을 정리한다.

## 현재 문제

`sites/docs`의 `/` route에서 `CodeSurferPreview`를 렌더링할 때 Code Surfer preview가 정상 크기로 표시되지 않는 문제가 있었다.

관찰된 증상은 다음과 같다.

- `Line numbers` 예제 실행 시 `LineList`에서 `Cannot read properties of undefined (reading 'map')` 오류가 발생했다.
- 초기 렌더링 중 최종 화면이 아닌 측정용 step들이 사용자 화면에 보였다.
- 측정용 step을 숨긴 뒤에는 실제 표시되어야 하는 코드도 보이지 않는 문제가 생겼다.
- 이후 코드가 표시되더라도 Code Surfer 내용이 preview stage 전체가 아니라 위쪽의 얇은 영역에 매우 작게 렌더링되는 문제가 남았다.
- Astro/Vite dev server에서 `504 (Outdated Optimize Dep)`가 함께 보인 적이 있다. 이 문제는 주로 Vite optimize cache가 오래되었을 때 발생했다.

## 원인으로 확인한 내용

### 1. 오래된 dimensions cache

`packs/standalone/src/dimensions.ts`의 `useDimensions`가 `steps` 입력이 바뀌어도 이전 계산 결과를 재사용했다.

그 결과 `CodeSurferPreview`에서 `Focus` 예제와 `Line numbers` 예제를 전환할 때 다음 값들이 서로 다른 예제 기준으로 섞였다.

- 새 예제의 `tokens`
- 이전 예제 기준으로 계산된 `stepsWithDimensions`

이 조합 때문에 `LineList`가 존재하지 않는 `tokens[lineKey]`를 참조했고, `tokens[lineKey].map(...)`에서 런타임 오류가 발생했다.

### 2. 초기 측정 DOM 노출

`packs/standalone/src/code-surfer.tsx`는 dimensions가 없을 때 모든 step을 렌더링해서 DOM 크기를 측정한다.

이 측정용 렌더링이 사용자 화면에 그대로 노출되어 초기 화면에서 최종 결과가 아닌 여러 step이 보였다.

### 3. 측정 DOM을 숨기면서 실제 프레임까지 숨김

처음에는 측정 DOM 전체에 `visibility: hidden`을 적용했다.

이 방식은 측정용 요소를 숨기는 데는 성공했지만, dimensions가 계산되기 전 사용자에게 보여줄 임시 실제 프레임까지 숨기는 문제가 있었다.

### 4. 컨테이너 높이 계산 오류

측정 DOM을 별도 absolute layer로 분리한 뒤, `dimensions.ts`의 `containerHeight` 계산이 `container.scrollHeight` 기반으로 동작하면서 stage 전체 높이가 아니라 콘텐츠 높이를 기준으로 잡는 문제가 있었다.

그 결과 `scaleToFocus`가 preview stage를 위쪽의 얇은 영역으로 계산하고, 코드가 매우 작게 표시되었다.

## 적용한 수정

### 1. `steps` 변경 시 dimensions cache 무효화

파일: `packs/standalone/src/dimensions.ts`

`DimensionsResult`에 `sourceSteps`를 추가하고, 현재 `steps` 참조와 일치하는 결과만 재사용하도록 변경했다.

목적:

- 예제 전환 시 이전 예제의 dimensions를 재사용하지 않는다.
- `stepsWithDimensions`와 `tokens`가 서로 다른 예제 기준으로 섞이지 않게 한다.

### 2. 측정용 fake steps 제거

파일: `packs/standalone/src/code-surfer.tsx`

초기 측정용으로 만들던 `fakeSteps` 렌더링을 제거하고, 실제 parsed steps를 기준으로 측정하도록 변경했다.

목적:

- line key 중복 또는 왜곡으로 인한 token lookup 문제를 줄인다.
- 실제 렌더링 구조와 측정 구조의 차이를 줄인다.

### 3. 측정 DOM과 실제 표시 DOM 분리

파일: `packs/standalone/src/code-surfer.tsx`

dimensions가 아직 없을 때 다음 두 레이어를 분리했다.

- 실제 사용자에게 즉시 보여줄 현재 `Frame`
- 전체 step dimensions 계산을 위한 투명한 absolute 측정 레이어

측정 레이어에는 다음 스타일을 적용했다.

- `position: absolute`
- `inset: 0`
- `width: 100%`
- `height: 100%`
- `opacity: 0`
- `pointerEvents: none`
- `overflow: hidden`
- `aria-hidden="true"`

목적:

- 초기 렌더링에서 실제 프레임은 보이게 한다.
- 측정용 전체 step 렌더링은 사용자에게 보이지 않게 한다.
- 측정 레이어가 preview stage와 같은 크기를 갖도록 한다.

### 4. zoom 계산 방어 로직 추가

파일: `packs/standalone/src/animation.ts`

`getZoom`에서 `contentWidth`, `containerWidth`, `contentHeight`, `availableHeight`가 0 또는 비정상일 때 과도하게 축소되지 않도록 fallback을 추가했다.

목적:

- 측정값이 0인 순간에 `xZoom` 또는 `yZoom`이 비정상적으로 작아지는 문제를 피한다.

### 5. 컨테이너 높이 계산 기준 변경

파일: `packs/standalone/src/dimensions.ts`

`containerHeight` 계산을 `container.scrollHeight` 기반에서 부모 컨테이너의 실제 `clientHeight` 기준으로 변경했다.

목적:

- absolute 측정 레이어에서도 preview stage 전체 높이를 기준으로 dimensions를 계산한다.
- Code Surfer 내용이 위쪽 얇은 띠에 갇혀 작게 표시되는 문제를 해결한다.

### 6. Theme UI deprecation 정리

파일: `packs/themes/src/styles.tsx`

`ThemeProvider` 대신 `ThemeUIProvider`를 사용하도록 변경했다.

목적:

- Theme UI deprecation warning을 줄인다.
- React 19 전환 후 콘솔 노이즈를 줄인다.

### 7. Theme UI nested provider wrapper 정리

파일: `packs/themes/src/styles.tsx`

`StylesProvider`가 두 개의 `ThemeUIProvider`를 중첩해서 사용하고 있었다.

`theme-ui` v0.16+ 부터 nested `ThemeUIProvider`가 children을 `<div data-themeui-nested-provider>` 으로 감싸 CSS 변수를 적용한다. 이 wrapper div는 명시적인 height가 없어서 콘텐츠 크기로 줄어들었고, `.preview-stage`(`height: 410px`) → wrapper(auto) → CodeSurfer 외곽 div(`height: 100%`)로 이어지는 `height: 100%` chain을 끊었다.

그 결과 `useDimensions`가 `containerParent.clientHeight`를 줄어든 wrapper 기준(예: 76px, 57px)으로 읽어서 `containerHeight`가 잘못 계산되었고, `getZoom`이 `availableHeight / contentHeight` 를 기반으로 매우 작은 scale을 적용했다.

다음 두 가지를 변경했다.

- `baseTheme`, outer context theme, 사용자 theme를 `merge.all` 로 미리 합쳐서 단일 `ThemeUIProvider` 만 사용하도록 변경했다. 부모 provider가 없는 일반 사용 케이스에서는 wrapper가 추가되지 않는다.
- `[data-themeui-nested-provider] { display: contents }` 를 emotion `<Global>` 로 주입했다. 사용자가 외부에서 `ThemeUIProvider` 를 또 감싸도 wrapper가 layout에 영향을 주지 않도록 한 방어 장치다.

목적:

- preview stage 전체 height가 `.cs-container`까지 그대로 전달된다.
- `containerParent.clientHeight` 가 사용자 컨테이너 기준 height(예: 410px)로 측정된다.
- 자동 zoom이 의도한 대로 `Math.min(yZoom, 1, xZoom)` = 1 (자연 크기)로 계산된다.

### 8. Vite/Astro dev cache 정리

문제가 반복될 때 다음 캐시를 삭제하고 dev server를 재시작했다.

```bash
rm -rf sites/docs/node_modules/.vite sites/docs/node_modules/.astro sites/docs/.astro
pnpm --filter docs start --host 0.0.0.0 --port 4321
```

목적:

- `504 (Outdated Optimize Dep)` 상태를 제거한다.
- workspace package의 새 `dist` 결과를 dev server가 다시 optimize하도록 한다.

## 검증에 사용한 명령

주요 수정 후 다음 명령을 반복 실행했다.

```bash
pnpm --filter @code-surfer/standalone build
pnpm --filter @code-surfer/standalone test
pnpm --filter docs build
```

전체 검증에는 다음 명령도 사용했다.

```bash
pnpm install
pnpm prepare
pnpm test
pnpm build:sites
```

## 검증 결과 (2026-04-28)

브라우저(Chrome DevTools MCP)에서 `astro dev` 실행 후 `/` route를 직접 검증했다.

- `Focus` 와 `Line numbers` 예제 전환 시 코드가 preview stage 전체(예: 410px / 320px)를 채우고 자연 크기(scale 1)로 렌더링된다.
- progress slider를 0 → 0.5 → 1 → ... 로 움직일 때 line focus 애니메이션이 정상 동작하고, dimensions cache가 stale 상태로 남지 않는다.
- 가로폭을 1280 → 800 으로 줄여 반응형 breakpoint(`@media (max-width: 900px)`)를 트리거했을 때 `useWindowResize` 가 `setResult(null)` 을 호출해 dimensions를 320px 기준으로 재측정한다.
- `cs-container` height = stage height, `.cs-scaled-content` transform = `matrix(1, 0, 0, 1, 0, 0)` (scale 1) 임을 DOM 측정으로 확인했다.

## 남은 확인 사항

- 자동 zoom 정책이 데모 UX에 적절한지 확인해야 한다. 긴 코드 줄을 맞추기 위해 축소하는 기존 동작은 유지했지만, 필요하면 최소 zoom 값을 도입할 수 있다.
- `code-surfer` (legacy MDX Deck wrapper) 패키지에서도 `StylesProvider` 변경 영향이 없는지 확인해야 한다. 현재는 standalone만 사용 검증했다.
