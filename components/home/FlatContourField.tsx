import type { RefObject } from 'react';
import { extendedRoutePath, EXPERIENCE_ROUTE_POINTS } from '@/config/homeScroll';

type Contour = { d: string; major?: boolean; opacity?: number };

// Hand-shaped isolines rather than parallel waves: nested closed contours,
// edge fragments, saddles, and small summit loops create a printed map read.
const TOPOGRAPHIC_CONTOURS: Contour[] = [
  { d: 'M -45 128 C 12 116 18 42 91 25 C 155 10 235 27 270 70 C 302 110 268 145 207 151 C 132 158 59 132 -45 154', major: true },
  { d: 'M 24 111 C 19 73 58 39 108 34 C 164 28 220 48 232 79 C 245 111 205 132 157 130 C 103 128 39 139 24 111' },
  { d: 'M 66 97 C 63 67 93 49 128 49 C 171 49 201 65 198 87 C 195 110 165 117 130 112 C 101 108 69 118 66 97' },
  { d: 'M 105 85 C 113 68 145 64 164 75 C 180 84 166 97 145 98 C 126 100 99 98 105 85', opacity: 0.34 },
  { d: 'M 242 -16 C 281 19 311 36 353 27 C 402 17 424 -8 469 8 C 507 22 509 65 550 72 C 603 82 632 30 690 40', major: true },
  { d: 'M 303 -18 C 328 4 354 10 380 2 C 414 -8 454 -3 471 24 C 487 50 467 78 497 94 C 522 108 553 89 574 68' },
  { d: 'M 616 104 C 642 42 715 14 786 25 C 857 36 867 91 928 100 C 976 107 1019 77 1053 39', major: true },
  { d: 'M 673 92 C 690 55 736 37 782 44 C 830 51 843 80 880 87 C 918 95 951 77 974 55' },
  { d: 'M 724 80 C 739 60 765 54 791 59 C 817 64 828 78 848 79 C 865 80 880 73 891 64', opacity: 0.34 },
  { d: 'M -40 478 C 20 490 44 542 104 564 C 164 586 227 568 263 526 C 293 491 334 466 386 477', major: true },
  { d: 'M 22 503 C 56 521 74 557 120 570 C 169 584 221 561 237 532 C 253 505 220 486 183 490 C 141 494 120 519 82 514' },
  { d: 'M 84 531 C 109 548 139 558 170 549 C 198 541 213 523 200 509 C 187 495 153 501 134 511 C 118 520 96 518 84 531' },
  { d: 'M 318 614 C 355 568 397 547 440 557 C 488 568 500 606 547 603 C 590 600 607 555 654 548 C 700 542 726 573 756 602', major: true },
  { d: 'M 390 614 C 414 581 449 574 473 589 C 501 606 526 618 555 597 C 578 580 587 563 615 562' },
  { d: 'M 650 525 C 683 476 752 459 817 472 C 879 484 912 531 968 539 C 1006 545 1031 530 1060 505', major: true },
  { d: 'M 707 514 C 733 486 774 478 814 487 C 855 496 872 522 906 527 C 937 531 957 518 974 503' },
  { d: 'M 754 506 C 774 492 802 493 822 503 C 840 512 841 523 861 523 C 875 523 888 517 896 509', opacity: 0.34 },
];

type Props = {
  topRef: RefObject<HTMLDivElement | null>;
  bottomRef: RefObject<HTMLDivElement | null>;
  contoursRef: RefObject<SVGGElement | null>;
};

function FieldSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Boundary() {
  return (
    <path
      d={extendedRoutePath(EXPERIENCE_ROUTE_POINTS)}
      fill="none"
      stroke="rgba(232, 199, 122, 0.76)"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function FlatContourField({ topRef, bottomRef, contoursRef }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div ref={topRef} className="absolute inset-0">
        <FieldSvg><Boundary /></FieldSvg>
      </div>
      <div ref={bottomRef} className="absolute inset-0">
        <FieldSvg><Boundary /></FieldSvg>
      </div>
      <FieldSvg>
        <g ref={contoursRef} opacity="0">
          {TOPOGRAPHIC_CONTOURS.map((contour) => (
            <path
              key={contour.d}
              d={contour.d}
              fill="none"
              stroke={`rgba(232, 199, 122, ${contour.opacity ?? (contour.major ? 0.3 : 0.2)})`}
              strokeWidth={contour.major ? 1.05 : 0.72}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </FieldSvg>
    </div>
  );
}
