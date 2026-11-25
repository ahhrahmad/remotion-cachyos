import React, {
  type CSSProperties,
  type FC,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/*
  CachyOS — 30s launch film.

  Everything here is code so it can be edited and re-rendered:
  - copy, palette and type are from cachyos.org's landing page (dark theme, Inter, cyan/teal + violet)
  - the mark is the official CachyOS SVG geometry, redrawn inline so every facet and dot can animate
  - audio is one quiet sound per element that appears, and nothing else
*/

const FONT = '"Inter", ui-sans-serif, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const C = {
  bg: "#02090c",
  bg2: "#041318",
  ink: "#eafbfc",
  body: "#96b5ba",
  muted: "#5d7c81",
  line: "rgba(142, 234, 240, 0.16)",
  cyan: "#0cf",
  cyanSoft: "#66e0ff",
  teal: "#0a8",
  tealLight: "#2ee9c8",
  violet: "#8b5cf6",
  violetSoft: "#c4b5fd",
  red: "#ff7a7a",
  amber: "#fbbf24",
  panel: "rgba(5, 22, 27, 0.72)",
};

const SCENE = {
  market: { from: 0, dur: 160 },
  tax: { from: 160, dur: 188 },
  fix: { from: 348, dur: 192 },
  payoff: { from: 540, dur: 184 },
  reveal: { from: 724, dur: 176 },
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

/* ------------------------------------------------------------------ */
/* Font + sound                                                        */
/* ------------------------------------------------------------------ */

const useInter = () => {
  const [handle] = useState(() => delayRender("Loading Inter"));

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    const face = new FontFace(
      "Inter",
      `url(${staticFile("fonts/inter-latin.woff2")}) format("woff2")`,
      { weight: "100 900", style: "normal" },
    );

    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        finish();
      })
      .catch(finish);
  }, [handle]);
};

type SfxName =
  | "tick"
  | "tick-low"
  | "pop"
  | "whoosh"
  | "click"
  | "chime"
  | "impact";

const SFX_GAIN: Record<SfxName, number> = {
  tick: 9,
  "tick-low": 8,
  pop: 7,
  whoosh: 10,
  click: 12,
  chime: 8,
  impact: 3.5,
};

const Sfx: FC<{ at: number; name?: SfxName; volume?: number }> = ({
  at,
  name = "tick",
  volume = 0.1,
}) => (
  <Sequence from={at} durationInFrames={50} layout="none">
    <Audio
      src={staticFile(`sfx/${name}.wav`)}
      volume={Math.min(1, volume * SFX_GAIN[name] * 1.8)}
    />
  </Sequence>
);

/* ------------------------------------------------------------------ */
/* Small motion helpers                                                */
/* ------------------------------------------------------------------ */

const Reveal: FC<{
  at: number;
  children: ReactNode;
  y?: number;
  x?: number;
  scaleFrom?: number;
  blurFrom?: number;
  sfx?: SfxName;
  volume?: number;
  style?: CSSProperties;
}> = ({
  at,
  children,
  y = 22,
  x = 0,
  scaleFrom = 1,
  blurFrom = 6,
  sfx,
  volume = 0.1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - at);
  const s = spring({
    frame: local,
    fps,
    config: { damping: 16, stiffness: 150, mass: 0.7 },
  });
  const opacity = interpolate(frame, [at, at + 7], [0, 1], clamp);
  const blur = interpolate(frame, [at, at + 12], [blurFrom, 0], clamp);

  return (
    <>
      {sfx ? <Sfx at={at} name={sfx} volume={volume} /> : null}
      <div
        style={{
          opacity,
          filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
          transform: `translate(${(1 - s) * x}px, ${(1 - s) * y}px) scale(${
            scaleFrom + (1 - scaleFrom) * s
          })`,
          ...style,
        }}
      >
        {children}
      </div>
    </>
  );
};

const SceneShell: FC<{
  dur: number;
  children: ReactNode;
  scaleFrom?: number;
  scaleTo?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  fadeOut?: number;
}> = ({
  dur,
  children,
  scaleFrom = 1.04,
  scaleTo = 1,
  xFrom = 0,
  xTo = 0,
  yFrom = 0,
  yTo = 0,
  fadeOut = 12,
}) => {
  const frame = useCurrentFrame();

  const opacity =
    fadeOut > 0
      ? interpolate(frame, [0, 12, dur - fadeOut, dur], [0, 1, 1, 0], clamp)
      : interpolate(frame, [0, 14], [0, 1], clamp);

  const scale = interpolate(frame, [0, dur], [scaleFrom, scaleTo], {
    ...clamp,
    easing: easeInOut,
  });
  const x = interpolate(frame, [0, dur], [xFrom, xTo], {
    ...clamp,
    easing: easeInOut,
  });
  const y = interpolate(frame, [0, dur], [yFrom, yTo], {
    ...clamp,
    easing: easeInOut,
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Chrome, background, atmosphere                                      */
/* ------------------------------------------------------------------ */

const CachyMark: FC<{
  size: number;
  idPrefix: string;
  frame?: number;
  start?: number;
  assembled?: boolean;
  glow?: boolean;
}> = ({
  size,
  idPrefix,
  frame = 0,
  start = 0,
  assembled = false,
  glow = false,
}) => {
  const local = Math.max(0, frame - start);
  const base = assembled
    ? 1
    : spring({
        frame: local,
        fps: 30,
        config: { damping: 17, stiffness: 110 },
      });

  const wing = (at: number, axis: "x" | "y") => {
    if (assembled) return { opacity: 1, transform: "none" };
    const s = spring({
      frame: Math.max(0, local - at),
      fps: 30,
      config: { damping: 15, stiffness: 150, mass: 0.6 },
    });
    const shift = (1 - s) * (axis === "y" ? 18 : 14);
    return {
      opacity: interpolate(local, [at, at + 5], [0, 1], clamp),
      transform:
        axis === "y" ? `translateY(${shift}px)` : `translateX(${-shift}px)`,
    };
  };

  const dot = (at: number) => {
    if (assembled) return { opacity: 1, transform: "none" };
    const s = spring({
      frame: Math.max(0, local - at),
      fps: 30,
      config: { damping: 11, stiffness: 190, mass: 0.55 },
    });
    return {
      opacity: interpolate(local, [at, at + 4], [0, 1], clamp),
      transform: `scale(${s})`,
      transformBox: "fill-box" as const,
      transformOrigin: "center" as const,
    };
  };

  const baseStyle = assembled
    ? {}
    : {
        opacity: interpolate(local, [0, 8], [0, 1], clamp),
        transform: `scale(${0.82 + base * 0.18}) rotate(${(1 - base) * -7}deg)`,
        transformOrigin: "50% 50%" as const,
      };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17.921 17.921"
      style={{
        display: "block",
        overflow: "visible",
        filter: glow ? "drop-shadow(0 0 38px rgba(0,204,255,0.34))" : undefined,
      }}
    >
      <defs>
        <linearGradient id={`${idPrefix}-base`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#12f0d0" />
          <stop offset="1" stopColor="#067a68" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-teal`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#0bbf9a" />
          <stop offset="1" stopColor="#067a68" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-cyan`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5ff7ff" />
          <stop offset="1" stopColor="#00b8e6" />
        </linearGradient>
        <radialGradient id={`${idPrefix}-dot`} cx="0.32" cy="0.3" r="0.8">
          <stop stopColor="#d9ffff" />
          <stop offset="0.45" stopColor="#2ee9ff" />
          <stop offset="1" stopColor="#009fb8" />
        </radialGradient>
      </defs>

      <g style={baseStyle}>
        <path
          fill={`url(#${idPrefix}-base)`}
          d="M4.329 1.924h8.345l-2.112 3.653H6.036L4.15 8.837l1.912 3.307h8.829l-2.167 3.745H4.15L.013 8.737l3.96-6.848z"
        />

        <g style={wing(7, "y")}>
          <path
            fill={`url(#${idPrefix}-teal)`}
            opacity=".95"
            d="m3.973 1.89 6.589 3.687 2.112-3.653zM6.062 12.144 4.149 15.89h8.575l2.166-3.746z"
          />
          <path
            fill="#0a8"
            opacity=".92"
            d="m6.036 5.577 6.638-3.653-2.112 3.653zM.013 8.737l6.023-3.16-1.886 3.26z"
          />
        </g>

        <g style={wing(14, "x")}>
          <path
            fill={`url(#${idPrefix}-cyan)`}
            opacity=".92"
            d="m3.973 1.89 6.589 3.687H6.036L4.15 8.837l1.912 3.307-1.913 3.745L.013 8.737z"
          />
          <path
            fill="#0a8"
            opacity=".9"
            d="M6.036 5.577 3.973 1.89l.177 6.949z"
          />
          <path
            fill="#0a8"
            opacity=".9"
            d="M4.15 8.838.99 10.418 4.15 15.89z"
          />
          <path
            fill="#0a8"
            opacity=".9"
            d="m.991 10.419 5.07 1.725L4.15 8.838z"
          />
        </g>

        <g style={wing(21, "y")}>
          <path
            fill={`url(#${idPrefix}-cyan)`}
            opacity=".86"
            d="m6.062 12.144 6.662 3.746 2.166-3.746z"
          />
        </g>

        <g style={dot(30)}>
          <circle
            cx="16.489"
            cy="10.647"
            r="1.423"
            fill={`url(#${idPrefix}-dot)`}
          />
        </g>
        <g style={dot(38)}>
          <circle
            cx="13.49"
            cy="7.326"
            r="1.081"
            fill={`url(#${idPrefix}-dot)`}
          />
        </g>
        <g style={dot(46)}>
          <circle
            cx="14.98"
            cy="3.6"
            r="0.556"
            fill={`url(#${idPrefix}-dot)`}
          />
        </g>
      </g>
    </svg>
  );
};

const MarkBadge: FC<{ size?: number }> = ({ size = 26 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <CachyMark size={size} idPrefix={`badge-${size}`} assembled />
    <span
      style={{
        fontFamily: FONT,
        fontWeight: 650,
        fontSize: 18,
        letterSpacing: "-0.03em",
        color: C.ink,
      }}
    >
      CachyOS
    </span>
  </div>
);

const Dust: FC = () => {
  const frame = useCurrentFrame();
  const specs = Array.from({ length: 30 }, (_, i) => {
    const x = (i * 137.5) % 100;
    const y = (i * 61.8) % 100;
    const size = i % 7 === 0 ? 3.5 : i % 3 === 0 ? 2.2 : 1.4;
    const speed = 0.006 + (i % 5) * 0.003;
    const drift = Math.sin(frame * 0.012 + i) * 12;
    return { x, y, size, speed, drift, opacity: 0.12 + (i % 4) * 0.06 };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {specs.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${(p.y + frame * p.speed) % 100}%`,
            width: p.size,
            height: p.size,
            marginLeft: p.drift,
            borderRadius: "50%",
            background: i % 6 === 0 ? C.violetSoft : C.cyanSoft,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${i % 6 === 0 ? C.violet : C.cyan}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Backdrop: FC<{ frame: number }> = ({ frame }) => {
  const slow = frame * 0.12;
  const gridShift = (frame * 0.04) % 96;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 78% 6%, rgba(139,92,246,0.16), transparent 62%), " +
            "radial-gradient(ellipse 70% 70% at 18% 92%, rgba(0,204,255,0.13), transparent 64%), " +
            "radial-gradient(ellipse 50% 50% at 50% 45%, rgba(4,30,34,0.8), transparent 80%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "6%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.2)",
          filter: "blur(130px)",
          transform: `translate(${Math.sin(slow * 0.02) * 50}px, ${Math.cos(slow * 0.015) * 30}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-6%",
          top: "58%",
          width: 620,
          height: 620,
          borderRadius: "50%",
          background: "rgba(0,204,255,0.15)",
          filter: "blur(150px)",
          transform: `translateY(${Math.sin(slow * 0.012) * 60}px)`,
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,235,240,0.045) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(120,235,240,0.045) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          backgroundPosition: `${gridShift}px ${gridShift * 0.6}px`,
          maskImage:
            "radial-gradient(ellipse 75% 75% at 50% 50%, black 10%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 75% at 50% 50%, black 10%, transparent 78%)",
        }}
      />

      <Dust />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const Chrome: FC<{ frame: number }> = ({ frame }) => {
  const fade =
    frame < 690
      ? interpolate(frame, [0, 22], [0, 0.62], clamp)
      : interpolate(frame, [690, 716], [0.62, 0], clamp);

  const progress = interpolate(frame, [0, 899], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 46,
          left: 72,
          right: 72,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <MarkBadge />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "0.22em",
            color: C.muted,
          }}
        >
          <span>PERFORMANCE-FIRST LINUX</span>
          <span style={{ width: 1, height: 12, background: C.line }} />
          <span>LAUNCH FILM / 2026</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 72,
          right: 72,
          height: 1,
          background: "rgba(142,234,240,0.12)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: 1,
            background: `linear-gradient(90deg, ${C.violet}, ${C.cyan})`,
            boxShadow: `0 0 14px ${C.cyan}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Shared typography                                                   */
/* ------------------------------------------------------------------ */

type KineticWord = { t: string; accent?: "cyan" | "violet" | "teal" };

const wordColor = (accent?: KineticWord["accent"]) => {
  if (!accent) return { color: C.ink };
  const stops =
    accent === "violet"
      ? "#c4b5fd, #8b5cf6"
      : accent === "teal"
        ? "#7dffdf, #0a8"
        : "#8af4ff, #00a3cc";
  return {
    backgroundImage: `linear-gradient(100deg, ${stops})`,
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    color: "transparent",
  };
};

const KineticLines: FC<{
  lines: KineticWord[][];
  at: number;
  stagger?: number;
  fontSize: number;
  lineHeight?: number;
  weight?: number;
  sfxVolume?: number;
  style?: CSSProperties;
}> = ({
  lines,
  at,
  stagger = 5,
  fontSize,
  lineHeight = 0.96,
  weight = 800,
  sfxVolume = 0.055,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let wordIndex = 0;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize,
        lineHeight,
        fontWeight: weight,
        letterSpacing: "-0.055em",
        color: C.ink,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap" }}>
          {line.map((word) => {
            const index = wordIndex++;
            const start = at + index * stagger;
            const local = Math.max(0, frame - start);
            const s = spring({
              frame: local,
              fps,
              config: { damping: 16, stiffness: 155, mass: 0.65 },
            });
            const opacity = interpolate(
              frame,
              [start, start + 5],
              [0, 1],
              clamp,
            );
            const blur = interpolate(frame, [start, start + 10], [7, 0], clamp);
            const y = (1 - s) * 48;
            const rot = (1 - s) * 3.5;

            return (
              <React.Fragment key={`${li}-${index}-${word.t}`}>
                <span
                  style={{
                    display: "inline-block",
                    marginRight: "0.22em",
                    opacity,
                    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                    transform: `translateY(${y}px) rotate(${rot}deg)`,
                    ...wordColor(word.accent),
                  }}
                >
                  {word.t}
                </span>
                <Sfx at={start} volume={sfxVolume} />
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Kicker: FC<{
  index: string;
  title: string;
  at?: number;
  tint?: string;
}> = ({ index, title, at = 8, tint = C.cyan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 18, stiffness: 130 },
  });
  const lineW = interpolate(frame, [at, at + 20], [0, 54], {
    ...clamp,
    easing: easeOut,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: interpolate(frame, [at, at + 6], [0, 1], clamp),
        transform: `translateY(${(1 - s) * 10}px)`,
        fontFamily: MONO,
        fontSize: 14,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: C.body,
      }}
    >
      <span style={{ color: tint, fontWeight: 700 }}>{index}</span>
      <span
        style={{
          width: lineW,
          height: 1,
          background: `linear-gradient(90deg, ${tint}, transparent)`,
        }}
      />
      <span style={{ color: C.ink, opacity: 0.9 }}>{title}</span>
      <Sfx at={at} name="tick-low" volume={0.08} />
    </div>
  );
};

const BodyCopy: FC<{
  lines: string[];
  at: number;
  width?: number;
  size?: number;
}> = ({ lines, at, width = 720, size = 29 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: FONT, width, maxWidth: "100%" }}>
      {lines.map((line, i) => {
        const start = at + i * 7;
        const opacity = interpolate(frame, [start, start + 12], [0, 1], clamp);
        const y = interpolate(frame, [start, start + 18], [16, 0], {
          ...clamp,
          easing: easeOut,
        });
        return (
          <React.Fragment key={line}>
            <div
              style={{
                fontSize: size,
                lineHeight: 1.5,
                fontWeight: 420,
                letterSpacing: "-0.025em",
                color: C.body,
                opacity,
                transform: `translateY(${y}px)`,
              }}
            >
              {line}
            </div>
            <Sfx at={start} volume={0.055} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Silicon chip                                                        */
/* ------------------------------------------------------------------ */

const SiliconChip: FC<{
  frame: number;
  start?: number;
  mode: "generic" | "optimized";
  size?: number;
}> = ({ frame, start = 0, mode, size = 500 }) => {
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - start);
  const s = spring({
    frame: local,
    fps,
    config: { damping: 17, stiffness: 110, mass: 0.8 },
  });
  const reveal = interpolate(frame, [start, start + 12], [0, 1], clamp);

  const cells = Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const pattern = (row * 5 + col * 3) % 7;
    const genericOn = pattern < 2;
    const wave = 0.5 + 0.5 * Math.sin(col * 0.75 + row * 0.4 - frame * 0.12);
    const active = mode === "optimized" || genericOn;
    const glow = active
      ? mode === "optimized"
        ? 0.45 + wave * 0.55
        : 0.35 + wave * 0.35
      : 0.06;
    return { row, col, active, glow };
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        opacity: reveal,
        transform: `perspective(1200px) rotateY(-13deg) rotateX(7deg) scale(${0.88 + s * 0.12})`,
        filter: "drop-shadow(0 34px 60px rgba(0,0,0,0.55))",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 560 560"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`chip-body-${mode}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#0a2025" />
            <stop offset="1" stopColor="#040e11" />
          </linearGradient>
          <linearGradient id={`chip-edge-${mode}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={C.cyan} stopOpacity=".8" />
            <stop offset=".55" stopColor={C.teal} stopOpacity=".35" />
            <stop offset="1" stopColor={C.violet} stopOpacity=".65" />
          </linearGradient>
          <linearGradient id={`chip-cell-${mode}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8af4ff" />
            <stop offset="1" stopColor="#0a8" />
          </linearGradient>
        </defs>

        {Array.from({ length: 12 }, (_, i) => {
          const p = 148 + i * 22;
          return (
            <g
              key={i}
              stroke={`url(#chip-edge-${mode})`}
              strokeWidth="3"
              strokeLinecap="round"
            >
              <line x1={p} y1="112" x2={p} y2="136" opacity=".55" />
              <line x1={p} y1="424" x2={p} y2="448" opacity=".55" />
              <line x1="112" y1={p} x2="136" y2={p} opacity=".55" />
              <line x1="424" y1={p} x2="448" y2={p} opacity=".55" />
            </g>
          );
        })}

        <rect
          x="132"
          y="132"
          width="296"
          height="296"
          rx="26"
          fill={`url(#chip-body-${mode})`}
          stroke={`url(#chip-edge-${mode})`}
          strokeWidth="1.6"
        />
        <rect
          x="142"
          y="142"
          width="276"
          height="276"
          rx="18"
          fill="none"
          stroke="rgba(120,235,240,0.1)"
        />

        <g opacity={reveal}>
          {cells.map((cell, i) => {
            const x = 166 + cell.col * 29;
            const y = 166 + cell.row * 29;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="4"
                fill={`url(#chip-cell-${mode})`}
                opacity={cell.glow}
                style={{
                  filter: cell.active
                    ? `drop-shadow(0 0 5px rgba(0,204,255,0.5))`
                    : undefined,
                }}
              />
            );
          })}
        </g>

        <rect
          x="242"
          y="242"
          width="76"
          height="76"
          rx="10"
          fill="#02090c"
          stroke="rgba(120,235,240,0.3)"
        />
        <text
          x="280"
          y="278"
          textAnchor="middle"
          fontFamily={MONO}
          fontSize="12"
          letterSpacing="1"
          fill={C.cyanSoft}
        >
          {mode === "optimized" ? "v4" : "x86"}
        </text>
        <text
          x="280"
          y="296"
          textAnchor="middle"
          fontFamily={MONO}
          fontSize="9"
          letterSpacing="1"
          fill={C.muted}
        >
          {mode === "optimized" ? "NATIVE" : "64"}
        </text>
      </svg>
    </div>
  );
};

const OrbitDot: FC<{
  frame: number;
  radius: number;
  speed: number;
  offset: number;
  color: string;
}> = ({ frame, radius, speed, offset, color }) => {
  const angle = frame * speed + offset;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 14px ${color}`,
        transform: `rotate(${angle}deg) translateX(${radius}px)`,
      }}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Scene 1 — the ceiling                                               */
/* ------------------------------------------------------------------ */

const MarketScene: FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneShell
      dur={SCENE.market.dur}
      scaleFrom={1.055}
      scaleTo={1}
      xFrom={26}
      xTo={-8}
    >
      <div style={{ position: "absolute", left: 128, top: 206, width: 940 }}>
        <Kicker index="01" title="The ceiling" at={6} />

        <div style={{ marginTop: 34 }}>
          <KineticLines
            at={16}
            fontSize={108}
            lines={[
              [
                { t: "Your" },
                { t: "CPU" },
                { t: "is" },
                { t: "fast.", accent: "cyan" },
              ],
              [{ t: "Your" }, { t: "OS" }],
              [{ t: "isn't.", accent: "violet" }],
            ]}
          />
        </div>

        <div style={{ marginTop: 42 }}>
          <BodyCopy
            at={76}
            width={740}
            lines={[
              "Your hardware is ready. Generic binaries still leave",
              "performance on the table.",
            ]}
          />
        </div>
      </div>

      <Reveal
        at={24}
        sfx="whoosh"
        volume={0.13}
        y={50}
        x={30}
        scaleFrom={0.94}
        blurFrom={10}
      >
        <div
          style={{
            position: "absolute",
            left: 1070,
            top: 188,
            width: 700,
            height: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 620,
              height: 620,
              borderRadius: "50%",
              border: "1px dashed rgba(120,235,240,0.18)",
              transform: `rotate(${frame * 0.12}deg)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: "50%",
              border: "1px solid rgba(139,92,246,0.16)",
            }}
          />
          <OrbitDot
            frame={frame}
            radius={305}
            speed={0.4}
            offset={10}
            color={C.cyan}
          />
          <OrbitDot
            frame={frame}
            radius={305}
            speed={0.4}
            offset={190}
            color={C.violet}
          />

          <div style={{ position: "absolute" }}>
            <SiliconChip frame={frame} start={24} mode="generic" size={510} />
          </div>

          <Reveal
            at={58}
            sfx="pop"
            volume={0.1}
            y={12}
            style={{ position: "absolute", top: 52, right: 34 }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.18em",
                color: C.violetSoft,
                border: "1px solid rgba(139,92,246,0.4)",
                background: "rgba(139,92,246,0.1)",
                padding: "10px 14px",
                borderRadius: 999,
              }}
            >
              GENERIC BUILD
            </div>
          </Reveal>

          <Reveal
            at={70}
            sfx="tick-low"
            volume={0.08}
            y={10}
            style={{ position: "absolute", bottom: 46, left: 46 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.amber,
                  boxShadow: `0 0 12px ${C.amber}`,
                }}
              />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  color: C.muted,
                }}
              >
                HEADROOM, UNUSED
              </span>
            </div>
          </Reveal>
        </div>
      </Reveal>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 2 — the tax                                                   */
/* ------------------------------------------------------------------ */

const TerminalLine: FC<{
  at: number;
  children: ReactNode;
  color?: string;
  muted?: boolean;
}> = ({ at, children, color = C.ink, muted = false }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [at, at + 8], [0, 1], clamp);
  const x = interpolate(frame, [at, at + 12], [-12, 0], {
    ...clamp,
    easing: easeOut,
  });
  return (
    <>
      <div
        style={{
          opacity,
          transform: `translateX(${x}px)`,
          color: muted ? C.muted : color,
          fontSize: 22,
          lineHeight: 1.62,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
      <Sfx at={at} name="click" volume={0.07} />
    </>
  );
};

const TerminalWindow: FC = () => {
  const frame = useCurrentFrame();
  const error = frame >= 104;

  const progress = interpolate(frame, [58, 100], [0, 0.87], {
    ...clamp,
    easing: easeOut,
  });
  const jam = frame >= 100 ? 0.87 + Math.sin(frame * 0.45) * 0.005 : progress;

  return (
    <Reveal
      at={16}
      sfx="whoosh"
      volume={0.13}
      y={44}
      x={30}
      scaleFrom={0.95}
      blurFrom={10}
    >
      <div style={{ position: "relative", width: 860 }}>
        <div
          style={{
            position: "absolute",
            inset: -34,
            background: error
              ? "radial-gradient(ellipse at 60% 50%, rgba(255,90,90,0.16), transparent 70%)"
              : "radial-gradient(ellipse at 60% 50%, rgba(139,92,246,0.18), transparent 70%)",
            filter: "blur(24px)",
          }}
        />

        <div
          style={{
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            background: "rgba(4,14,17,0.94)",
            border: `1px solid ${error ? "rgba(255,122,122,0.42)" : "rgba(120,235,240,0.18)"}`,
            boxShadow:
              "0 32px 90px rgba(0,0,0,0.6), inset 0 1px rgba(255,255,255,0.04)",
            transform: "perspective(1400px) rotateY(-7deg) rotateX(3deg)",
            transformOrigin: "50% 50%",
          }}
        >
          <div
            style={{
              height: 50,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 20px",
              borderBottom: "1px solid rgba(120,235,240,0.1)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#febc2e",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
            <span
              style={{
                marginLeft: 16,
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.16em",
                color: C.muted,
              }}
            >
              cachyos-setup — zsh
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 11,
                color: error ? C.red : C.muted,
              }}
            >
              {error ? "FAILED" : "BUILDING"}
            </span>
          </div>

          <div style={{ padding: "24px 28px 30px", fontFamily: MONO }}>
            <TerminalLine at={30} muted>
              <span style={{ color: C.tealLight }}>$</span> paru -S
              linux-cachyos-bore
            </TerminalLine>
            <TerminalLine at={44} muted>
              :: rebuilding 1,842 packages from source
            </TerminalLine>
            <TerminalLine at={52} muted>
              [ 312/1842] mesa
            </TerminalLine>
            <TerminalLine at={62} muted>
              [ 806/1842] python
            </TerminalLine>
            <TerminalLine at={72} muted>
              [ 1,207/1842] glibc
            </TerminalLine>
            <TerminalLine at={82} color={C.amber}>
              warning: ccache miss — rebuilding cold
            </TerminalLine>
            <TerminalLine at={92} muted>
              [ 1,601/1842] rust
            </TerminalLine>

            <div style={{ marginTop: 12, marginBottom: 6 }}>
              <Sfx at={58} name="tick-low" volume={0.06} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: MONO,
                  fontSize: 12,
                  color: C.muted,
                  marginBottom: 7,
                }}
              >
                <span>COMPILE</span>
                <span>{Math.round(jam * 100)}%</span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: "rgba(120,235,240,0.09)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${jam * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${C.teal}, ${C.cyan})`,
                    boxShadow: `0 0 14px ${C.cyan}`,
                  }}
                />
              </div>
            </div>

            <TerminalLine at={104} color={C.red}>
              error: conflicting dependencies
            </TerminalLine>
            <TerminalLine at={114} muted>
              linux-cachyos-bore and linux conflict
            </TerminalLine>
            <TerminalLine at={128} muted>
              <span style={{ color: C.tealLight }}>$</span> sudo pacman -Syu
            </TerminalLine>
            <TerminalLine at={140} color={C.amber}>
              :: update would break 3 packages
            </TerminalLine>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: MONO,
                fontSize: 13,
                color: error ? C.red : C.muted,
                opacity: interpolate(frame, [140, 150], [0, 1], clamp),
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: error ? C.red : C.amber,
                  boxShadow: `0 0 10px ${error ? C.red : C.amber}`,
                }}
              />
              attempt 14 · 3h 42m · still tweaking
            </div>
          </div>
        </div>

        <Reveal
          at={116}
          sfx="pop"
          volume={0.11}
          y={14}
          style={{ position: "absolute", right: -34, top: -30 }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.16em",
              padding: "12px 16px",
              borderRadius: 12,
              color: C.violetSoft,
              background: "rgba(24,12,42,0.92)",
              border: "1px solid rgba(139,92,246,0.45)",
              boxShadow: "0 14px 32px rgba(0,0,0,0.4)",
            }}
          >
            HOMEWORK.EXE
          </div>
        </Reveal>

        <Reveal
          at={146}
          sfx="tick-low"
          volume={0.06}
          y={10}
          style={{ position: "absolute", left: -28, bottom: -26 }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              color: C.muted,
              background: "rgba(4,14,17,0.92)",
              border: "1px solid rgba(120,235,240,0.14)",
              padding: "10px 14px",
              borderRadius: 999,
            }}
          >
            ONE UPDATE LATER
          </div>
        </Reveal>
      </div>
    </Reveal>
  );
};

const TaxScene: FC = () => {
  return (
    <SceneShell
      dur={SCENE.tax.dur}
      scaleFrom={1}
      scaleTo={1.03}
      xFrom={0}
      xTo={-26}
      yFrom={0}
      yTo={-8}
    >
      <div style={{ position: "absolute", left: 128, top: 210, width: 780 }}>
        <Kicker index="02" title="The tax" at={7} tint={C.violetSoft} />

        <div style={{ marginTop: 34 }}>
          <KineticLines
            at={18}
            fontSize={100}
            lines={[
              [{ t: "Speed" }],
              [{ t: "shouldn't" }],
              [{ t: "be" }, { t: "homework.", accent: "violet" }],
            ]}
          />
        </div>

        <div style={{ marginTop: 36 }}>
          <BodyCopy
            at={64}
            width={640}
            size={27}
            lines={[
              "Compile kernels. Patch schedulers. Rebuild every",
              "package. Then pray the next update doesn't",
              "break it all.",
            ]}
          />
        </div>
      </div>

      <div style={{ position: "absolute", left: 965, top: 214 }}>
        <TerminalWindow />
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 3 — built fast                                                */
/* ------------------------------------------------------------------ */

const PackagePill: FC<{ label: string; at: number; style: CSSProperties }> = ({
  label,
  at,
  style,
}) => (
  <Reveal
    at={at}
    sfx="pop"
    volume={0.11}
    y={16}
    scaleFrom={0.8}
    style={{ position: "absolute", ...style }}
  >
    <div
      style={{
        fontFamily: MONO,
        fontSize: 14,
        letterSpacing: "0.06em",
        color: C.ink,
        padding: "11px 17px",
        borderRadius: 999,
        background: "rgba(5, 26, 31, 0.9)",
        border: "1px solid rgba(120,235,240,0.25)",
        boxShadow:
          "0 12px 30px rgba(0,0,0,0.35), 0 0 24px rgba(0,204,255,0.08)",
      }}
    >
      {label}
    </div>
  </Reveal>
);

const FeatureRow: FC<{ at: number; label: string; sub: string }> = ({
  at,
  label,
  sub,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const opacity = interpolate(frame, [at, at + 7], [0, 1], clamp);
  const width = interpolate(frame, [at, at + 18], [0, 28], {
    ...clamp,
    easing: easeOut,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity,
        transform: `translateX(${(1 - s) * -24}px)`,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width,
          height: 1,
          background: `linear-gradient(90deg, ${C.teal}, ${C.cyan})`,
          boxShadow: `0 0 8px ${C.cyan}`,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 18,
            color: C.ink,
            letterSpacing: "-0.01em",
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 17,
            color: C.muted,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
      <Sfx at={at} name="tick-low" volume={0.08} />
    </div>
  );
};

const FixScene: FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneShell
      dur={SCENE.fix.dur}
      scaleFrom={1.035}
      scaleTo={1}
      xFrom={20}
      xTo={-6}
    >
      <div style={{ position: "absolute", left: 128, top: 190, width: 800 }}>
        <Kicker index="03" title="Built fast" at={7} tint={C.tealLight} />

        <div style={{ marginTop: 34 }}>
          <KineticLines
            at={18}
            fontSize={108}
            lines={[
              [{ t: "Speed,", accent: "teal" }],
              [{ t: "compiled" }, { t: "in.", accent: "cyan" }],
            ]}
          />
        </div>

        <div style={{ marginTop: 32 }}>
          <BodyCopy
            at={52}
            width={670}
            size={27}
            lines={[
              "CachyOS rebuilds the entire stack for your CPU —",
              "kernel to packages. The gains are there before",
              "you tweak a thing.",
            ]}
          />
        </div>

        <div style={{ marginTop: 34 }}>
          <FeatureRow
            at={82}
            label="x86-64-v3 / v4 + Zen4"
            sub="CPU-native package builds"
          />
          <FeatureRow
            at={94}
            label="LTO · PGO · BOLT"
            sub="Optimized core packages"
          />
          <FeatureRow
            at={106}
            label="EEVDF · BORE · sched-ext"
            sub="A kernel tuned for response"
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1010,
          top: 188,
          width: 760,
          height: 740,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 330,
            letterSpacing: "-0.08em",
            color: C.cyan,
            opacity: 0.045,
            transform: "translateY(-10px)",
          }}
        >
          v4
        </div>

        <div
          style={{
            position: "absolute",
            width: 560,
            height: 560,
            borderRadius: "50%",
            border: "1px dashed rgba(46,233,200,0.22)",
            transform: `rotate(${-frame * 0.18}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 690,
            height: 690,
            borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.14)",
            transform: `rotate(${frame * 0.1}deg)`,
          }}
        />

        <OrbitDot
          frame={frame}
          radius={300}
          speed={0.55}
          offset={20}
          color={C.cyan}
        />
        <OrbitDot
          frame={frame}
          radius={345}
          speed={-0.35}
          offset={140}
          color={C.violet}
        />

        <div style={{ position: "absolute" }}>
          <Reveal
            at={16}
            sfx="whoosh"
            volume={0.14}
            y={36}
            scaleFrom={0.9}
            blurFrom={10}
          >
            <SiliconChip frame={frame} start={16} mode="optimized" size={520} />
          </Reveal>
        </div>

        <PackagePill label="kernel" at={44} style={{ left: 34, top: 154 }} />
        <PackagePill label="glibc" at={54} style={{ right: 22, top: 224 }} />
        <PackagePill label="mesa" at={64} style={{ left: 68, bottom: 158 }} />
        <PackagePill
          label="python"
          at={74}
          style={{ right: 42, bottom: 120 }}
        />

        <Reveal
          at={92}
          sfx="chime"
          volume={0.1}
          y={16}
          scaleFrom={0.9}
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            marginLeft: -124,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.2em",
              color: C.cyanSoft,
              border: "1px solid rgba(0,204,255,0.3)",
              background: "rgba(0,204,255,0.08)",
              borderRadius: 999,
              padding: "11px 18px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.cyan,
                boxShadow: `0 0 10px ${C.cyan}`,
              }}
            />
            NO MANUAL REBUILDS
          </div>
        </Reveal>
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 4 — the payoff                                                */
/* ------------------------------------------------------------------ */

const IconGrid: FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconTerminal: FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path
      d="m7 9 3 3-3 3M13 15h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChip: FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path
      d="M9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"
      strokeLinecap="round"
    />
  </svg>
);

const IconLoop: FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path
      d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PayoffCard: FC<{
  at: number;
  index: string;
  stat: string;
  title: string;
  copy: string;
  icon: ReactNode;
  tint: string;
}> = ({ at, index, stat, title, copy, icon, tint }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 15, stiffness: 130, mass: 0.8 },
  });
  const opacity = interpolate(frame, [at, at + 8], [0, 1], clamp);
  const lineW = interpolate(frame, [at + 6, at + 26], [0, 1], clamp);

  return (
    <Reveal at={at} sfx="pop" volume={0.1} y={52} scaleFrom={0.94} blurFrom={8}>
      <div
        style={{
          position: "relative",
          width: 402,
          height: 348,
          borderRadius: 16,
          padding: "26px 26px 24px",
          background:
            "linear-gradient(145deg, rgba(7,26,31,0.9), rgba(3,12,15,0.94))",
          border: "1px solid rgba(120,235,240,0.16)",
          boxShadow: `0 24px 50px rgba(0,0,0,0.34), inset 0 1px rgba(255,255,255,0.04)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 2,
            background: `linear-gradient(90deg, ${tint}, transparent 80%)`,
            transform: `scaleX(${lineW})`,
            transformOrigin: "left",
            boxShadow: `0 0 18px ${tint}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 190,
            height: 190,
            borderRadius: "50%",
            background: tint,
            opacity: 0.07,
            filter: "blur(40px)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.18em",
              color: C.muted,
            }}
          >
            {index}
          </span>
          <span style={{ color: tint, opacity: 0.9 }}>{icon}</span>
        </div>

        <div
          style={{
            marginTop: 25,
            fontFamily: FONT,
            fontSize: 66,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.055em",
            color: C.ink,
            transform: `translateY(${(1 - s) * 10}px)`,
          }}
        >
          {stat}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT,
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: "-0.03em",
            color: tint,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT,
            fontSize: 17,
            lineHeight: 1.45,
            color: C.body,
            letterSpacing: "-0.02em",
          }}
        >
          {copy}
        </div>
        <div
          style={{
            position: "absolute",
            left: 26,
            right: 26,
            bottom: 18,
            height: 1,
            background: "rgba(120,235,240,0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 26,
            bottom: 12,
            width: 34,
            height: 1,
            background: tint,
            opacity: opacity * 0.85,
          }}
        />
      </div>
    </Reveal>
  );
};

const PayoffScene: FC = () => {
  return (
    <SceneShell
      dur={SCENE.payoff.dur}
      scaleFrom={1.03}
      scaleTo={1}
      xFrom={0}
      xTo={-14}
    >
      <div style={{ position: "absolute", left: 128, top: 146, width: 1600 }}>
        <Kicker index="04" title="The payoff" at={6} tint={C.cyanSoft} />
        <div style={{ marginTop: 28 }}>
          <KineticLines
            at={16}
            fontSize={98}
            lines={[
              [{ t: "Yours," }],
              [
                { t: "out", accent: "cyan" },
                { t: "of" },
                { t: "the", accent: "cyan" },
                { t: "box." },
              ],
            ]}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 128,
          top: 432,
          display: "flex",
          gap: 22,
        }}
      >
        <PayoffCard
          at={58}
          index="01"
          stat="17+"
          title="desktops & WMs"
          copy="KDE, GNOME, COSMIC, Hyprland, Niri and more. Pick one at install."
          icon={<IconGrid />}
          tint={C.cyan}
        />
        <PayoffCard
          at={68}
          index="02"
          stat="2"
          title="installers"
          copy="A guided GUI setup, or a CLI that gives you every switch."
          icon={<IconTerminal />}
          tint={C.tealLight}
        />
        <PayoffCard
          at={78}
          index="03"
          stat="0"
          title="manual rebuilds"
          copy="Your stack arrives compiled for your CPU. No homework."
          icon={<IconChip />}
          tint={C.violetSoft}
        />
        <PayoffCard
          at={88}
          index="04"
          stat="∞"
          title="rolling updates"
          copy="Arch repos and the AUR, current. No reinstall treadmill."
          icon={<IconLoop />}
          tint={C.cyanSoft}
        />
      </div>

      <Reveal
        at={138}
        sfx="chime"
        volume={0.08}
        y={14}
        style={{ position: "absolute", left: 128, top: 862 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 26,
              height: 1,
              background: C.tealLight,
              boxShadow: `0 0 10px ${C.tealLight}`,
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: "0.16em",
              color: C.body,
            }}
          >
            EVERYTHING TUNED. NOTHING TO COMPILE.
          </span>
        </div>
      </Reveal>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 5 — logo reveal                                               */
/* ------------------------------------------------------------------ */

const Halo: FC<{ frame: number }> = ({ frame }) => {
  const rings = [
    { size: 360, opacity: 0.24, speed: 0.16 },
    { size: 500, opacity: 0.15, speed: -0.11 },
    { size: 660, opacity: 0.09, speed: 0.07 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 364,
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -340,
          top: -340,
          width: 680,
          height: 680,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,204,255,0.16), rgba(139,92,246,0.06) 42%, transparent 68%)",
          filter: "blur(30px)",
        }}
      />
      {rings.map((ring, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -ring.size / 2,
            top: -ring.size / 2,
            width: ring.size,
            height: ring.size,
            borderRadius: "50%",
            border: `1px ${i === 1 ? "dashed" : "solid"} rgba(120,235,240,${ring.opacity})`,
            transform: `rotate(${frame * ring.speed}deg)`,
          }}
        />
      ))}
      <OrbitDot
        frame={frame}
        radius={250}
        speed={0.5}
        offset={30}
        color={C.cyan}
      />
      <OrbitDot
        frame={frame}
        radius={330}
        speed={-0.3}
        offset={220}
        color={C.violet}
      />
      <OrbitDot
        frame={frame}
        radius={180}
        speed={0.7}
        offset={120}
        color={C.tealLight}
      />
    </div>
  );
};

const Wordmark: FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letters = "CachyOS".split("");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 750,
        fontSize: 116,
        letterSpacing: "-0.065em",
        lineHeight: 1,
        color: C.ink,
      }}
    >
      {letters.map((letter, i) => {
        const start = at + i * 3;
        const s = spring({
          frame: Math.max(0, frame - start),
          fps,
          config: { damping: 15, stiffness: 150, mass: 0.65 },
        });
        return (
          <React.Fragment key={`${letter}-${i}`}>
            <span
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [start, start + 5], [0, 1], clamp),
                transform: `translateY(${(1 - s) * 40}px)`,
                filter: `blur(${interpolate(frame, [start, start + 10], [8, 0], clamp)}px)`,
                backgroundImage:
                  i === 0
                    ? "linear-gradient(110deg, #ffffff, #bfefff 40%, #66e0ff)"
                    : undefined,
                WebkitBackgroundClip: i === 0 ? "text" : undefined,
                backgroundClip: i === 0 ? "text" : undefined,
                color: i === 0 ? "transparent" : C.ink,
              }}
            >
              {letter}
            </span>
            <Sfx at={start} volume={0.045} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Tagline: FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const words = ["Performance-first", "Linux,", "built", "on", "Arch."];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.28em",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 450,
        letterSpacing: "-0.03em",
        color: C.body,
      }}
    >
      {words.map((word, i) => {
        const start = at + i * 6;
        return (
          <React.Fragment key={word}>
            <span
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
                transform: `translateY(${interpolate(
                  frame,
                  [start, start + 16],
                  [16, 0],
                  {
                    ...clamp,
                    easing: easeOut,
                  },
                )}px)`,
              }}
            >
              {word}
            </span>
            <Sfx at={start} volume={0.05} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const UrlPill: FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const opacity = interpolate(frame, [at, at + 10], [0, 1], clamp);
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.08);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${(1 - s) * 26}px) scale(${0.94 + s * 0.06})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 30px",
          borderRadius: 999,
          border: "1px solid rgba(0,204,255,0.42)",
          background:
            "linear-gradient(100deg, rgba(0,204,255,0.13), rgba(139,92,246,0.13))",
          boxShadow: `0 0 ${28 + glow * 16}px rgba(0,204,255,0.16), inset 0 1px rgba(255,255,255,0.08)`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: C.cyan,
            boxShadow: `0 0 12px ${C.cyan}`,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 25,
            letterSpacing: "0.02em",
            color: C.ink,
          }}
        >
          cachyos.org
        </span>
        <span style={{ color: C.cyanSoft, fontSize: 24, lineHeight: 1 }}>
          →
        </span>
      </div>
    </div>
  );
};

const RevealScene: FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneShell
      dur={SCENE.reveal.dur}
      fadeOut={0}
      scaleFrom={1}
      scaleTo={1.045}
    >
      <Halo frame={frame} />

      <Sfx at={4} name="whoosh" volume={0.14} />
      <Sfx at={11} name="tick" volume={0.06} />
      <Sfx at={18} name="tick" volume={0.06} />
      <Sfx at={25} name="tick" volume={0.06} />
      <Sfx at={34} name="pop" volume={0.08} />
      <Sfx at={42} name="pop" volume={0.08} />
      <Sfx at={50} name="pop" volume={0.08} />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 230,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <CachyMark size={260} idPrefix="hero" frame={frame} start={4} glow />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 520,
          textAlign: "center",
        }}
      >
        <Wordmark at={40} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 658 }}>
        <Tagline at={72} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 736 }}>
        <UrlPill at={100} />
      </div>

      <Sfx at={100} name="chime" volume={0.12} />

      <Reveal
        at={122}
        sfx="whoosh"
        volume={0.1}
        y={0}
        style={{ position: "absolute", left: 0, right: 0, top: 820 }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.28em",
            color: C.muted,
          }}
        >
          FREE · OPEN SOURCE · COMMUNITY-DRIVEN
        </div>
      </Reveal>

      <Reveal
        at={140}
        sfx="chime"
        volume={0.1}
        y={0}
        style={{ position: "absolute", left: 0, right: 0, top: 878 }}
      >
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 15,
              letterSpacing: "0.12em",
              color: C.cyanSoft,
              textTransform: "uppercase",
            }}
          >
            Download free
          </span>
        </div>
      </Reveal>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const CachyLaunch: FC = () => {
  useInter();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{ backgroundColor: C.bg, overflow: "hidden", fontFamily: FONT }}
    >
      <Backdrop frame={frame} />

      <Sfx at={2} name="whoosh" volume={0.08} />
      <Sfx at={SCENE.tax.from} name="whoosh" volume={0.12} />
      <Sfx at={SCENE.fix.from} name="whoosh" volume={0.12} />
      <Sfx at={SCENE.payoff.from} name="whoosh" volume={0.12} />
      <Sfx at={4} name="tick-low" volume={0.05} />

      <Sequence from={SCENE.market.from} durationInFrames={SCENE.market.dur}>
        <MarketScene />
      </Sequence>
      <Sequence from={SCENE.tax.from} durationInFrames={SCENE.tax.dur}>
        <TaxScene />
      </Sequence>
      <Sequence from={SCENE.fix.from} durationInFrames={SCENE.fix.dur}>
        <FixScene />
      </Sequence>
      <Sequence from={SCENE.payoff.from} durationInFrames={SCENE.payoff.dur}>
        <PayoffScene />
      </Sequence>
      <Sequence from={SCENE.reveal.from} durationInFrames={SCENE.reveal.dur}>
        <RevealScene />
      </Sequence>

      <Chrome frame={frame} />
    </AbsoluteFill>
  );
};
