import { useId, type CSSProperties } from 'react';

interface Props {
  /** Rendered width/height in px (the mark is square). */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Amplify brand mark: two upward chevrons that expand as they rise — a signal
 * being "amplified". Brand blue gradient, scales crisply at any size and reads
 * on both the dark sidebar and the light login card. Pair with the "Amplify"
 * wordmark.
 */
export default function Logo({ size = 28, className, style }: Props) {
  const gid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Amplify"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0958d9" />
          <stop offset="0.55" stopColor="#1677ff" />
          <stop offset="1" stopColor="#4096ff" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 24 L24 13 L37 24" />
        <path d="M15 35 L24 26 L33 35" />
      </g>
    </svg>
  );
}
