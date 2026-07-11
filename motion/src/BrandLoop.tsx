import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();

const BG = '#fafafa';
const INK = '#111110';
const MUTED = '#6b6b67';
const ACCENT = '#2563eb';

const VERTICALS = ['FinTech', 'EdTech', 'GovTech', 'Insurance', 'GIS'];

const V_START = 46;   // frame the verticals begin
const V_EACH = 15;    // frames per vertical
const LINE_START = V_START + VERTICALS.length * V_EACH; // 121

const CurrentVertical: React.FC<{ frame: number }> = ({ frame }) => {
  const idx = Math.min(
    Math.max(Math.floor((frame - V_START) / V_EACH), 0),
    VERTICALS.length - 1,
  );
  const local = frame - (V_START + idx * V_EACH);
  const inOp = interpolate(local, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const last = idx === VERTICALS.length - 1;
  const outOp = last ? 1 : interpolate(local, [V_EACH - 5, V_EACH], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(local, [0, 6], [22, 0], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        fontSize: 132,
        fontWeight: 800,
        letterSpacing: '-0.04em',
        color: INK,
        opacity: Math.min(inOp, outOp),
        transform: `translateY(${y}px)`,
      }}
    >
      {VERTICALS[idx]}
      <span style={{ color: ACCENT }}>.</span>
    </div>
  );
};

export const BrandLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // fade the whole frame in and out so the loop is seamless
  const globalOpacity = interpolate(
    frame,
    [0, 10, durationInFrames - 14, durationInFrames - 1],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const wm = spring({ frame, fps, config: { damping: 200 } });
  const wmScale = interpolate(wm, [0, 1], [0.92, 1]);
  const wmOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  const lineOpacity = interpolate(frame, [LINE_START, LINE_START + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineY = interpolate(frame, [LINE_START, LINE_START + 20], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily }}>
      <AbsoluteFill style={{ opacity: globalOpacity }}>
        {/* accent hairline */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: ACCENT }} />

        {/* wordmark */}
        <div style={{ position: 'absolute', top: 110, width: '100%', textAlign: 'center' }}>
          <span
            style={{
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: INK,
              display: 'inline-block',
              opacity: wmOpacity,
              transform: `scale(${wmScale})`,
            }}
          >
            ahmed<span style={{ color: ACCENT }}>.</span>
          </span>
        </div>

        {/* center stage */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {frame < LINE_START ? (
            <CurrentVertical frame={frame} />
          ) : (
            <div style={{ maxWidth: 860, textAlign: 'center', padding: '0 70px', opacity: lineOpacity, transform: `translateY(${lineY}px)` }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 26 }}>
                Thirteen years · five verticals
              </div>
              <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.14, letterSpacing: '-0.02em', color: INK }}>
                Turning complexity into products <span style={{ color: ACCENT }}>people trust.</span>
              </div>
            </div>
          )}
        </AbsoluteFill>

        {/* footer caption */}
        <div style={{ position: 'absolute', bottom: 104, width: '100%', textAlign: 'center', color: MUTED, fontSize: 25, letterSpacing: '0.08em' }}>
          Digital Product Lead · MENA
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
