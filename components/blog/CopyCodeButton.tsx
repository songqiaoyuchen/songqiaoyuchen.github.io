'use client';

import {useEffect, useRef, useState} from 'react';

interface CopyCodeButtonProps {
  code: string;
}

export function CopyCodeButton({code}: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function copyWithSelection() {
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.append(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      copyWithSelection();
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      aria-label={copied ? 'Code copied' : 'Copy code'}
      className="code-block-copy"
      onClick={copyCode}
      type="button"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
