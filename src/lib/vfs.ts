/**
 * Virtual File System - OPFS 기반 파일 시스템 추상화
 */

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  mimeType?: string;
}

export interface FileContent {
  text?: string;
  arrayBuffer?: ArrayBuffer;
  metadata: FileEntry;
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return '/' + parts.join('/');
}

function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

function fileName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

async function navigateTo(
  path: string
): Promise<FileSystemDirectoryHandle> {
  const parts = normalizePath(path).split('/').filter(Boolean);
  let handle = await getRoot();
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  return handle;
}

async function navigateToParent(
  path: string
): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
  const parent = await navigateTo(parentPath(path));
  return { parent, name: fileName(path) };
}

export async function listDirectory(path: string = '/'): Promise<FileEntry[]> {
  const dir = await navigateTo(normalizePath(path));
  const entries: FileEntry[] = [];

  for await (const [name, handle] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    const entryPath = normalizePath(path + '/' + name);
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      entries.push({
        name,
        path: entryPath,
        type: 'file',
        size: file.size,
        mimeType: file.type || guessMimeType(name),
      });
    } else {
      entries.push({
        name,
        path: entryPath,
        type: 'directory',
        size: 0,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });
}

export async function readFile(path: string): Promise<FileContent> {
  const normalized = normalizePath(path);
  const { parent, name } = await navigateToParent(normalized);
  const fileHandle = await parent.getFileHandle(name);
  const file = await fileHandle.getFile();

  const metadata: FileEntry = {
    name,
    path: normalized,
    type: 'file',
    size: file.size,
    mimeType: file.type || guessMimeType(name),
  };

  if (isTextFile(name)) {
    return { text: await file.text(), metadata };
  }
  return { arrayBuffer: await file.arrayBuffer(), metadata };
}

export async function writeFile(
  path: string,
  content: string | ArrayBuffer
): Promise<void> {
  const normalized = normalizePath(path);
  // Ensure parent directories exist
  const parts = normalized.split('/').filter(Boolean);
  const fName = parts.pop()!;
  let dir = await getRoot();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  const fileHandle = await dir.getFileHandle(fName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteFile(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const { parent, name } = await navigateToParent(normalized);
  await parent.removeEntry(name, { recursive: true });
}

export async function createDirectory(path: string): Promise<void> {
  const parts = normalizePath(path).split('/').filter(Boolean);
  let dir = await getRoot();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
}

export async function moveFile(
  src: string,
  dest: string
): Promise<void> {
  const content = await readFile(src);
  if (content.text !== undefined) {
    await writeFile(dest, content.text);
  } else if (content.arrayBuffer) {
    await writeFile(dest, content.arrayBuffer);
  }
  await deleteFile(src);
}

export async function importFiles(
  files: File[],
  targetDir: string = '/'
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const fullPath = normalizePath(targetDir + '/' + relativePath);
    const buffer = await file.arrayBuffer();
    await writeFile(fullPath, buffer);
    paths.push(fullPath);
  }
  return paths;
}

export async function exportFile(path: string): Promise<Blob> {
  const content = await readFile(path);
  if (content.arrayBuffer) {
    return new Blob([content.arrayBuffer], {
      type: content.metadata.mimeType,
    });
  }
  return new Blob([content.text || ''], { type: 'text/plain' });
}

export async function searchFiles(
  query: string,
  path: string = '/'
): Promise<FileEntry[]> {
  const results: FileEntry[] = [];
  const lowerQuery = query.toLowerCase();

  async function walk(dirPath: string) {
    const entries = await listDirectory(dirPath);
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(lowerQuery)) {
        results.push(entry);
      }
      if (entry.type === 'directory') {
        await walk(entry.path);
      }
    }
  }

  await walk(normalizePath(path));
  return results;
}

export async function getDirectoryTree(
  path: string = '/'
): Promise<(FileEntry & { children?: FileEntry[] })[]> {
  const entries = await listDirectory(path);
  const result: (FileEntry & { children?: FileEntry[] })[] = [];

  for (const entry of entries) {
    if (entry.type === 'directory') {
      const children = await getDirectoryTree(entry.path);
      result.push({ ...entry, children });
    } else {
      result.push(entry);
    }
  }

  return result;
}

function isTextFile(name: string): boolean {
  const textExtensions = [
    '.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm',
    '.css', '.js', '.ts', '.tsx', '.jsx', '.yaml', '.yml',
    '.toml', '.ini', '.cfg', '.log', '.svg',
  ];
  const lower = name.toLowerCase();
  return textExtensions.some((ext) => lower.endsWith(ext));
}

function guessMimeType(name: string): string {
  const ext = name.toLowerCase().split('.').pop();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
    htm: 'text/html',
    hwp: 'application/x-hwp',
  };
  return map[ext || ''] || 'application/octet-stream';
}
