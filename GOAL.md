# 작업 목표

현재 프로젝트는 코드를 애니메이션 슬라이드로 표현하는 도구이며, 오래된 React 및 빌드 도구 체인 때문에 최신 개발 환경과의 호환성이 낮은 상태다.

## 최종 목표

React 19를 지원하도록 프로젝트를 업그레이드하고, 오래된 주요 의존성과 개발 도구를 갱신하여 다시 안정적으로 개발, 빌드, 테스트할 수 있는 상태로 만든다.

## 주요 작업 범위

- `react`, `react-dom`, React 타입 정의를 React 19 기준으로 업그레이드한다.
- `packs/*` 패키지의 peer dependency 범위를 React 19와 호환되도록 조정한다.
- `tsdx@0.7`, `typescript@3.5` 기반의 오래된 빌드 체인이 최신 Node 및 React 타입과 맞지 않는 부분을 점검하고 필요한 범위에서 교체하거나 업그레이드한다.
- `code-surfer`, `@code-surfer/standalone`, `@code-surfer/themes`, `@code-surfer/step-parser` 패키지가 각각 빌드와 테스트를 통과하도록 정리한다.
- `sites/docs`, `sites/book`의 Gatsby, Storybook, MDX Deck 계열 의존성도 현재 개발 환경에서 동작 가능한 버전으로 갱신한다.
- React 19에서 제거되었거나 경고가 되는 API 사용 여부를 확인하고 필요한 코드를 수정한다.
- lockfile을 갱신하고 재현 가능한 설치 상태를 만든다.

## 검증 기준

- 루트 의존성 설치가 오류 없이 완료된다.
- 모든 패키지 빌드 스크립트가 통과한다.
- 기존 테스트가 통과하거나, 업그레이드 과정에서 필요한 테스트 수정이 함께 반영된다.
- 문서/예제 사이트 개발 서버 또는 빌드가 최신 의존성 조합에서 실행된다.
- React 19 peer dependency 충돌 없이 소비자가 패키지를 설치할 수 있다.

## 현재 파악한 리스크

- 이 저장소는 Yarn v1 workspaces 구조이며, `packs/*`와 `sites/*`가 함께 묶여 있다.
- 핵심 라이브러리는 React 16, TypeScript 3.5, TSDX 0.7, Gatsby 2, Storybook 5 등 오래된 도구에 의존한다.
- 단순 버전 범위 수정만으로는 React 19 지원이 충분하지 않을 수 있으며, 빌드 도구와 타입 체크 설정 변경이 필요할 가능성이 높다.
- `mdx-deck` 및 `theme-ui` 구버전의 React 19 호환성 확인이 필요하다.
