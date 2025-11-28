# React Grab for VSCode 🚀

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

다른 언어로 읽기: [English](README.md)

> 이 프로젝트는 [@aidenybai](https://github.com/aidenybai)의 [react-grab](https://github.com/aidenybai/react-grab)에서 영감을 받아 만들어졌습니다.

브라우저에서 React 요소를 선택하고 VSCode의 AI 어시스턴트(GitHub Copilot & Claude Code)와 연결하는 브릿지입니다.

<video src="https://github.com/user-attachments/assets/ca4e3081-3c89-47e1-aabb-2e02b2a744f8" width="600"></video>

<video src="https://github.com/user-attachments/assets/61d34ceb-bc79-4d9c-91c5-1e1746039013" width="600"></video>

## 요약

- React fiber를 활용하여 브라우저에서 React 컴포넌트를 시각적으로 선택
- JSX, props, context를 VSCode의 GitHub Copilot 또는 Claude Code로 즉시 전송
- 브라우저와 IDE 간 실시간 WebSocket 연결
- `opt` (Mac) 또는 `alt` (Windows/Linux)를 누른 상태에서 컴포넌트를 클릭하고 AI에게 질문하기

## 🌟 기능

- **시각적 컴포넌트 선택**: `opt` (Mac) 또는 `alt` (Windows/Linux)를 누르고 클릭하여 React 컴포넌트 선택
- **AI 연동**: GitHub Copilot Chat 또는 Claude Code로 프롬프트를 원활하게 전송
- **실시간 통신**: WebSocket 기반의 브라우저-VSCode 간 실시간 브릿지
- **스마트 컨텍스트**: React fiber를 통해 컴포넌트 이름, props, JSX를 자동으로 추출
- **복사 기능**: 컴포넌트 정보나 JSX를 클립보드에 복사하여 수동 프롬프트 작성 가능
- **상태 표시**: 브라우저와 VSCode 모두에서 연결 상태를 시각적으로 표시
- **사이트별 토글**: 웹사이트별로 익스텐션 활성화/비활성화 가능

## 📋 사전 요구사항

- VSCode 1.85.0 이상
- pnpm 10.22.0 이상 (소스에서 빌드 시)
- GitHub Copilot Chat 익스텐션 (Copilot 기능 사용 시)
- Claude Code 익스텐션 (Claude 기능 사용 시)
- Chrome 또는 Edge 브라우저
- React 애플리케이션 (추가 설정 불필요)

## 🚀 빠른 시작

### 옵션 1: VSIX 파일로 설치 (권장)

1. releases에서 최신 `.vsix` 파일 다운로드
2. VSCode 실행
3. `Cmd/Ctrl + Shift + P` 누르기
4. "Extensions: Install from VSIX..." 실행
5. 다운로드한 `.vsix` 파일 선택

### 옵션 2: 소스에서 빌드

```bash
# 저장소 클론
git clone https://github.com/yourusername/react-grab-vscode.git
cd react-grab-vscode

# 의존성 설치
pnpm install

# 익스텐션 빌드
pnpm run compile

# 익스텐션 패키징
pnpm run package
```

## 🔧 설치

### VSCode 익스텐션

1. **마켓플레이스에서 설치** (준비 중)

   - VSCode Extensions에서 "React Grab for Copilot" 검색
   - Install 클릭

2. **소스에서 설치**

   ```bash
   # 로컬에서 빌드 및 설치
   pnpm install
   pnpm run compile

   # 프로젝트 디렉토리에서 VSCode 열기
   code .

   # F5를 눌러 디버그 모드로 익스텐션 실행
   ```

### Chrome 익스텐션

#### 빌드 및 설치

1. **익스텐션 빌드**

   ```bash
   # 의존성 설치 및 빌드
   pnpm browser:install
   pnpm browser:build
   ```

2. **Chrome에서 로드**

   - `chrome://extensions/` 접속
   - "개발자 모드" 활성화 (우측 상단)
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - `browser-extension/dist` 폴더 선택

3. **Edge에서 로드**
   - `edge://extensions/` 접속
   - "개발자 모드" 활성화 (좌측 사이드바)
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - `browser-extension/dist` 폴더 선택

#### 개발 모드

개발 중 자동 리빌드:

```bash
pnpm browser:dev
```

#### 익스텐션 업데이트

코드 변경 후:

1. 리빌드: `pnpm browser:build`
2. `chrome://extensions/` 접속
3. 익스텐션 카드의 새로고침 아이콘 (↻) 클릭
4. 열린 탭 새로고침

#### 문제 해결

**익스텐션이 나타나지 않는 경우:**

- `browser-extension/dist` 폴더를 선택했는지 확인 (`browser-extension`이 아님)
- 익스텐션 카드에서 오류 확인

**연결 문제:**

- VSCode 익스텐션이 실행 중인지 확인 (상태 바 확인)
- 포트 9765가 방화벽에 차단되지 않았는지 확인
- Chrome DevTools Console (F12)에서 `[React Grab Bridge]` 메시지 확인

## 📖 사용법

### 기본 워크플로우

1. **VSCode 익스텐션 시작**

   - WebSocket 서버가 자동으로 시작됨 (포트 9765)
   - 상태 바에서 연결 상태 확인

2. **React 앱 열기**

   - Chrome/Edge에서 React 애플리케이션으로 이동
   - 브라우저 익스텐션이 활성화되어 있는지 확인 (익스텐션 아이콘 확인)

3. **컴포넌트 선택**

   - `option` (Mac) 또는 `alt` (Windows/Linux) 누르기
   - 키를 누른 상태에서 React 컴포넌트 클릭
   - 선택 가능한 컴포넌트 위에서 커서가 십자 모양으로 변경됨
   - 브라우저 익스텐션이 React fiber를 통해 컴포넌트의 JSX를 캡처
   - 컴포넌트 정보가 담긴 다이얼로그 표시

4. **액션 선택**

   - **컴포넌트 정보 복사**: 클립보드에 컴포넌트 상세 정보 복사
   - **JSX 복사**: 클립보드에 raw JSX 복사
   - **AI로 전송**: GitHub Copilot 또는 Claude Code 선택

5. **AI 응답 받기**
   - AI로 전송 시, 컴포넌트에 대한 프롬프트 입력
   - 프롬프트가 VSCode로 전송됨
   - 선택한 AI 어시스턴트가 프롬프트와 컴포넌트 컨텍스트와 함께 열림

### 설정

VSCode 설정에서 익스텐션 구성:

```json
{
  "reactGrabCopilot.websocketPort": 9765,
  "reactGrabCopilot.autoStart": true,
  "reactGrabCopilot.autoExecute": true,
  "reactGrabCopilot.includeElementContext": false,
  "reactGrabCopilot.showNotifications": true
}
```

| 설정                    | 설명                            | 기본값 |
| ----------------------- | ------------------------------- | ------ |
| `websocketPort`         | WebSocket 서버 포트             | 9765   |
| `autoStart`             | 서버 자동 시작                  | true   |
| `autoExecute`           | AI 채팅에서 프롬프트 자동 실행  | true   |
| `includeElementContext` | 프롬프트에 컴포넌트 props 포함  | false  |
| `showNotifications`     | 알림 메시지 표시                | true   |

## 🏗️ 아키텍처

### 클린 아키텍처 구현

```
┌──────────────────┐     WebSocket       ┌──────────────────┐
│                  │◄───────────────────►│                  │
│ Chrome Extension │                     │ VSCode Extension │
│                  │                     │                  │
└────────┬─────────┘                     └───────┬──────────┘
         │                                       │
         │                                       │
    ┌────▼────┐                            ┌─────▼──────┐
    │         │                            │            │
    │  React  │                            │  Copilot/  │
    │   App   │                            │   Claude   │
    │         │                            │            │
    └─────────┘                            └────────────┘
```

### 프로젝트 구조

```
react-grab-vscode/
├── src/                       # VSCode Extension 소스
│   ├── extension.ts           # 진입점
│   ├── websocket-server.ts    # WebSocket 서버
│   ├── copilot-integration.ts # AI 연동
│   ├── status-bar.ts          # 상태 바 UI
│   └── utils/                 # 유틸리티
├── browser-extension/         # Chrome Extension
│   ├── src/                   # 소스 파일 (React + TypeScript)
│   ├── public/                # 정적 자원
│   ├── dist/                  # 빌드 결과물 (Chrome에서 로드)
│   └── vite.config.ts         # Vite 설정
├── package.json               # Node 의존성
└── README.md                  # 이 파일
```

## 🛠️ 개발

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/yourusername/react-grab-vscode.git
cd react-grab-vscode

# 의존성 설치
pnpm install

# 개발 시작
pnpm run watch

# 테스트 실행
pnpm test

# 프로덕션 빌드
pnpm run compile

# 익스텐션 패키징
pnpm run package
```

### 사용 가능한 스크립트

| 스크립트                | 설명                               |
| ----------------------- | ---------------------------------- |
| `pnpm run compile`      | TypeScript 파일 빌드              |
| `pnpm run watch`        | 개발용 watch 모드                 |
| `pnpm run package`      | VSIX 패키지 생성                  |
| `pnpm run lint`         | ESLint 실행                       |
| `pnpm test`             | 테스트 실행                       |
| `pnpm browser:install`  | 브라우저 익스텐션 의존성 설치     |
| `pnpm browser:build`    | 브라우저 익스텐션 빌드            |
| `pnpm browser:dev`      | 브라우저 익스텐션 개발 모드       |

### 로컬 테스트

1. **VSCode 익스텐션**

   - VSCode에서 `F5`를 눌러 디버그 인스턴스 실행
   - 새 창에서 익스텐션이 활성화됨

2. **Chrome 익스텐션**
   - `pnpm browser:build`로 빌드
   - `browser-extension/dist` 폴더에서 압축해제된 익스텐션 로드
   - React 애플리케이션 열기
   - `opt` (Mac) 또는 `alt` (Windows/Linux)를 누르고 클릭하여 컴포넌트 선택 테스트

### 개발 가이드라인

- TypeScript 모범 사례 준수
- 클린 아키텍처 원칙 유지
- 새 기능에 대한 테스트 작성
- 필요에 따라 문서 업데이트
- Conventional Commit 메시지 형식 준수

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE)를 참조하세요.

## 🙏 감사의 말

- [react-grab](https://github.com/aidenybai/react-grab) - React fiber 검사 방식에 대한 영감
- [GitHub Copilot](https://github.com/features/copilot) - AI 페어 프로그래머
- [Claude Code](https://claude.ai) - AI 코딩 어시스턴트
- VSCode Extension API 문서
- 오픈소스 커뮤니티
