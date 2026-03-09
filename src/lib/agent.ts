/**
 * Agent Loop - Claude Code의 핵심 루프를 브라우저에서 구현
 *
 * 1. 사용자 메시지 → Claude API
 * 2. Claude가 tool_use 응답 → 로컬에서 도구 실행
 * 3. 결과를 tool_result로 다시 API에 전송
 * 4. Claude가 text 응답을 줄 때까지 반복
 */

import { callClaude } from './api';
import type { ApiMessage, ContentBlock } from './api';
import { fileTools, executeTool } from './tools';

export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}

const SYSTEM_PROMPT = `당신은 iPad에서 동작하는 파일 관리 AI 어시스턴트입니다.
사용자의 강의 자료를 정리하고 관리하는 것을 도와줍니다.

규칙:
- 먼저 list_directory로 현재 파일 구조를 파악하세요
- 파일을 읽고 쓸 때는 반드시 도구를 사용하세요
- 한국어로 답변하세요
- 파일을 수정하거나 삭제하기 전에 사용자에게 확인을 구하세요
- 새 파일을 만들 때는 적절한 폴더 구조를 제안하세요

가상 파일 시스템 정보:
- 루트 경로는 / 입니다
- 경로는 항상 /로 시작합니다 (예: /강의자료/1단원/교안.md)
- 텍스트 파일만 읽기/쓰기 가능합니다 (바이너리 파일은 메타데이터만 확인 가능)`;

const MAX_TOOL_ROUNDS = 15;

export type AgentCallback = (event: AgentEvent) => void;

export async function runAgent(
  userMessage: string,
  conversationHistory: ApiMessage[],
  onEvent: AgentCallback,
  signal?: AbortSignal
): Promise<ApiMessage[]> {
  const messages: ApiMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (signal?.aborted) {
      onEvent({ type: 'error', content: '중단되었습니다.' });
      break;
    }

    let response;
    try {
      response = await callClaude(messages, fileTools, SYSTEM_PROMPT, signal);
    } catch (err) {
      onEvent({ type: 'error', content: (err as Error).message });
      break;
    }

    // Process response content blocks
    const assistantContent: ContentBlock[] = response.content;
    messages.push({ role: 'assistant', content: assistantContent });

    // Emit text blocks
    for (const block of assistantContent) {
      if (block.type === 'text') {
        onEvent({ type: 'text', content: block.text });
      }
    }

    // If no tool use, we're done
    if (response.stop_reason !== 'tool_use') {
      onEvent({ type: 'done', content: '' });
      return messages;
    }

    // Execute tool calls
    const toolResults: ContentBlock[] = [];

    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        onEvent({
          type: 'tool_call',
          content: `${block.name} 실행 중...`,
          toolName: block.name,
          toolInput: block.input,
        });

        const result = await executeTool(block.name, block.input);

        onEvent({
          type: 'tool_result',
          content: result,
          toolName: block.name,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // Add tool results and continue the loop
    messages.push({ role: 'user', content: toolResults });
  }

  onEvent({ type: 'done', content: '' });
  return messages;
}
