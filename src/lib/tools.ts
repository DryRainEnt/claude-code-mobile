/**
 * Tool Definitions & Executor
 * Claude API tool_use에 사용되는 도구 정의와 실행기
 */

import type { ToolDefinition } from './api';
import * as vfs from './vfs';

export const fileTools: ToolDefinition[] = [
  {
    name: 'list_directory',
    description: '디렉토리의 파일과 폴더 목록을 반환합니다. 파일 크기와 타입 정보를 포함합니다.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '디렉토리 경로 (기본값: /)' },
      },
    },
  },
  {
    name: 'read_file',
    description: '파일의 텍스트 내용을 읽습니다. 텍스트 파일만 지원합니다.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '읽을 파일의 경로' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: '파일에 텍스트 내용을 씁니다. 파일이 없으면 새로 생성하고, 있으면 덮어씁니다. 중간 폴더도 자동으로 생성됩니다.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '파일 경로' },
        content: { type: 'string', description: '파일에 쓸 내용' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'create_directory',
    description: '새 폴더를 생성합니다. 중간 경로의 폴더도 자동으로 생성됩니다.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '생성할 폴더 경로' },
      },
      required: ['path'],
    },
  },
  {
    name: 'move_file',
    description: '파일 또는 폴더를 이동하거나 이름을 변경합니다.',
    input_schema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: '원본 경로' },
        destination: { type: 'string', description: '대상 경로' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'delete_file',
    description: '파일 또는 폴더를 삭제합니다. 폴더는 내부 파일 포함 재귀적으로 삭제됩니다.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '삭제할 경로' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: '파일명에 검색어가 포함된 파일을 찾습니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
        path: { type: 'string', description: '검색 시작 경로 (기본값: /)' },
      },
      required: ['query'],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case 'list_directory': {
        const path = (input.path as string) || '/';
        const entries = await vfs.listDirectory(path);
        if (entries.length === 0) return `${path} 디렉토리가 비어있습니다.`;
        return entries
          .map((e) => {
            if (e.type === 'directory') return `📁 ${e.name}/`;
            const size = e.size < 1024 ? `${e.size}B` : e.size < 1024 * 1024 ? `${(e.size / 1024).toFixed(1)}KB` : `${(e.size / (1024 * 1024)).toFixed(1)}MB`;
            return `📄 ${e.name} (${size})`;
          })
          .join('\n');
      }

      case 'read_file': {
        const content = await vfs.readFile(input.path as string);
        if (content.text !== undefined) {
          return content.text;
        }
        return `[바이너리 파일: ${content.metadata.mimeType}, ${content.metadata.size}바이트]`;
      }

      case 'write_file': {
        await vfs.writeFile(input.path as string, input.content as string);
        return `파일을 작성했습니다: ${input.path}`;
      }

      case 'create_directory': {
        await vfs.createDirectory(input.path as string);
        return `폴더를 생성했습니다: ${input.path}`;
      }

      case 'move_file': {
        await vfs.moveFile(input.source as string, input.destination as string);
        return `이동 완료: ${input.source} → ${input.destination}`;
      }

      case 'delete_file': {
        await vfs.deleteFile(input.path as string);
        return `삭제 완료: ${input.path}`;
      }

      case 'search_files': {
        const results = await vfs.searchFiles(
          input.query as string,
          (input.path as string) || '/'
        );
        if (results.length === 0) return '검색 결과가 없습니다.';
        return results
          .map((e) => `${e.type === 'directory' ? '📁' : '📄'} ${e.path}`)
          .join('\n');
      }

      default:
        return `알 수 없는 도구: ${name}`;
    }
  } catch (err) {
    return `오류: ${(err as Error).message}`;
  }
}
