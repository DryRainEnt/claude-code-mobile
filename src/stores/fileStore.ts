import { create } from 'zustand';
import type { FileEntry } from '../lib/vfs';
import * as vfs from '../lib/vfs';

interface FileStoreState {
  // State
  tree: (FileEntry & { children?: FileEntry[] })[];
  currentPath: string;
  selectedFile: FileEntry | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshTree: () => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  selectFile: (entry: FileEntry | null) => void;
  importFiles: (files: File[], targetDir?: string) => Promise<string[]>;
  deleteEntry: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  renameEntry: (oldPath: string, newName: string) => Promise<void>;
  downloadFile: (path: string) => Promise<void>;
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  tree: [],
  currentPath: '/',
  selectedFile: null,
  isLoading: false,
  error: null,

  refreshTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const tree = await vfs.getDirectoryTree('/');
      set({ tree, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  navigateTo: async (path: string) => {
    set({ currentPath: path });
    await get().refreshTree();
  },

  selectFile: (entry) => {
    set({ selectedFile: entry });
  },

  importFiles: async (files, targetDir = '/') => {
    set({ isLoading: true, error: null });
    try {
      const paths = await vfs.importFiles(files, targetDir);
      await get().refreshTree();
      return paths;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return [];
    }
  },

  deleteEntry: async (path) => {
    try {
      await vfs.deleteFile(path);
      const { selectedFile } = get();
      if (selectedFile?.path === path) {
        set({ selectedFile: null });
      }
      await get().refreshTree();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  createFolder: async (path) => {
    try {
      await vfs.createDirectory(path);
      await get().refreshTree();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  renameEntry: async (oldPath, newName) => {
    try {
      const parts = oldPath.split('/').filter(Boolean);
      parts.pop();
      const newPath = '/' + [...parts, newName].join('/');
      await vfs.moveFile(oldPath, newPath);
      await get().refreshTree();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  downloadFile: async (path) => {
    try {
      const blob = await vfs.exportFile(path);
      const name = path.split('/').pop() || 'download';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
