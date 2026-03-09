import { useState, useEffect } from 'react';
import { useFileStore } from '../stores/fileStore';
import * as vfs from '../lib/vfs';
import { isTextFile, isImageFile, isPdfFile, isDocxFile, extractText } from '../lib/documents';

export default function FilePreview() {
  const { selectedFile, downloadFile } = useFileStore();
  const [content, setContent] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile || selectedFile.type === 'directory') {
      setContent(null);
      setImageUrl(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setContent(null);
      setImageUrl(null);

      try {
        const file = await vfs.readFile(selectedFile.path);
        if (cancelled) return;

        const name = selectedFile.name;

        if (isImageFile(name) && file.arrayBuffer) {
          const blob = new Blob([file.arrayBuffer], { type: file.metadata.mimeType });
          setImageUrl(URL.createObjectURL(blob));
        } else if (isTextFile(name) && file.text !== undefined) {
          setContent(file.text);
        } else if ((isPdfFile(name) || isDocxFile(name)) && file.arrayBuffer) {
          const text = await extractText(name, file.arrayBuffer);
          if (!cancelled) setContent(text);
        } else {
          setContent(`[미리보기 불가: ${file.metadata.mimeType || '알 수 없는 형식'}]`);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  if (!selectedFile || selectedFile.type === 'directory') return null;

  return (
    <div className="flex flex-col h-full bg-slate-850">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate text-slate-200">{selectedFile.name}</span>
          <span className="text-xs text-slate-500 shrink-0">
            {selectedFile.size < 1024
              ? `${selectedFile.size}B`
              : selectedFile.size < 1024 * 1024
                ? `${(selectedFile.size / 1024).toFixed(1)}KB`
                : `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB`
            }
          </span>
        </div>
        <button
          onClick={() => downloadFile(selectedFile.path)}
          className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 shrink-0"
        >
          다운로드
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {loading && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            파일 로딩 중...
          </div>
        )}
        {error && (
          <div className="text-red-400 text-sm p-2">오류: {error}</div>
        )}
        {imageUrl && (
          <div className="flex items-center justify-center h-full">
            <img src={imageUrl} alt={selectedFile.name} className="max-w-full max-h-full object-contain rounded" />
          </div>
        )}
        {content !== null && !loading && (
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
