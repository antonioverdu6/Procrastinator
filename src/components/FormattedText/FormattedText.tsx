import React from 'react';
import { styles } from '../../style';

interface FormattedTextProps {
  text: string;
  inverse?: boolean;
}

const TOKEN_REGEX = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

/**
 * Renderiza texto plano con formato ligero (**negrita**, *cursiva*, `código`)
 * respetando saltos de línea sin inyectar HTML crudo.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ text, inverse = false }) => {
  const renderInline = (line: string, lineKey: number) => {
    const parts = line.split(TOKEN_REGEX);
    return parts.map((part, idx) => {
      const key = `${lineKey}-${idx}`;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={key} className={inverse ? 'font-semibold text-white' : 'font-semibold text-[#0F172A]'}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={key}
            className={
              inverse
                ? 'px-1.5 py-0.5 bg-white/20 rounded font-mono text-[11px] text-white'
                : styles.typography.inlineCode
            }
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  const lines = (text || '').split('\n');

  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderInline(line, i)}
          {i < lines.length - 1 ? '\n' : null}
        </React.Fragment>
      ))}
    </div>
  );
};
