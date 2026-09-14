"use client";

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders mathematical expressions, LaTeX ($...$ and $$...$$),
 * and standard scientific formulas into beautifully typeset KaTeX symbols and equations.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // First, preserve block formulas: $$...$$ or \[...\]
    let processed = content;

    // Replace display math $$...$$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      try {
        return `<div class="my-2.5 overflow-x-auto py-1 text-center">${katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })}</div>`;
      } catch (e) {
        return match;
      }
    });

    // Replace display math \[...\]
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
      try {
        return `<div class="my-2.5 overflow-x-auto py-1 text-center">${katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
        })}</div>`;
      } catch (e) {
        return match;
      }
    });

    // Replace inline math $...$
    processed = processed.replace(/(?<!\w)\$([^$\n]+)\$(?!\w)/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        return match;
      }
    });

    // Replace inline math \(...\)
    processed = processed.replace(/\\\(([^\)]+)\\\)/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        return match;
      }
    });

    return processed;
  }, [content]);

  return (
    <div
      className={`leading-relaxed whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
