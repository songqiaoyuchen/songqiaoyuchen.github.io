// The letter in the bottle at the bottom of the lake.
import type {StaticImageData} from 'next/image';
import ljubljanaPhoto from '@/public/images/letter/ljub.webp';
import kjeragPhoto from '@/public/images/letter/kjerag.webp';

export interface LakeLetterPhoto {
  /** A static import from `public/images/letter/`; left out, the page shows an empty print. */
  image?: StaticImageData;
  alt: string;
  caption: string;
}

/** One sheet of paper. Pages are authored, not flowed: keep each to about 80 words, or 40 beside a photo. */
export interface LakeLetterPage {
  heading?: string;
  photo?: LakeLetterPhoto;
  paragraphs?: readonly string[];
  /** Signs the sheet at its foot; the last page. */
  signed?: boolean;
}

export const LAKE_LETTER: {title: string; signature: string; pages: readonly LakeLetterPage[]} = {
  title: 'A Letter to Whoever Found This',
  signature: 'SQYC',
  pages: [
    {
      heading: 'Dear Stranger(?),',
      paragraphs: [
        'If you\'ve found this letter, I suppose you\'ve wandered a little further into the corner of'
        + ' my site than most people do.',
        'Welcome.',
        'My real name is Song Qiaoyuchen, but people call me either Songqiao or Yuchen.'
        + ' I was born and raised in China, spent most of my early life in Beijing,'
        + ' and moved to Singapore at the age of 14.'
      ],
    },
    {
      photo: {
        image: ljubljanaPhoto,
        alt: 'Photo of author at sunset, with city and mountains in the background.', 
        caption: 'A photo of me, at Ljubljana.'}
    },
    {
      heading: 'To be continued...',
      paragraphs: [
        'Outside the serious computer stuff, I enjoy drawing and painting and bikepacking into the middle of nowheres.'
        + ' My ultimate goal is to travel around the world with a dog and a bike, and painting the places I\'ve been to.',
        ' To be honest, I haven\'t figured out much of the road ahead yet, but I have faith.',
        'Morniello cala tuiuva.'
      ],
      signed: true,
    },
    {
      photo: {
        image: kjeragPhoto,
        alt: 'The author\'s selfie with a sheep', 
        caption: 'Me at Kjerag, Norway.'},
    }
  ],
};
