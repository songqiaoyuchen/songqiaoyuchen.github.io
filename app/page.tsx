import {Home} from '@/components/home/Home';
import {getAllArticles} from '@/lib/content/articles';

export default async function Page() {
  const articles = await getAllArticles();

  return <>
    <Home articles={articles.slice(0, 3)} />
  </>;
}
