# Preview Rendering Debugging Insights

이 메모는 `sites/docs`의 Code Surfer preview 렌더링 문제를 해결하면서 얻은 재사용 가능한 인사이트를 정리한다.

## 핵심 관점

Code Surfer preview 문제는 단순한 React 렌더링 문제가 아니라 layout measurement 문제로 다뤄야 한다.

`@code-surfer/standalone`은 DOM을 먼저 렌더링한 뒤 다음 값을 측정한다.

- container height
- container width
- content width
- line height
- title/subtitle padding

따라서 React component tree에 추가되는 provider, wrapper, Astro island, hidden layer, absolute layer가 모두 최종 렌더링 크기와 zoom 계산에 영향을 줄 수 있다.

## 가장 먼저 확인할 것

비슷한 문제가 생기면 DevTools에서 다음 chain을 먼저 확인한다.

```text
.preview-stage
  -> theme/provider wrapper
  -> CodeSurfer root
  -> .cs-container
  -> .cs-scaled-content
```

특히 다음 값을 확인한다.

- `.preview-stage`의 실제 height
- 중간 wrapper의 computed height
- `.cs-container`의 height
- `.cs-scaled-content`의 `transform`
- `data-themeui-nested-provider` wrapper 존재 여부

`.preview-stage`가 410px인데 중간 wrapper나 `.cs-container`가 50~80px로 줄어 있으면 Code Surfer는 작은 영역을 기준으로 zoom을 계산한다.

## Theme UI Provider 주의점

Theme UI의 nested `ThemeUIProvider`는 `div[data-themeui-nested-provider]` wrapper를 추가할 수 있다.

이 wrapper는 CSS 변수만 담고 explicit height가 없기 때문에 Code Surfer의 `height: 100%` chain을 끊을 수 있다.

안전한 처리 방식:

- 가능하면 `ThemeUIProvider`를 중첩하지 말고 theme를 merge해서 단일 provider로 제공한다.
- 외부 provider 때문에 nested wrapper가 생길 가능성에 대비해 `[data-themeui-nested-provider] { display: contents }` 방어 CSS를 둔다.

## Measurement DOM 처리 원칙

측정용 DOM은 화면에 보이면 안 되지만, layout 측정은 가능해야 한다.

피해야 할 방식:

- `display: none`
- 실제 표시 DOM까지 `visibility: hidden` 처리
- 측정 layer에 width/height를 명시하지 않는 것

권장 방식:

- 사용자에게 보여줄 현재 frame과 측정용 전체 frames를 분리한다.
- 측정 layer는 `position: absolute`, `inset: 0`, `width: 100%`, `height: 100%`, `opacity: 0`, `pointer-events: none`으로 둔다.
- 측정 layer는 `aria-hidden="true"`로 둔다.

## Dimensions Cache 원칙

`steps`가 바뀌면 dimensions cache도 반드시 무효화해야 한다.

예제 탭 전환처럼 `tokens`와 `steps`가 바뀌는 경우, 이전 `stepsWithDimensions`를 재사용하면 다음 문제가 발생한다.

- 이전 예제의 line key
- 새 예제의 tokens

이 둘이 섞이면 `tokens[lineKey]`가 undefined가 되어 `LineList`에서 런타임 오류가 발생할 수 있다.

## Zoom Debugging

작게 표시되는 경우 `.cs-scaled-content`의 transform을 확인한다.

예:

```text
matrix(0.157895, 0, 0, 0.157895, 0, 0)
```

이런 값이면 `getZoom`이 매우 작은 scale을 계산한 것이다. 이때는 `contentWidth`, `containerWidth`, `lineHeight`, `containerHeight`, `focusCount`를 확인한다.

비정상 측정값이 들어오는 경우를 대비해 zoom 계산에는 fallback이 필요하다.

## Vite/Astro Cache 처리

workspace package의 `dist`를 다시 빌드한 뒤 dev server가 이전 optimized dependency를 계속 사용할 수 있다.

렌더링 버그를 다시 확인하기 전에는 다음 절차를 사용한다.

```bash
pnpm --filter @code-surfer/themes build
pnpm --filter @code-surfer/standalone build
rm -rf sites/docs/node_modules/.vite sites/docs/node_modules/.astro sites/docs/.astro
pnpm --filter docs start --host 0.0.0.0 --port 4321
```

`504 (Outdated Optimize Dep)`는 실제 렌더링 버그와 별개로 Vite optimize cache 문제일 수 있다.

## 검증 체크리스트

수정 후에는 다음을 확인한다.

- 초기 렌더링에서 측정용 step들이 보이지 않는다.
- 초기 렌더링에서 실제 현재 step은 보인다.
- `.cs-container` height가 `.preview-stage` height와 일치한다.
- `.cs-scaled-content` transform이 짧은 예제에서 `scale(1)`에 가깝다.
- `Focus`와 `Line numbers` 예제 전환 시 오류가 없다.
- progress slider 중간값에서도 line focus animation이 깨지지 않는다.
- viewport width 변경 후 dimensions가 다시 계산된다.
