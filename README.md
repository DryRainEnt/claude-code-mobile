# Claude Code Mobile

iPad/모바일 환경에서 로컬 파일을 읽고 쓸 수 있는 AI 기반 파일 관리 어시스턴트.

## 개요

Claude Code의 파일 관리 기능을 모바일 브라우저(iPad Safari PWA)에서 사용할 수 있도록 구현한 프로젝트입니다. 강의 자료 정리, 문서 요약, 파일 분류 등의 작업을 자연어로 요청할 수 있습니다.

## 주요 기능 (계획)

- 가상 파일 시스템 (OPFS 기반) - iPad에서 파일 읽기/쓰기
- AI 어시스턴트 - Claude API를 활용한 파일 관리 자동화
- 문서 처리 - PDF, DOCX, 이미지 등 강의 자료 지원
- PWA - 홈 화면 추가로 앱처럼 사용

## 기술 스택

React 19, TypeScript, Vite, Tailwind CSS, OPFS, IndexedDB, Claude API

## 문서

- [설계 문서](./DESIGN.md) - 아키텍처, 모듈 설계, 구현 로드맵
