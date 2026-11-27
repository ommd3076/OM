/**
 * Hand-drawn monochrome ink line-art sketches and organic paper-edge waves
 * derived directly from Ellipsus's editorial visual grammar.
 */

export function PaperWaveEdge({
  fromColor = '#f4f4f2',
  toColor = '#f8f8f7',
  className = '',
}: {
  fromColor?: string;
  toColor?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden leading-none ${className}`}
      style={{ backgroundColor: fromColor }}
    >
      <svg
        viewBox="0 0 1440 44"
        preserveAspectRatio="none"
        className="block h-24 w-full sm:h-36"
      >
        <path
          d="M 0 28 C 210 10, 420 34, 670 20 C 910 6, 1180 36, 1440 16 L 1440 44 L 0 44 Z"
          fill={toColor}
        />
      </svg>
    </div>
  );
}

/**
 * Stacked open notebooks pencil sketch (echoes home-s3.png left margin art).
 */
export function NotebookStackSketch({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 180 150"
      fill="none"
      className={className}
    >
      {/* Top book */}
      <path
        d="M 42 30 L 130 16 L 154 44 L 66 58 Z"
        stroke="#282825"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeOpacity="0.65"
      />
      <path
        d="M 42 30 L 42 46 L 66 74 L 154 60 L 154 44"
        stroke="#282825"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeOpacity="0.65"
      />
      <path
        d="M 48 40 L 66 64 L 148 51"
        stroke="#282825"
        strokeWidth="0.9"
        strokeOpacity="0.45"
      />
      {/* Middle notebook */}
      <path
        d="M 28 62 L 66 78 L 160 64 L 142 92 L 56 106 L 24 80 Z"
        stroke="#282825"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeOpacity="0.58"
      />
      <path
        d="M 24 80 L 28 95 L 56 118 L 144 104 L 158 76"
        stroke="#282825"
        strokeWidth="1.15"
        strokeLinejoin="round"
        strokeOpacity="0.52"
      />
      {/* Sparkle stars */}
      <path
        d="M 16 24 L 16 36 M 10 30 L 22 30"
        stroke="#282825"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <path
        d="M 164 114 L 164 126 M 158 120 L 170 120"
        stroke="#282825"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

/**
 * Hand-drawn manuscript strip illustration for top of /notes/:slug (echoes article-top.png).
 */
export function ArticleHeaderLineArt({ dark = false }: { dark?: boolean }) {
  const stroke = dark ? '#ecece7' : '#282825';
  const fillBg = dark ? '#1f2321' : '#dcece4';
  const accentWash = dark ? 'rgba(227, 86, 86, 0.16)' : 'rgba(227, 86, 86, 0.18)';

  return (
    <div
      aria-hidden="true"
      className="w-full overflow-hidden border-b border-black/8"
      style={{ backgroundColor: fillBg }}
    >
      <svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="xMidYMid slice"
        className="block h-[96px] w-full sm:h-[128px]"
      >
        {/* Subtle reading beam & scattered manuscript pages */}
        <polygon points="40,18 420,104 210,148" fill={accentWash} />
        <g stroke={stroke} strokeOpacity="0.65" fill="none" strokeWidth="1.3">
          {/* Open stacked pages */}
          <path d="M 160 122 C 215 110, 275 115, 325 130 L 350 94 C 295 82, 235 80, 182 90 Z" />
          <path d="M 185 114 C 235 104, 285 108, 330 120" strokeOpacity="0.4" />
          <path d="M 205 102 C 248 94, 290 98, 335 108" strokeOpacity="0.4" />

          {/* Hand holding pencil */}
          <path d="M 650 56 L 785 48 L 802 54 L 785 60 L 650 68 Z" />
          <path d="M 692 42 C 692 26, 712 26, 714 42 L 714 78 C 714 96, 688 98, 686 80" />
          <path d="M 716 40 C 716 24, 738 24, 738 42 L 738 80" />
          <path d="M 738 42 C 740 26, 760 28, 760 46 L 758 84" />

          {/* Continuous ink thread curving rightward */}
          <path
            d="M 804 54 C 895 50, 935 102, 1025 96 C 1100 90, 1130 48, 1215 62"
            strokeOpacity="0.45"
          />

          {/* Open notebook right */}
          <path d="M 1180 54 L 1245 46 L 1255 96 L 1190 104 Z" />
          <path d="M 1245 46 L 1310 52 L 1300 102 L 1255 96" />
          <path d="M 1198 66 L 1236 62 M 1200 78 L 1238 74 M 1262 64 L 1296 68" strokeOpacity="0.4" />

          {/* Editorial sparkles */}
          <path d="M 520 34 L 520 56 M 509 45 L 531 45 M 512 37 L 528 53 M 528 37 L 512 53" strokeOpacity="0.38" />
          <path d="M 960 30 L 960 50 M 950 40 L 970 40" strokeOpacity="0.38" />
        </g>
      </svg>
    </div>
  );
}
