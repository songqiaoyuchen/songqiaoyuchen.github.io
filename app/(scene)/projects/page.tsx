// Projects route (/projects): metadata only; SceneShell in the (scene) layout opens the Projects drawer.
// Its "View all projects" link leads to the full archive at /projects/all.
import type {Metadata} from 'next';

export const metadata: Metadata = {
  description: 'Selected software projects built by SQYC.',
  title: 'Projects | SQYC',
};

export default function ProjectsPage() {
  return null;
}
