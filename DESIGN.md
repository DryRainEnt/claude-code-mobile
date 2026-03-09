# Claude Code Mobile - 설계 문서

## 1. 프로젝트 개요

### 배경
아이패드로 강의하는 강사가 AI를 활용해 강의 자료를 정리하고 싶지만, 현재 Claude Code는 데스크톱 터미널 환경 전용이다. 모바일(특히 iPad) 환경에서는 로컬 파일 시스템 접근이 제한적이므로, 브라우저 기반으로 파일 읽기/쓰기가 가능한 Claude Code 환경을 제공한다.

### 목표
- iPad Safari/PWA 환경에서 동작하는 파일 관리 + AI 어시스턴트
- 강의 자료(PDF, DOCX, 이미지, 텍스트)를 가져와 AI로 정리/요약/변환
- 서버 인프라 없이 동작 (Claude API 호출만 필요)
- 비개발자도 쉽게 사용할 수 있는 UI

### 핵심 사용 시나리오
1. 강의 PDF/문서를 앱에 가져오기
2. "이 자료들을 단원별로 정리해줘" 같은 자연어 요청
3. AI가 파일을 읽고, 분류하고, 요약본이나 새 문서를 생성
4. 결과물을 다운로드하거나 공유

---

## 2. 기술 제약 분석

### iPad Safari 환경의 제약

| 기능 | 지원 여부 | 비고 |
|------|----------|------|
| File System Access API | X | Chromium 전용, Safari 미지원 |
| `<input type="file">` | O | 읽기 전용, 1회성 |
| Origin Private File System (OPFS) | O | Safari 16.4+, 샌드박스 내 읽기/쓰기 |
| IndexedDB | O | 구조화 데이터/Blob 저장 |
| Service Worker | O | PWA 오프라인 캐싱 |
| SharedArrayBuffer | △ | COOP/COEP 헤더 필요 |
| 자식 프로세스 생성 | X | 브라우저에서 불가 |
| 실제 쉘 실행 | X | 브라우저에서 불가 |

### 결론
- **OPFS**를 가상 파일 시스템으로 사용
- **IndexedDB**를 메타데이터/검색 인덱스로 사용
- 셸 명령은 불필요 (파일 정리 용도이므로)
- Claude API는 브라우저에서 직접 호출 (API 키 보호를 위한 경량 프록시 선택 가능)

---

## 3. 아키텍처

```
┌─────────────────────────────────────┐
│         iPad PWA (Safari)           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │        UI Layer               │  │
│  │  - 파일 브라우저 (트리 뷰)    │  │
│  │  - 채팅 인터페이스             │  │
│  │  - 문서 뷰어/미리보기          │  │
│  │  - 파일 가져오기/내보내기      │  │
│  └──────────┬────────────────────┘  │
│             │                       │
│  ┌──────────▼────────────────────┐  │        ┌──────────────────┐
│  │      Agent Loop               │  │        │                  │
│  │  - 사용자 메시지 수신          │──┼───────▶│   Claude API     │
│  │  - tool_use 응답 처리          │  │  HTTPS │   (Messages +   │
│  │  - 결과 피드백 & 반복          │◀─┼────────│    Tool Use)    │
│  └──────────┬────────────────────┘  │        └──────────────────┘
│             │                       │
│  ┌──────────▼────────────────────┐  │
│  │     Tool Executor             │  │
│  │  - read_file                  │  │
│  │  - write_file                 │  │
│  │  - list_directory             │  │
│  │  - move_file                  │  │
│  │  - search_files               │  │
│  │  - summarize_document         │  │
│  └──────────┬────────────────────┘  │
│             │                       │
│  ┌──────────▼────────────────────┐  │
│  │     Virtual File System       │  │
│  │  - OPFS (파일 데이터)          │  │
│  │  - IndexedDB (메타데이터)      │  │
│  └───────────────────────────────┘  │
│             │          ▲            │
│        가져오기     내보내기         │
│             ▼          │            │
│  ┌───────────────────────────────┐  │
│  │  iPad 파일 앱 / iCloud Drive  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 4. 핵심 모듈 설계

### 4.1 Virtual File System (VFS)

OPFS를 기반으로 한 가상 파일 시스템 추상화 레이어.

```typescript
interface VirtualFileSystem {
  // 파일 조작
  readFile(path: string): Promise<FileContent>;
  writeFile(path: string, content: string | ArrayBuffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveFile(src: string, dest: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;

  // 디렉토리 조작
  listDirectory(path: string): Promise<FileEntry[]>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;

  // 검색
  searchFiles(query: string, path?: string): Promise<FileEntry[]>;

  // 가져오기/내보내기
  importFiles(files: File[]): Promise<string[]>;
  exportFile(path: string): Promise<Blob>;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  mimeType?: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface FileContent {
  text?: string;        // 텍스트 파일
  arrayBuffer?: ArrayBuffer;  // 바이너리 파일
  metadata: FileEntry;
}
```

**구현 전략:**
- OPFS로 실제 파일 데이터 저장
- IndexedDB에 메타데이터 (파일명, 경로, MIME 타입, 크기, 날짜) 캐싱
- 텍스트 파일은 전문 검색 인덱스 구축 (IndexedDB 기반)

### 4.2 Agent Loop

Claude Code의 핵심 루프를 브라우저에서 재현.

```typescript
interface AgentLoop {
  // 대화 시작/계속
  sendMessage(userMessage: string): AsyncGenerator<AgentEvent>;

  // 대화 이력
  getConversation(): ConversationMessage[];
  clearConversation(): void;
}

type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'error'; error: string }
  | { type: 'done' };
```

**동작 흐름:**
1. 사용자 메시지 수신
2. 대화 이력 + 시스템 프롬프트 + 도구 정의를 Claude API에 전송
3. Claude가 `tool_use`로 응답하면 Tool Executor에서 로컬 실행
4. 실행 결과를 `tool_result`로 다시 API에 전송
5. Claude가 최종 텍스트 응답을 줄 때까지 반복

### 4.3 Tool Definitions

Claude API의 tool_use 프로토콜에 맞춘 도구 정의.

```typescript
const tools: Tool[] = [
  {
    name: "read_file",
    description: "파일의 내용을 읽습니다",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "읽을 파일 경로" }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "파일에 내용을 씁니다. 새 파일 생성 또는 기존 파일 덮어쓰기",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "파일 경로" },
        content: { type: "string", description: "파일 내용" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_directory",
    description: "디렉토리의 파일/폴더 목록을 반환합니다",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "디렉토리 경로 (기본값: /)" }
      }
    }
  },
  {
    name: "move_file",
    description: "파일 또는 폴더를 이동하거나 이름을 변경합니다",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", description: "원본 경로" },
        destination: { type: "string", description: "대상 경로" }
      },
      required: ["source", "destination"]
    }
  },
  {
    name: "search_files",
    description: "파일명 또는 내용으로 파일을 검색합니다",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색어" },
        path: { type: "string", description: "검색 시작 경로 (기본값: /)" }
      },
      required: ["query"]
    }
  },
  {
    name: "create_directory",
    description: "새 폴더를 생성합니다",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "생성할 폴더 경로" }
      },
      required: ["path"]
    }
  },
  {
    name: "delete_file",
    description: "파일 또는 빈 폴더를 삭제합니다",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "삭제할 경로" }
      },
      required: ["path"]
    }
  }
];
```

### 4.4 Document Processing

강의 자료 특화 처리 모듈.

```typescript
interface DocumentProcessor {
  // 파일을 텍스트로 변환 (Claude에 전달용)
  extractText(file: FileContent): Promise<string>;

  // 지원 형식 확인
  isSupported(mimeType: string): boolean;
}
```

**지원 파일 형식:**
| 형식 | 처리 방법 |
|------|----------|
| .txt, .md, .csv | 직접 텍스트 읽기 |
| .pdf | pdf.js로 텍스트 추출 |
| .docx | mammoth.js로 텍스트/HTML 변환 |
| .pptx | 커스텀 XML 파서 (zip + XML) |
| .xlsx | SheetJS로 테이블 데이터 추출 |
| .jpg, .png | Claude Vision API로 직접 전달 |
| .hwp | (향후) hwp.js 또는 서버 변환 |

---

## 5. UI 설계

### 5.1 화면 구성

iPad 가로 모드 기준 2패널 레이아웃:

```
┌──────────────────────────────────────────────────────┐
│  📁 내 강의자료            [가져오기] [내보내기]       │
├────────────────────┬─────────────────────────────────┤
│                    │                                 │
│  📂 1학기          │  💬 AI 어시스턴트                │
│    📄 수업계획.pdf │                                 │
│    📂 1단원        │  사용자: 1단원 자료들을          │
│      📄 교안.docx  │  요약해서 학생용 핸드아웃        │
│      📄 문제.pdf   │  만들어줘                        │
│    📂 2단원        │                                 │
│      ...           │  AI: 1단원 파일들을 확인         │
│                    │  하겠습니다.                     │
│  📂 2학기          │                                 │
│    ...             │  [read_file 실행 중...]          │
│                    │                                 │
│                    │  AI: 핸드아웃을 작성했습니다.    │
│                    │  📄 1단원_핸드아웃.md            │
│                    │                                 │
│                    │  ┌─────────────────────────┐    │
│                    │  │ 메시지 입력...     [전송] │    │
│                    │  └─────────────────────────┘    │
└────────────────────┴─────────────────────────────────┘
```

### 5.2 주요 UI 컴포넌트

1. **FileTree** - 좌측 파일 탐색기
   - 폴더 열기/닫기, 드래그 앤 드롭 정렬
   - 파일 선택 시 미리보기
   - 우클릭/롱프레스 컨텍스트 메뉴 (이름변경, 삭제, 이동)

2. **ChatPanel** - 우측 AI 대화창
   - 마크다운 렌더링
   - 도구 실행 상태 표시 (어떤 파일을 읽고 있는지 등)
   - 스트리밍 응답 표시

3. **FileImporter** - 파일 가져오기
   - `<input type="file" multiple>` 기반
   - 드래그 앤 드롭 영역
   - 폴더 단위 가져오기 (`webkitdirectory`)

4. **FileExporter** - 파일 내보내기
   - 개별 파일 다운로드
   - 폴더 ZIP 압축 다운로드
   - `navigator.share()` 연동 (AirDrop 등)

5. **DocumentViewer** - 문서 미리보기
   - PDF 렌더링 (pdf.js)
   - 이미지 표시
   - 텍스트/마크다운 렌더링

---

## 6. 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|----------|
| 프레임워크 | **React 19** + TypeScript | 컴포넌트 기반, 생태계, iPad Safari 호환성 |
| 빌드 | **Vite** | 빠른 개발 서버, PWA 플러그인 지원 |
| PWA | **vite-plugin-pwa** | Service Worker 자동 생성, 오프라인 지원 |
| 스타일링 | **Tailwind CSS** | 유틸리티 기반, 반응형 레이아웃 빠른 구현 |
| 상태관리 | **Zustand** | 경량, 간단한 API, React 외부에서도 접근 가능 |
| 파일시스템 | **OPFS** (네이티브 API) | iPad Safari 지원, 읽기/쓰기 가능 |
| DB | **Dexie.js** (IndexedDB 래퍼) | 타입 안전, 쿼리 편의성 |
| PDF | **pdf.js** | 브라우저 PDF 렌더링/텍스트 추출 표준 |
| DOCX | **mammoth.js** | DOCX → HTML/텍스트 변환 |
| ZIP | **JSZip** | 폴더 내보내기용 ZIP 생성 |
| 마크다운 | **react-markdown** | 채팅 응답 렌더링 |
| API 통신 | **Anthropic SDK** (`@anthropic-ai/sdk`) | Claude API 공식 SDK |

---

## 7. 구현 로드맵

### Phase 1: 기반 구축 (MVP)
- [ ] 프로젝트 초기 설정 (Vite + React + TypeScript + Tailwind)
- [ ] PWA 설정 (manifest, service worker)
- [ ] VFS 모듈 구현 (OPFS + IndexedDB)
- [ ] 기본 파일 브라우저 UI
- [ ] 파일 가져오기/내보내기

### Phase 2: AI 연동
- [ ] Claude API 연동 (Messages API + tool_use)
- [ ] Agent Loop 구현
- [ ] Tool Executor 구현 (VFS 연동)
- [ ] 채팅 UI (스트리밍, 마크다운 렌더링)
- [ ] 도구 실행 상태 표시

### Phase 3: 문서 처리
- [ ] PDF 텍스트 추출 및 뷰어
- [ ] DOCX 텍스트 추출
- [ ] 이미지 파일 Claude Vision 연동
- [ ] 파일 검색 기능

### Phase 4: 사용성 개선
- [ ] iPad 터치 최적화 (드래그 앤 드롭, 제스처)
- [ ] 오프라인 모드 (API 호출 제외한 기능)
- [ ] 대화 이력 저장/불러오기
- [ ] 다국어 지원 (한국어 기본)

### Phase 5: 확장 (선택)
- [ ] iCloud/Google Drive 동기화
- [ ] HWP 파일 지원
- [ ] 협업 기능 (공유 링크)
- [ ] API 키 프록시 서버

---

## 8. 보안 고려사항

1. **API 키 관리**: 클라이언트에 키를 직접 저장하는 것은 위험. 선택지:
   - (간단) 사용자가 직접 API 키 입력, 로컬 스토리지에 암호화 저장
   - (권장) Cloudflare Worker 등 경량 프록시로 키를 서버에 보관

2. **파일 데이터**: 모든 파일은 OPFS에 저장되어 해당 오리진에서만 접근 가능. 다만 Safari의 스토리지 정리 정책에 주의.

3. **XSS 방지**: 사용자 업로드 파일의 HTML/스크립트 내용을 렌더링할 때 sanitize 필수.

4. **CORS**: Claude API 직접 호출 시 CORS 정책 확인 필요. 프록시 사용 시 해결됨.

---

## 9. 알려진 제한사항

1. **OPFS는 사용자에게 보이지 않음**: iPad 파일 앱에서 직접 접근 불가, 반드시 앱 내 가져오기/내보내기 필요
2. **Safari 스토리지 한도**: 디바이스 용량의 약 50%까지 사용 가능하나, 정확한 한도는 불투명
3. **오프라인 AI 불가**: Claude API 호출에 인터넷 필요
4. **셸 미지원**: 스크립트 실행, 패키지 설치 등 불가 (파일 관리에 집중)
5. **대용량 파일**: 메모리 제약으로 수백MB 이상의 파일 처리는 어려울 수 있음
