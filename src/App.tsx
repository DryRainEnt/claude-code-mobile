import { useState } from 'react';
import FileTree from './components/FileTree';
import ChatPanel from './components/ChatPanel';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400"
          title="설정"
        >
          ⚙️
        </button>
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

        {/* Chat panel */}
        <main className="flex-1 min-w-0">
          <ChatPanel />
        </main>
      </div>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
