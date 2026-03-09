import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem('anthropic_api_key') || '');
    setProxyUrl(localStorage.getItem('api_proxy_url') || '');
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('anthropic_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('anthropic_api_key');
    }

    if (proxyUrl.trim()) {
      localStorage.setItem('api_proxy_url', proxyUrl.trim());
    } else {
      localStorage.removeItem('api_proxy_url');
    }

    // Notify other components
    window.dispatchEvent(new Event('storage'));

    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4">설정</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Anthropic API 키</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              API 키는 이 기기에만 저장됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              API 프록시 URL <span className="text-slate-600">(선택)</span>
            </label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="비워두면 기본 프록시 사용"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              개발 서버가 아닌 환경에서는 CORS 프록시가 필요합니다.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500"
            >
              {saved ? '저장됨 ✓' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
