import React from 'react';
import { parseHyperlinkText } from '../lib/hyperlink';

interface HyperlinkTextProps {
  text: string | null | undefined;
  className?: string;
  linkClassName?: string;
}

export const HyperlinkText: React.FC<HyperlinkTextProps> = ({
  text,
  className,
  linkClassName,
}) => {
  if (!text) return null;

  const tokens = parseHyperlinkText(text);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <React.Fragment key={idx}>{token.text}</React.Fragment>;
        }

        const isRawUrlOrEmail =
          token.label.startsWith('http://') ||
          token.label.startsWith('https://') ||
          token.label.startsWith('www.') ||
          token.label.includes('@');

        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={token.url}
            dir={isRawUrlOrEmail ? 'ltr' : 'auto'}
            className={`text-sky-400 hover:text-sky-300 underline underline-offset-2 decoration-sky-400/50 hover:decoration-sky-300 font-medium transition-colors break-all cursor-pointer ${
              linkClassName || ''
            }`}
          >
            {token.label}
          </a>
        );
      })}
    </span>
  );
};
