// About route (/about): metadata only; SceneShell in the (scene) layout opens the About drawer beside its path.
// ?entry=<timeline id> deep-links to one entry; while reading, the settled entry is kept there in place.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'About | SQYC',
  description: 'Song Qiaoyuchen: studies, experience and how to get in touch.',
};

export default function AboutPage() {
  return null;
}
