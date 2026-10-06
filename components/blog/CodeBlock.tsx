// MDX code block wrapper: language label and copy button over rehype-pretty-code output.
import {Children, isValidElement} from 'react';
import type {ComponentPropsWithoutRef, ReactElement, ReactNode} from 'react';
import {CopyCodeButton} from './CopyCodeButton';

interface CodeElementProps {
  children?: ReactNode;
  'data-language'?: string;
}

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (isValidElement(node)) {
    return getTextContent((node.props as {children?: ReactNode}).children);
  }
  return '';
}

export function CodeBlock({children, ...props}: ComponentPropsWithoutRef<'pre'>) {
  const codeElement = Children.only(children) as ReactElement<CodeElementProps>;
  const code = getTextContent(codeElement.props.children).replace(/\n$/, '');
  const language = codeElement.props['data-language'] ?? 'text';

  return (
    <div className="code-block-shell">
      <div className="code-block-toolbar">
        <span className="code-block-language">{language}</span>
        <CopyCodeButton code={code} />
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
}
