/**
 * Document Processor - 다양한 문서 형식에서 텍스트 추출
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// pdf.js worker 설정 - CDN에서 로드
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm',
  'css', 'js', 'ts', 'tsx', 'jsx', 'yaml', 'yml',
  'toml', 'ini', 'cfg', 'log', 'svg',
]);

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
]);

function getExtension(name: string): string {
  return name.toLowerCase().split('.').pop() || '';
}

export function isTextFile(name: string): boolean {
  return TEXT_EXTENSIONS.has(getExtension(name));
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(name));
}

export function isPdfFile(name: string): boolean {
  return getExtension(name) === 'pdf';
}

export function isDocxFile(name: string): boolean {
  return getExtension(name) === 'docx';
}

export function canExtractText(name: string): boolean {
  return isTextFile(name) || isPdfFile(name) || isDocxFile(name);
}

/**
 * PDF에서 텍스트 추출
 */
export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    if (pageText.trim()) {
      pages.push(`--- 페이지 ${i} ---\n${pageText}`);
    }
  }

  return pages.join('\n\n') || '[텍스트를 추출할 수 없는 PDF입니다]';
}

/**
 * DOCX에서 텍스트 추출
 */
export async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value || '[텍스트를 추출할 수 없는 DOCX입니다]';
}

/**
 * 이미지를 base64 data URL로 변환 (Claude Vision용)
 */
export function imageToBase64(data: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * 파일에서 텍스트 추출 (통합 인터페이스)
 */
export async function extractText(
  name: string,
  data: ArrayBuffer | string
): Promise<string> {
  if (typeof data === 'string') {
    return data; // 이미 텍스트
  }

  const ext = getExtension(name);

  if (TEXT_EXTENSIONS.has(ext)) {
    return new TextDecoder().decode(data);
  }

  if (ext === 'pdf') {
    return extractTextFromPdf(data);
  }

  if (ext === 'docx') {
    return extractTextFromDocx(data);
  }

  return `[지원되지 않는 형식: .${ext}]`;
}
