'use client';

import { useState, type RefObject } from 'react';

/** Renders the referenced element to a 2x PNG and downloads it. Elements with data-export-ignore="true" are skipped. */
export function useExportPng(ref: RefObject<HTMLElement | null>, fileName: string) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPng() {
    if (!ref.current) return;
    setExporting(true);
    setError(null);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error('PNG export failed', err);
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return { exportPng, exporting, error };
}
