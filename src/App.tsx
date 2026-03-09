import { useState } from 'react';
import FileTree from './components/FileTree';
import ChatPanel from './components/ChatPanel';
import FilePreview from './components/FilePreview';
import SettingsModal from './components/SettingsModal';
import { useFileStore } from './stores/fileStore';

type RightPanel = 'chat' | 'preview';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat');
  const selectedFile = useFileStore((s) => s.selectedFile);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 text-sm md:hidden"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <h1 className="text-base font-bold text-slate-200">
            파일정리 AI
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Panel toggle tabs */}
          <div className="flex bg-slate-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setRightPanel('chat')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                rightPanel === 'chat'
                  ? 'bg-slate-600 text-slate-200'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              채팅
            </button>
            <button
              onClick={() => setRightPanel('preview')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                rightPanel === 'preview'
                  ? 'bg-slate-600 text-slate-200'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              미리보기
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400"
            title="설정"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - file tree */}
        <aside
          className={`${
            sidebarOpen ? 'w-64 md:w-72' : 'w-0'
          } shrink-0 transition-all duration-200 overflow-hidden border-r border-slate-700`}
        >
          <FileTree />
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0">
          {rightPanel === 'chat' ? (
            <ChatPanel />
          ) : selectedFile && selectedFile.type === 'file' ? (
            <FilePreview />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              왼쪽에서 파일을 선택하세요
            </div>
          )}
        </main>
      </div>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
