// A location's description in English; when it also has a Chinese version, a quiet line under it swaps between the
// two, each offer written in the language it leads to.
'use client';

import {useState, type CSSProperties} from 'react';

type Props = {text: string; chinese?: string; style?: CSSProperties};

export function LocationDescription({text, chinese, style}: Props) {
  const [showChinese, setShowChinese] = useState(false);
  if (!chinese) return <p className="places-location-description" style={style}>{text}</p>;

  return (
    <div className="places-location-description" style={style}>
      {showChinese ? <p lang="zh-Hans">{chinese}</p> : <p>{text}</p>}
      <p className="places-language">
        <button onClick={() => setShowChinese(!showChinese)} type="button">
          {showChinese ? 'Read in English' : <span lang="zh-Hans">阅读中文版</span>}
        </button>
      </p>
    </div>
  );
}
