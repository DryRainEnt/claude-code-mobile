/**
 * Claude API 클라이언트
 * - 개발: Vite proxy (/api/messages → api.anthropic.com)
 * - 프로덕션: 설정된 프록시 URL 사용
 */

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ApiResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: { input_tokens: number; output_tokens: number };
}

function getApiBase(): string {
  const customProxy = localStorage.getItem('api_proxy_url');
  if (customProxy) return customProxy;
  // dev mode: Vite proxy handles /api → api.anthropic.com
  return '/api';
}

function getApiKey(): string {
  return localStorage.getItem('anthropic_api_key') || '';
}

export async function callClaude(
  messages: ApiMessage[],
  tools: ToolDefinition[],
  systemPrompt: string,
  signal?: AbortSignal
): Promise<ApiResponse> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

  const res = await fetch(`${getApiBase()}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API 오류 (${res.status}): ${body}`);
  }

  return res.json();
}
