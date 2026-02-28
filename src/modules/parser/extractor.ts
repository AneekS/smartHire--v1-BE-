import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { readFile } from 'fs/promises';

export type ExtractionResult = {
  rawText: string;
  pageCount?: number;
  wordCount: number;
  extractionMethod: 'pdf' | 'docx';
};

export async function extractTextFromFile(
  filePath: string,
  fileType: 'pdf' | 'docx'
): Promise<ExtractionResult> {
  const buffer = await readFile(filePath);

  if (fileType === 'pdf') {
    const data = await pdf(buffer);
    return {
      rawText: data.text,
      pageCount: data.numpages,
      wordCount: data.text.split(/\s+/).filter(Boolean).length,
      extractionMethod: 'pdf',
    };
  }

  if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    return {
      rawText: text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      extractionMethod: 'docx',
    };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
