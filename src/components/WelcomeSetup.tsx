import { useState } from 'react';

export default function WelcomeSetup({ onComplete }: { onComplete: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('API 키를 입력해주세요.');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('올바른 Anthropic API 키 형식이 아닙니다. (sk-ant-... 로 시작)');
      return;
    }
    localStorage.setItem('anthropic_api_key', trimmed);
    window.dispatchEvent(new Event('storage'));
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">파일정리 AI</h1>
          <p className="text-sm text-slate-400">
            AI가 강의 자료를 정리해드립니다
          </p>
        </div>

        {/* Setup card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200 mb-1">시작하기</h2>
            <p className="text-sm text-slate-400">
              AI 기능을 사용하려면 Anthropic API 키가 필요합니다.
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">API 키</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-slate-200 outline-none focus:border-blue-500"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs text-slate-500">API 키 발급 방법:</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>console.anthropic.com 접속</li>
              <li>계정 생성 또는 로그인</li>
              <li>Settings &gt; API Keys 에서 키 생성</li>
              <li>생성된 키를 위에 붙여넣기</li>
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              시작하기
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2 rounded-lg text-slate-500 text-xs hover:text-slate-400 transition-colors"
            >
              나중에 설정하기 (파일 관리만 사용)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          API 키는 이 기기에만 저장되며 외부로 전송되지 않습니다.
        </p>
      </div>
    </div>
  );
}
