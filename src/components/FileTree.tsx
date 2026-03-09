import { useEffect, useState, useRef } from 'react';
import { useFileStore } from '../stores/fileStore';
import type { FileEntry } from '../lib/vfs';

type TreeNode = FileEntry & { children?: TreeNode[] };

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.type === 'directory') return <span>📁</span>;
  const ext = entry.name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: '📕', docx: '📘', doc: '📘', pptx: '📙', ppt: '📙',
    xlsx: '📗', xls: '📗', csv: '📗',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
    txt: '📄', md: '📄', hwp: '📄',
  };
  return <span>{icons[ext || ''] || '📄'}</span>;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  onContextMenu,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, entry: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedPath === node.path;
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded);
    }
    onSelect(node);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      onContextMenu(e, node);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded-md text-sm select-none transition-colors
          ${isSelected ? 'bg-slate-600/50 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {node.type === 'directory' && (
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        )}
        <FileIcon entry={node} />
        <span className="truncate flex-1">{node.name}</span>
        {node.type === 'file' && (
          <span className="text-xs text-slate-500 shrink-0">{formatSize(node.size)}</span>
        )}
      </div>
      {node.type === 'directory' && expanded && node.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child as TreeNode}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

export default function FileTree() {
  const { tree, selectedFile, refreshTree, selectFile, importFiles, deleteEntry, downloadFile, createFolder } = useFileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importFiles(Array.from(files));
    }
    e.target.value = '';
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, entry: FileEntry) => {
    e.preventDefault();
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches?.[0]?.clientX ?? 0;
    const clientY = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches?.[0]?.clientY ?? 0;
    setContextMenu({ x: clientX, y: clientY, entry });
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder('/' + newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">내 파일</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="p-1.5 text-xs rounded hover:bg-slate-700 text-slate-400"
            title="새 폴더"
          >
            📁+
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-xs rounded hover:bg-slate-700 text-slate-400"
            title="파일 가져오기"
          >
            📥
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="p-1.5 text-xs rounded hover:bg-slate-700 text-slate-400"
            title="폴더 가져오기"
          >
            📂+
          </button>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-1 px-3 py-2 border-b border-slate-700">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="폴더 이름"
            className="flex-1 px-2 py-1 text-sm bg-slate-900 rounded border border-slate-600 text-slate-200 outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            className="px-2 py-1 text-xs bg-blue-600 rounded text-white hover:bg-blue-500"
          >
            생성
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImport} />
      <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleImport}
        {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
      />

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8 px-4">
            <p className="mb-2">파일이 없습니다</p>
            <p className="text-xs">상단의 📥 버튼으로 파일을 가져오세요</p>
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node as TreeNode}
              depth={0}
              selectedPath={selectedFile?.path ?? null}
              onSelect={selectFile}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.entry.type === 'file' && (
            <button
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
              onClick={() => {
                downloadFile(contextMenu.entry.path);
                setContextMenu(null);
              }}
            >
              다운로드
            </button>
          )}
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-600"
            onClick={() => {
              if (confirm(`"${contextMenu.entry.name}" 을(를) 삭제할까요?`)) {
                deleteEntry(contextMenu.entry.path);
              }
              setContextMenu(null);
            }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
