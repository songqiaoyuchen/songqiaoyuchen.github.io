// Places the hero twice: in flow over the scene on mobile, absolutely positioned on desktop.
import {Hero} from './Hero';
import {heroStyles} from './Hero.styles';

export function HeroLayer({isHidden, useHtmlDesktopName}: {isHidden: boolean; useHtmlDesktopName: boolean}) {
  return (
    <main>
      <div className={heroStyles.mobilePlacement}>
        <Hero isHidden={isHidden} useHtmlDesktopName={useHtmlDesktopName} />
      </div>

      <div className={heroStyles.desktopPlacement}>
        <Hero isHidden={isHidden} useHtmlDesktopName={useHtmlDesktopName} />
      </div>
    </main>
  );
}
