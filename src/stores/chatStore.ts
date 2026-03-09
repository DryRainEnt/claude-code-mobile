import { create } from 'zustand';
import type { ApiMessage } from '../lib/api';
import type { AgentEvent } from '../lib/agent';
import { runAgent } from '../lib/agent';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  isStreaming?: boolean;
}

interface ChatStoreState {
  messages: DisplayMessage[];
  apiMessages: ApiMessage[];
  isProcessing: boolean;
  abortController: AbortController | null;

  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'system',
      content:
        '안녕하세요! 파일 정리를 도와드리는 AI 어시스턴트입니다.\n\n왼쪽에서 파일을 가져온 후, 자유롭게 요청해주세요.\n\n예시:\n- "현재 파일 목록을 보여줘"\n- "이 파일들을 단원별로 정리해줘"\n- "요약본을 만들어줘"',
    },
  ],
  apiMessages: [],
  isProcessing: false,
  abortController: null,

  sendMessage: async (text: string) => {
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      set((s) => ({
        messages: [
          ...s.messages,
          { id: nextId(), role: 'user', content: text },
          {
            id: nextId(),
            role: 'assistant',
            content: 'API 키가 설정되지 않았습니다. 우측 상단 설정에서 Anthropic API 키를 입력해주세요.',
          },
        ],
      }));
      return;
    }

    const abortController = new AbortController();
    const userMsg: DisplayMessage = { id: nextId(), role: 'user', content: text };
    const assistantId = nextId();

    set((s) => ({
      messages: [
        ...s.messages,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ],
      isProcessing: true,
      abortController,
    }));

    let assistantText = '';
    const toolMessages: DisplayMessage[] = [];

    const onEvent = (event: AgentEvent) => {
      switch (event.type) {
        case 'text':
          assistantText += (assistantText ? '\n' : '') + event.content;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: assistantText } : m
            ),
          }));
          break;

        case 'tool_call':
          toolMessages.push({
            id: nextId(),
            role: 'tool',
            content: event.content,
            toolName: event.toolName,
          });
          // Insert tool messages before assistant response
          set((s) => {
            const msgs = [...s.messages];
            const assistantIdx = msgs.findIndex((m) => m.id === assistantId);
            if (assistantIdx >= 0) {
              msgs.splice(assistantIdx, 0, toolMessages[toolMessages.length - 1]);
            }
            return { messages: msgs };
          });
          break;

        case 'tool_result': {
          const resultMsg: DisplayMessage = {
            id: nextId(),
            role: 'tool',
            content: `${event.toolName}: ${event.content.length > 200 ? event.content.slice(0, 200) + '...' : event.content}`,
            toolName: event.toolName,
          };
          set((s) => {
            const msgs = [...s.messages];
            const assistantIdx = msgs.findIndex((m) => m.id === assistantId);
            if (assistantIdx >= 0) {
              msgs.splice(assistantIdx, 0, resultMsg);
            }
            return { messages: msgs };
          });
          break;
        }

        case 'error':
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: `오류: ${event.content}`, isStreaming: false }
                : m
            ),
            isProcessing: false,
            abortController: null,
          }));
          break;

        case 'done':
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            ),
            isProcessing: false,
            abortController: null,
          }));
          break;
      }
    };

    try {
      const newApiMessages = await runAgent(
        text,
        get().apiMessages,
        onEvent,
        abortController.signal
      );
      set({ apiMessages: newApiMessages });
    } catch {
      // Already handled by onEvent error
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isProcessing: false, abortController: null });
    }
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'system',
          content: '대화가 초기화되었습니다. 새로운 요청을 입력해주세요.',
        },
      ],
      apiMessages: [],
      isProcessing: false,
      abortController: null,
    });
  },
}));
