import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: '안녕하세요! 파일 정리를 도와드리는 AI 어시스턴트입니다.\n\n왼쪽에서 파일을 가져온 후, 자유롭게 요청해주세요.\n\n예시:\n- "이 파일들을 단원별로 정리해줘"\n- "PDF 내용을 요약해줘"\n- "학생용 핸드아웃을 만들어줘"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if API key is configured
  useEffect(() => {
    const key = localStorage.getItem('anthropic_api_key');
    setIsConnected(!!key);
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');

    if (!isConnected) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ API 키가 설정되지 않았습니다.\n\n우측 상단의 ⚙️ 설정에서 Anthropic API 키를 입력해주세요.\n\n(Phase 2에서 Claude API 연동이 구현됩니다)',
        },
      ]);
      return;
    }

    // Phase 2에서 구현: Agent Loop + Claude API 호출
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '🚧 AI 기능은 Phase 2에서 구현됩니다.\n\n현재는 파일 가져오기/내보내기/정리 기능을 먼저 사용해보세요.',
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">AI 어시스턴트</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
          <span className="text-xs text-slate-400">{isConnected ? '연결됨' : '미연결'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-slate-700 text-slate-200'
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 px-3 py-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 resize-none rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 placeholder-slate-500"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
