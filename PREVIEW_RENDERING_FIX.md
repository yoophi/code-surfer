# Preview Rendering Fix History

이 문서는 docs 사이트 `/` route의 `CodeSurferPreview` 가 preview stage 전체가 아닌 위쪽 얇은 영역에 매우 작게 렌더링되던 문제를 진단하고 수정한 작업 기록이다.

작업 일시: 2026-04-28
대상 사이트: `sites/docs` (Astro + React 19)
관련 패키지: `@code-surfer/themes`, `@code-surfer/standalone`

---

## 1. 증상

`http://127.0.0.1:4321/` 의 hero 섹션 우측 `CodeSurferPreview` 에서 다음 증상이 관찰되었다.

- preview stage(`height: 410px`) 안에 코드가 stage 전체가 아닌 최상단 얇은 영역(약 76px)에만 매우 작게 렌더링됨.
- `.cs-scaled-content` 의 `transform` 이 `matrix(0.157895, 0, 0, 0.157895, 0, 0)` 로 약 0.16배 축소되어 적용됨.
- preview stage 의 나머지 영역(약 334px)은 빈 검정 배경으로 남음.
- Focus ↔ Line numbers 예제를 전환해도 동일한 패턴이 반복됨(76px → 57px 등 콘텐츠 라인 수에 비례).

이전 작업으로 처리된 별개 이슈는 `RENDERING_ISSUES.md` 의 1~7 항목에 정리되어 있다.

---

## 2. 진단 과정

### 2-1. 브라우저 DOM 측정

Chrome DevTools 로 `.cs-container` 부모 chain 의 height 와 computed style 을 확인했다.

```
DIV.cs-container         h=57   cssH=57px      <- dimensions.containerHeight = 57
DIV (overflow: auto)     h=57   cssH=57px      <- code-surfer.tsx 의 outer ref div
                                                   style: height: 100%
DIV.css-123ui6y          h=57   cssH=57px      <- ❶ 문제 지점
DIV.preview-stage        h=410  cssH=410px     <- 사용자가 정한 stage 크기
DIV.preview-shell        h=509  cssH=509px
ASTRO-ISLAND             h=0    display=contents
SECTION.hero             h=704  cssH=704px
MAIN.page                h=2192 cssH=2192px
```

`.preview-stage` 가 410px 인 반면, 그 안의 `div.css-123ui6y` 는 57px 로 줄어들어 있었다. 이로 인해 그 자식의 `height: 100%` 도 57px 로 계산되었다.

### 2-2. 줄어든 wrapper div 정체 확인

DOM attribute 검사 결과 `div.css-123ui6y` 는 `data-themeui-nested-provider="true"` 속성을 가졌고, CSS 규칙은 다음과 같았다.

```css
.css-123ui6y {
  --theme-ui-colors-background: #011627;
  --theme-ui-colors-text: #d6deeb;
  --theme-ui-colors-primary: rgb(173, 219, 103);
}
```

CSS 변수만 가지는 wrapper 였고 height/min-height 등의 dimension 속성은 없었다.

### 2-3. theme-ui 소스 분석

`node_modules/@theme-ui/color-modes/dist/*.esm.js` 의 `NestedColorModeProvider` 가 다음과 같이 children을 div로 감싸는 것을 확인했다.

```js
function NestedColorModeProvider({ outerCtx, children }) {
  // ...
  return jsx(__ThemeUIInternalBaseThemeProvider, {
    context: { ...outerCtx, theme: newTheme },
    children: jsx$1('div', {
      'data-themeui-nested-provider': true,
      key: Number(needsRerender),
      suppressHydrationWarning: true,
      css: colorVars,        // <- CSS 변수만 주입
      children
    })
  });
}
```

조건 분기를 보면 `ColorModeProvider` 는 외부 context 의 `setColorMode` 가 이미 정의되어 있을 때(즉, 상위에 또 다른 `ColorModeProvider` 가 있을 때) `NestedColorModeProvider` 를 사용한다.

```js
const ColorModeProvider = ({ children }) => {
  const outerCtx = useThemeUI();
  const isTopLevelColorModeProvider = typeof outerCtx.setColorMode !== 'function';
  return isTopLevelColorModeProvider
    ? jsx(TopLevelColorModeProvider, { ... })
    : jsx(NestedColorModeProvider, { ... });
};
```

### 2-4. StylesProvider 코드 분석

`packs/themes/src/styles.tsx` 의 기존 구현은 `ThemeUIProvider` 두 개를 중첩하고 있었다.

```tsx
function StylesProvider({ theme = {}, children }) {
  const outer = useThemeUI().theme || {};
  const base = {
    ...baseTheme,
    ...outer,
    styles: { ...baseTheme.styles, ...outer.styles }
  };
  return (
    <AnyThemeProvider theme={base}>
      <AnyThemeProvider theme={theme}>{children}</AnyThemeProvider>
    </AnyThemeProvider>
  );
}
```

- 바깥 `ThemeUIProvider`(`base`): 상위에 다른 provider 가 없으므로 top-level → wrapper div 없음.
- 안쪽 `ThemeUIProvider`(`theme`): 바로 위에 또 다른 provider 가 있으므로 nested → `<div data-themeui-nested-provider>` wrapper 추가.

이 안쪽 wrapper 가 위에서 본 `div.css-123ui6y` 였다.

### 2-5. height 전달 chain 추적

CSS 사양상 `height: 100%` 는 부모 box 의 used height 를 기준으로 계산된다.

```
.preview-stage          (height: 410px)         ✅ 410
└─ div.css-123ui6y      (height 미지정, auto)   ❌ 콘텐츠 크기로 줄어듬
   └─ div ref           (height: 100%)          ❌ 부모(auto)의 100% → auto
      └─ div.cs-container (height: dimensions.containerHeight)
         또는 측정 단계에서 height: 100%
```

측정 단계에서 `.cs-container` 의 부모(per-step wrapper, `position: absolute, inset: 0`) 는 자기 contain block(measurement layer, `inset: 0`)을 따라가는데, measurement layer 의 contain block(`.cs-styles outer wrapper`) 도 위 chain 에서 결국 `auto` 로 줄어들기 때문에, 모든 단계가 콘텐츠 크기인 76px 로 측정되었다.

`packs/standalone/src/dimensions.ts` 의 `getStepDimensions` 는 다음 식을 사용한다.

```ts
const availableHeight =
  containerParent.clientHeight || container.clientHeight || container.scrollHeight;
const containerHeight = availableHeight; // = 76
```

이 잘못된 `containerHeight` 가 `dimensions.containerHeight` 로 저장되어, `frame.tsx` 가 `.cs-container` 를 76px 로 그리고, `animation.ts` 의 `getZoom` 이 다음과 같이 계산했다.

```ts
const yZoom = availableHeight / contentHeight; // 작은 값
return Math.min(yZoom, 1, xZoom);              // ≈ 0.158
```

결과적으로 코드가 stage 의 위쪽 얇은 영역 안에 0.16배로 축소되어 표시되었다.

---

## 3. 적용한 수정

### 3-1. 단일 `ThemeUIProvider` 로 합치기

`packs/themes/src/styles.tsx` 에서 `baseTheme`, outer context theme, 사용자 theme 를 `merge.all` 로 미리 합쳐 단일 provider 만 사용하도록 변경했다.

```tsx
import { ThemeUIProvider, jsx, useThemeUI, ThemeUIStyleObject, merge } from "theme-ui";
import { Global } from "@emotion/react";

const AnyThemeProvider = ThemeUIProvider as any;
const AnyGlobal = Global as any;

const nestedProviderFix = {
  "[data-themeui-nested-provider]": {
    display: "contents"
  }
};

function StylesProvider({ theme = {}, children }) {
  const outer = useThemeUI().theme || {};
  const merged = React.useMemo(
    () => merge.all({}, baseTheme, outer, theme),
    [outer, theme]
  );
  return (
    <AnyThemeProvider theme={merged}>
      <AnyGlobal styles={nestedProviderFix} />
      {children}
    </AnyThemeProvider>
  );
}
```

효과: 사용자가 별도로 `ThemeUIProvider` 를 감싸지 않은 일반 케이스에서는 우리의 단일 provider 가 top-level 이 되어 wrapper div 자체가 추가되지 않는다.

### 3-2. wrapper 가 들어간 케이스에 대한 방어용 CSS

사용자가 외부에서 `ThemeUIProvider` 를 별도로 감싸 우리 provider 가 nested 가 되는 경우(예: MDX Deck), 동일한 문제가 재발할 수 있다. 이를 방어하기 위해 emotion `<Global>` 로 다음 규칙을 주입했다.

```css
[data-themeui-nested-provider] {
  display: contents;
}
```

`display: contents` 는 element 자체를 layout box 에서 제거하지만 자식은 그대로 부모 layout 에 배치되며, CSS 변수(`--theme-ui-colors-*`) 의 cascade 도 유지된다. 따라서 wrapper 가 layout 에 영향을 주지 않으면서 theme 색상 변수는 그대로 동작한다.

### 3-3. TypeScript 호환 처리

`/** @jsx jsx */` pragma 와 React 19 타입 조합에서 `Global` 과 `React.Fragment` 가 그대로 JSX element 로 사용되지 못하는 이슈가 있었다. `Global` 은 `as any` 로 캐스팅하고, fragment 는 사용하지 않고 `<AnyGlobal>` 을 provider 자식으로 위치시켜 회피했다.

```tsx
const AnyGlobal = Global as any;
```

---

## 4. 검증

### 4-1. 빌드 / 테스트

```bash
pnpm --filter @code-surfer/themes build       # ✓ DTS 포함 성공
pnpm --filter @code-surfer/themes test        # ✓ 1 passed
pnpm --filter @code-surfer/standalone build   # ✓ 성공
pnpm --filter @code-surfer/standalone test    # ✓ 12 passed
pnpm --filter docs build                      # ✓ Astro static build 성공
```

### 4-2. 브라우저 검증

`pnpm --filter docs start` 후 Chrome DevTools MCP 로 `/` route 를 검증했다.

1. **초기 렌더링** — `.cs-container` height 410px(stage 와 동일), `.cs-scaled-content` transform `matrix(1, 0, 0, 1, 0, 0)` (scale 1, 자연 크기). 코드가 preview stage 정중앙에 정상 크기로 표시.
2. **DOM chain** — `data-themeui-nested-provider` div 가 더 이상 chain 에 없음을 확인.
3. **Focus → Line numbers 전환** — 새 예제의 코드(line numbers 포함)가 정상 크기로 표시되며, dimensions cache 가 새 steps 기준으로 재측정됨.
4. **Progress slider** — 0 → 0.5 → 1 등 중간값에서 line focus 애니메이션이 부드럽게 동작. dimensions cache stale 없음.
5. **반응형 breakpoint** — 가로폭을 1280 → 800 으로 축소해 `@media (max-width: 900px)` 가 적용되어 `.preview-stage` 가 320px 가 된 후, `useWindowResize` 가 `setResult(null)` 을 호출하여 dimensions 가 320px 기준으로 재측정됨. `.cs-container` height 가 320px 로 갱신.

---

## 5. 변경 파일 요약

- `packs/themes/src/styles.tsx`
  - `useThemeUI`, `ThemeUIStyleObject`, `merge` import (theme-ui)
  - `Global` import (`@emotion/react`)
  - `StylesProvider`: 두 개의 `ThemeUIProvider` 중첩 → `merge.all` 후 단일 provider
  - emotion `<Global>` 로 `[data-themeui-nested-provider] { display: contents }` 주입

- `RENDERING_ISSUES.md`
  - "7. Theme UI nested provider wrapper 정리" 항목 추가
  - "검증 결과 (2026-04-28)" 섹션 추가
  - "남은 확인 사항" 정리

- `PREVIEW_RENDERING_FIX.md` (이 문서)
  - 진단 과정과 수정 내용을 종합적으로 기록

---

## 6. 후속 확인 사항

- legacy `code-surfer`(MDX Deck wrapper) 패키지에서도 `StylesProvider` 변경 영향이 없는지 검증 필요. 현재는 `@code-surfer/standalone` 사용 케이스(docs 사이트)만 확인했다.
- `display: contents` 는 일부 브라우저(과거 Firefox)에서 접근성 트리 문제가 있었으나 최신 브라우저에서는 대부분 해결됨. 필요 시 `height: 100%; min-height: 0` 로 대체 검토 가능.
- `getZoom` 의 자동 zoom 정책(`Math.min(yZoom, 1, xZoom)`)은 긴 코드 줄을 맞추기 위해 1 미만으로 축소하는 동작을 유지한다. 필요 시 최소 zoom 값을 도입할 수 있다.
