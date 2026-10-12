// Blog route (/blog): metadata only; SceneShell in the (scene) layout opens the Blog drawer with recent articles.
// Its "View all writing" link leads to the full archive at /blog/all.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  description: 'Refections, travel journals, and rant.',
  title: 'Blog | SQYC',
};

export default function BlogPage() {
  return null;
}
