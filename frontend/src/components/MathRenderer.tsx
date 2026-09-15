"use client";

import React, { useMemo } from 'react';
import katex from 'katex';
import { marked } from 'marked';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * High-precision Academic Math & Markdown Renderer.
 * Cleans formatting artifacts (excessive asterisks **** and slashes ////),
 * fixes broken/asymmetric LLM LaTeX delimiters,
 * converts standard Markdown (headers, lists, bold, tables, blockquotes),
 * and renders all LaTeX mathematical symbols and equations using KaTeX.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    let text = content;

    // 1. Clean formatting artifacts: excessive asterisks (****) or slashes (////)
    text = text.replace(/\*{4,}/g, '**');
    text = text.replace(/\/([\/]{2,})/g, '/');

    // 2. Clean double-escaped backslashes before LaTeX commands (e.g., \\frac -> \frac)
    text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

    // 3. Fix rogue/nested dollar signs inside LaTeX expressions:
    // e.g. \sum_{n=0}^{$\infty$} -> \sum_{n=0}^{\infty}
    // e.g. $\frac{f^{(n)}$(0)}{n!} -> $\frac{f^{(n)}(0)}{n!}
    text = text.replace(/\{[^{}]*?\$([^\$\n]+?)\$[^{}]*?\}/g, (m) => m.replace(/\$/g, ''));
    text = text.replace(/(\\[a-zA-Z]+[^{}\$\n]*?)\$([^\$\n]+?)\$/g, '$1$2');
    text = text.replace(/\$\\frac\{([^\}]+)\}\$([^\s\$]+)/g, '$\\frac{$1}$2$');

    // 4. Line-by-line inspection for standalone equations, list formulas, and asymmetric dollars
    const lines = text.split('\n');
    const normalizedLines = lines.map((line) => {
      let l = line.trim();
      if (!l) return line;

      // Check if line has a single trailing dollar sign without a matching opening dollar
      const dollarCount = (l.match(/(?<!\$)\$(?!\$)/g) || []).length;
      if (dollarCount === 1 && l.endsWith('$') && !l.startsWith('$')) {
        if (l.includes('\\') || l.includes('=')) {
          l = '$' + l;
          return l;
        }
      }

      // Check if line is a bullet item with a formula after the last colon:
      // e.g. "- Key concept: The derivative, defined as ... approaches zero: \frac{df}{dx} = ... $"
      const lastColonIdx = l.lastIndexOf(':');
      if (lastColonIdx !== -1 && (l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))) {
        const prefix = l.slice(0, lastColonIdx + 1);
        let suffix = l.slice(lastColonIdx + 1).trim();

        // If suffix contains LaTeX commands or mathematical equations:
        const suffixDollars = (suffix.match(/(?<!\$)\$(?!\$)/g) || []).length;
        if (suffixDollars === 1 && suffix.endsWith('$') && !suffix.startsWith('$')) {
          suffix = '$' + suffix;
          return `${prefix} ${suffix}`;
        } else if (suffixDollars === 0 && (suffix.includes('\\frac') || suffix.includes('\\lim') || suffix.includes('\\sum') || suffix.includes('\\int') || suffix.includes('\\sqrt') || suffix.includes('\\sin') || suffix.includes('\\cos') || suffix.includes('='))) {
          if (suffix.includes('\\') || suffix.includes('=')) {
            return `${prefix} $${suffix}$`;
          }
        }
      }

      // Standalone pure formula line without dollars:
      if (!l.startsWith('#') && !l.startsWith('-') && !l.startsWith('*') && !/^\d+\./.test(l)) {
        if (!l.includes('$') && (l.includes('\\frac') || l.includes('\\lim') || l.includes('\\sum') || l.includes('\\int') || l.includes('\\sqrt') || l.includes('\\begin'))) {
          return `$$\n${l}\n$$`;
        }
      }

      return l;
    });

    text = normalizedLines.join('\n');

    // 5. Wrap standard LaTeX environments like \begin{aligned}...\end{aligned} in $$...$$ if not wrapped
    text = text.replace(
      /(?<!\$\$|\\\[)\s*(\\begin\{(?:aligned|align|equation|matrix|pmatrix|bmatrix|cases|gather)\*?\}[\s\S]*?\\end\{(?:aligned|align|equation|matrix|pmatrix|bmatrix|cases|gather)\*?\})\s*(?!\$\$|\\\])/g,
      '\n\n$$$$ $1 $$$$\n\n'
    );

    // 6. Fix unmatched single $$ line
    const doubleDollarCount = (text.match(/\$\$/g) || []).length;
    if (doubleDollarCount % 2 !== 0) {
      text = text.replace(/^\s*\$\$\s*$/m, '');
    }

    // Helper to clean formula internals before KaTeX
    const cleanMathExpression = (raw: string) => {
      let clean = raw.trim();
      clean = clean.replace(/\$/g, '');
      clean = clean.replace(/\\lim_\s*\{/g, '\\lim_{');
      return clean;
    };

    const mathTokens = new Map<string, string>();
    let tokenCounter = 0;

    // 7. Extract and render display math $$...$$
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const tokenId = `KATEXBLOCKTOKENX${tokenCounter++}XEND`;
      const cleanFormula = cleanMathExpression(formula);
      try {
        const rendered = katex.renderToString(cleanFormula, {
          displayMode: true,
          throwOnError: false,
        });
        mathTokens.set(
          tokenId,
          `<div class="katex-display-wrapper my-3 overflow-x-auto py-1 text-center">${rendered}</div>`
        );
      } catch (e) {
        mathTokens.set(tokenId, match);
      }
      return `\n\n${tokenId}\n\n`;
    });

    // 8. Extract and render display math \[...\]
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
      const tokenId = `KATEXBLOCKTOKENX${tokenCounter++}XEND`;
      const cleanFormula = cleanMathExpression(formula);
      try {
        const rendered = katex.renderToString(cleanFormula, {
          displayMode: true,
          throwOnError: false,
        });
        mathTokens.set(
          tokenId,
          `<div class="katex-display-wrapper my-3 overflow-x-auto py-1 text-center">${rendered}</div>`
        );
      } catch (e) {
        mathTokens.set(tokenId, match);
      }
      return `\n\n${tokenId}\n\n`;
    });

    // 9. Extract and render inline math $...$
    text = text.replace(/(?<!\\)\$([^\$\n\r]+?)\$/g, (match, formula) => {
      const tokenId = `KATEXINLINETOKENX${tokenCounter++}XEND`;
      const cleanFormula = cleanMathExpression(formula);
      try {
        const rendered = katex.renderToString(cleanFormula, {
          displayMode: false,
          throwOnError: false,
        });
        mathTokens.set(
          tokenId,
          `<span class="katex-inline-wrapper px-0.5 inline-block align-baseline">${rendered}</span>`
        );
      } catch (e) {
        mathTokens.set(tokenId, match);
      }
      return tokenId;
    });

    // 10. Extract and render inline math \(...\)
    text = text.replace(/\\\(([^\)]+?)\\\)/g, (match, formula) => {
      const tokenId = `KATEXINLINETOKENX${tokenCounter++}XEND`;
      const cleanFormula = cleanMathExpression(formula);
      try {
        const rendered = katex.renderToString(cleanFormula, {
          displayMode: false,
          throwOnError: false,
        });
        mathTokens.set(
          tokenId,
          `<span class="katex-inline-wrapper px-0.5 inline-block align-baseline">${rendered}</span>`
        );
      } catch (e) {
        mathTokens.set(tokenId, match);
      }
      return tokenId;
    });

    // 11. Convert Markdown to structured semantic HTML
    let html: string;
    try {
      html = marked.parse(text, {
        gfm: true,
        breaks: true,
      }) as string;
    } catch (e) {
      html = text;
    }

    // 12. Re-insert rendered KaTeX formulas in place of tokens
    mathTokens.forEach((renderedHtml, tokenId) => {
      html = html.split(`<p>${tokenId}</p>`).join(renderedHtml);
      html = html.split(tokenId).join(renderedHtml);
    });

    return html;
  }, [content]);

  return (
    <div
      className={`markdown-content text-xs leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

