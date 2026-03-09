import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useFileStore } from '../stores/fileStore';
import type { DisplayMessage } from '../stores/chatStore';

function ToolBadge({ message }: { message: DisplayMessage }) {
  const isCall = message.content.includes('실행 중');
  return (
    <div className="flex items-start gap-2 px-3 py-1.5">
      <div
        className={`text-xs px-2 py-0.5 rounded-full border ${
          isCall
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            : 'border-slate-600 bg-slate-800 text-slate-400'
        }`}
      >
        {isCall ? '⚙️' : '✓'} {message.content}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  if (message.role === 'tool') {
    return <ToolBadge message={message} />;
  }

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} px-3`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed
          ${message.role === 'user'
            ? 'bg-blue-600 text-white'
            : message.role === 'system'
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-slate-700 text-slate-200'
          }`}
      >
        {message.content || (message.isStreaming ? '...' : '')}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400 animate-pulse rounded-sm align-text-bottom" />
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { messages, isProcessing, sendMessage, stopGeneration, clearChat } = useChatStore();
  const { refreshTree } = useFileStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const key = localStorage.getItem('anthropic_api_key');
    setIsConnected(!!key);

    const handler = () => setIsConnected(!!localStorage.getItem('anthropic_api_key'));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Refresh file tree when agent is done (may have created/moved files)
  useEffect(() => {
    if (!isProcessing) {
      refreshTree();
    }
  }, [isProcessing, refreshTree]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    setInput('');
    sendMessage(trimmed);
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
        <div className="flex items-center gap-3">
          <button
            onClick={clearChat}
            className="text-xs text-slate-500 hover:text-slate-300"
            title="대화 초기화"
          >
            초기화
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
            <span className="text-xs text-slate-400">{isConnected ? '연결됨' : '미연결'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 px-3 py-2">
        {isProcessing && (
          <div className="flex justify-center mb-2">
            <button
              onClick={stopGeneration}
              className="px-3 py-1 text-xs rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              중지
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isProcessing ? 'AI가 응답 중...' : '메시지를 입력하세요...'}
            disabled={isProcessing}
            rows={1}
            className="flex-1 resize-none rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 placeholder-slate-500 disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
