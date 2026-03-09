import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('anthropic_api_key') || '';
    setApiKey(key);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('anthropic_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('anthropic_api_key');
    }
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

          <div className="flex gap-2 justify-end">
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
