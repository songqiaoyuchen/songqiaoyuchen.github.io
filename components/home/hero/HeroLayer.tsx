// Places the hero twice: in flow over the scene on mobile, absolutely positioned on desktop.
import {Hero} from './Hero';
import {heroStyles} from './Hero.styles';

export function HeroLayer({isHidden, useHtmlName}: {isHidden: boolean; useHtmlName: boolean}) {
  return (
    <main>
      <div className={heroStyles.mobilePlacement}>
        <Hero isHidden={isHidden} useHtmlName={useHtmlName} />
      </div>

      <div className={heroStyles.desktopPlacement}>
        <Hero isHidden={isHidden} useHtmlName={useHtmlName} />
      </div>
    </main>
  );
}
