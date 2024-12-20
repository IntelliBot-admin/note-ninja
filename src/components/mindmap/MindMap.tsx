import React, { useEffect, useRef } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { parseSummaryToMarkdown } from '../../utils/mindmapUtils';

interface MindMapProps {
  summary: string;
  meetingType: string;
}

export default function MindMap({ summary, meetingType }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (!svgRef.current || !summary) return;

    const transformer = new Transformer();
    const markdown = parseSummaryToMarkdown(summary, meetingType);
    const { root } = transformer.transform(markdown);

    if (!markmapRef.current) {
      markmapRef.current = Markmap.create(svgRef.current, {
        embedGlobalCSS: false,
        duration: 500,
        nodeMinHeight: 16,
        paddingX: 16,
        autoFit: true,
        color: (node: any) => {
          const colors = [
            '#4F46E5', // indigo-600
            '#7C3AED', // violet-600
            '#2563EB', // blue-600
            '#0891B2', // cyan-600
            '#059669', // emerald-600
          ];
          return colors[node.depth % colors.length];
        },
      });
    }

    markmapRef.current.setData(root);
    markmapRef.current.fit();
  }, [summary, meetingType]);

  if (!summary) {
    return null;
  }

  return (
    <div className="w-full h-full min-h-[400px] bg-white rounded-lg shadow-sm border overflow-hidden">
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}