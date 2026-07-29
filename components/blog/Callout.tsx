import type {ReactNode} from 'react';

interface CalloutProps {
  children: ReactNode;
  title?: string;
}

export function Callout({children, title}: CalloutProps) {
  return (
    <aside className="article-callout">
      {title && <p className="article-callout-title">{title}</p>}
      <div>{children}</div>
    </aside>
  );
}
