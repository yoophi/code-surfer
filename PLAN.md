# React 19 업그레이드 계획

이 계획은 `GOAL.md`의 목표를 기준으로, 현재 `code-surfer` 저장소를 React 19와 최신 개발 환경에서 다시 개발 가능한 상태로 만들기 위한 실행 순서를 정의한다.

## 1. 현재 상태 조사

- 루트와 각 workspace의 패키지 매니저, lockfile, 스크립트, 배포 산출물 구조를 확인한다.
- `packs/*` 라이브러리 패키지와 `sites/*` 예제/문서 사이트의 의존성을 분리해서 목록화한다.
- React 16, TSDX 0.7, TypeScript 3.5, Gatsby 2, Storybook 5, MDX Deck 3 등 업그레이드가 필요한 축을 확정한다.
- React 19에서 문제가 될 수 있는 API 사용을 검색한다.
  - `ReactDOM.render`
  - `findDOMNode`
  - legacy context
  - 오래된 lifecycle
  - 타입 정의 변경으로 깨질 가능성이 있는 React 타입

## 2. 업그레이드 전략 확정

- 라이브러리 패키지(`packs/*`)와 사이트 패키지(`sites/*`)를 한 번에 올릴지, 라이브러리부터 먼저 안정화할지 결정한다.
- TSDX를 계속 사용할 수 있는지 검토하고, 불가능하거나 유지 비용이 높으면 `tsup` 또는 Rollup 기반 빌드로 전환한다.
- 현재 Yarn v1 workspaces를 유지할지, lockfile 재생성만 할지 결정한다.
- React peer dependency 정책을 정한다.
  - 라이브러리 패키지는 React를 직접 번들링하지 않는다.
  - `peerDependencies`는 React 18과 19를 함께 허용할지, React 19 중심으로 제한할지 결정한다.
  - 개발/테스트용 `devDependencies`는 React 19로 맞춘다.

## 3. 라이브러리 패키지 업그레이드

- `@code-surfer/step-parser`
  - React 의존성이 없는 핵심 파서 패키지로 먼저 빌드 체인을 현대화한다.
  - TypeScript 버전 업그레이드 후 타입 오류와 테스트 실패를 정리한다.

- `@code-surfer/themes`
  - React 19 타입과 `theme-ui` 호환성을 확인한다.
  - `peerDependencies`와 타입 패키지를 갱신한다.
  - 스타일 컴포넌트가 최신 JSX/React 타입에서 정상 빌드되는지 확인한다.

- `@code-surfer/standalone`
  - React 19 개발 의존성으로 빌드와 테스트를 실행한다.
  - animation, frame, dimensions, window resize 관련 hook이 Strict Mode와 최신 React에서 문제없는지 확인한다.
  - DOM 측정 로직과 `useLayoutEffect` 사용 위치를 점검한다.

- `code-surfer`
  - `mdx-deck` 연동부와 presenter/layout 코드를 React 19 기준으로 점검한다.
  - `react-swipeable`, `use-spring`, `theme-ui` 등 런타임 의존성을 최신 호환 버전으로 갱신하거나 대체한다.
  - peer dependency와 배포 타입 정의가 실제 소비 환경에서 충돌하지 않도록 조정한다.

## 4. 빌드 및 테스트 도구 현대화

- TypeScript를 최신 안정 버전으로 올린다.
- Jest 또는 대체 테스트 러너가 최신 TypeScript/React 조합에서 동작하도록 설정한다.
- 기존 TSDX 스크립트를 유지할 수 없으면 패키지별 빌드 스크립트를 새 도구로 교체한다.
- CommonJS, ESM, 타입 선언 파일이 기존 `package.json`의 `main`, `module`, `typings` 경로와 일치하는지 확인한다.
- 테스트 snapshot이 도구 업그레이드로만 달라진 경우 내용을 검토한 뒤 갱신한다.

## 5. 사이트 패키지 업그레이드

- `sites/book`
  - Storybook 5 기반 구성을 최신 Storybook으로 올리거나, 유지가 어렵다면 최소 동작 가능한 예제 실행 환경으로 재구성한다.
  - React 19와 `theme-ui` 최신 버전에서 standalone 컴포넌트 예제가 렌더링되는지 확인한다.

- `sites/docs`
  - Gatsby 2, `gatsby-theme-mdx-deck`, `mdx-deck` 조합의 React 19 호환성을 검토한다.
  - 호환이 어렵다면 문서 사이트를 최신 Gatsby/MDX 구성으로 올리거나 별도 현대화 경로를 제안한다.
  - 문서 빌드가 라이브러리 패키지의 workspace 버전을 참조하도록 정리한다.

## 6. 코드 수정

- React 19에서 제거되거나 권장되지 않는 API를 최신 API로 변경한다.
- 타입 오류를 실제 런타임 의도에 맞춰 수정한다.
- Strict Mode에서 effect가 두 번 실행되어도 깨지지 않도록 side effect와 cleanup을 점검한다.
- 오래된 polyfill이나 런타임 보조 패키지가 최신 빌드 대상에서 계속 필요한지 확인하고 제거 가능한 것은 제거한다.

## 7. 의존성 및 lockfile 정리

- 루트와 workspace의 중복 devDependency를 줄인다.
- React, React DOM, React 타입, TypeScript, Jest, 빌드 도구 버전을 일관되게 맞춘다.
- `yarn.lock`을 재생성하고 설치가 재현 가능한지 확인한다.
- peer dependency 경고와 deprecated 패키지 경고를 검토하여 남길 항목과 해결할 항목을 구분한다.

## 8. 검증

- 루트 설치 검증
  - `yarn install`

- 라이브러리 빌드 검증
  - `yarn build:step-parser`
  - `yarn build:themes`
  - `yarn build:standalone`
  - `yarn build:codesurfer`

- 테스트 검증
  - `yarn test:step-parser`
  - `yarn test:themes`
  - `yarn test:standalone`
  - `yarn test:codesurfer`

- 사이트 검증
  - `yarn workspace book build`
  - `yarn workspace docs build`
  - 필요한 경우 개발 서버 실행 후 주요 예제 렌더링 확인

## 9. 완료 기준

- React 19 환경에서 workspace 설치가 성공한다.
- 라이브러리 패키지의 빌드 산출물이 생성된다.
- 기존 테스트가 통과하거나, 실패 사유와 보완 계획이 명확히 기록된다.
- 문서/예제 사이트가 빌드 또는 개발 서버 기준으로 실행 가능하다.
- React 19 peer dependency 충돌 없이 패키지를 소비할 수 있다.
- 변경된 업그레이드 결정 사항과 남은 제약을 문서에 반영한다.

## 10. 예상 작업 순서

1. 의존성 현황과 React 19 위험 지점을 조사한다.
2. `step-parser`부터 빌드 체인을 현대화한다.
3. `themes`, `standalone`, `code-surfer` 순서로 React 19 타입과 런타임 호환성을 맞춘다.
4. 루트 빌드/테스트 스크립트를 새 도구 체인에 맞게 정리한다.
5. `sites/book`과 `sites/docs`를 최신 React 조합에서 동작하도록 갱신한다.
6. 전체 install, build, test, site build를 실행하고 실패를 해결한다.
7. lockfile과 문서를 정리한 뒤 최종 상태를 커밋한다.
