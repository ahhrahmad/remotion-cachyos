import { type FC } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const G = {
  bg: "#282828",
  bgHard: "#1d2021",
  fg: "#ebdbb2",
  gray: "#928374",
  green: "#b8bb26",
  yellow: "#fabd2f",
  blue: "#83a598",
  aqua: "#8ec07c",
  orange: "#fe8019",
};

const SCENE = 120;

const TitleScene: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: G.bgHard,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: G.yellow,
            fontSize: 140,
            fontWeight: 700,
            letterSpacing: 4,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          CachyOS
        </div>
        <div
          style={{
            color: G.gray,
            fontSize: 36,
            marginTop: 24,
            fontFamily: "monospace",
          }}
        >
          gruvbox dark intro
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TerminalScene: FC = () => {
  const frame = useCurrentFrame();
  const cmd = "fastfetch";
  const typingStart = 10;
  const charsPerFrame = 0.5;
  const typingEnd = typingStart + cmd.length / charsPerFrame;
  const typedLen = Math.floor(
    interpolate(frame, [typingStart, typingEnd], [0, cmd.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typed = cmd.slice(0, typedLen);
  const done = typedLen >= cmd.length;
  const cursorOn = frame % 30 < 15;

  const outputStart = Math.ceil(typingEnd) + 8;
  const lines = [
    { text: "OS: CachyOS (Arch-based)", color: G.fg },
    { text: "Kernel: 6.12.x-cachyos", color: G.fg },
    { text: "DE: Hyprland", color: G.fg },
    { text: "CPU: AMD Ryzen (sched-ext)", color: G.aqua },
    { text: "Status: Lean. Fast. Local.", color: G.green },
  ];
  const visibleLines = Math.floor(
    interpolate(
      frame,
      [outputStart, outputStart + lines.length * 6],
      [0, lines.length],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: G.bgHard,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1500,
          backgroundColor: G.bg,
          borderRadius: 16,
          padding: 40,
          fontFamily: "monospace",
          fontSize: 34,
          lineHeight: 1.5,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ color: G.gray, marginBottom: 16 }}>
          $ {typed}
          {done ? "" : cursorOn ? "_" : " "}
        </div>
        {lines.slice(0, visibleLines).map((l, i) => (
          <div key={i} style={{ color: l.color }}>
            {l.text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const SloganScene: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["Lean.", "Fast.", "Local."];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: G.bgHard,
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
      }}
    >
      <div style={{ display: "flex", gap: 48 }}>
        {words.map((w, i) => {
          const start = i * 12;
          const opacity = interpolate(frame, [start, start + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = spring({
            frame: Math.max(0, frame - start),
            fps,
            config: { damping: 14 },
          });
          const translateY = interpolate(y, [0, 1], [40, 0]);
          return (
            <span
              key={w}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                color: i === 1 ? G.yellow : G.fg,
                fontSize: 120,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const CachyIntro: FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: G.bg }}>
      <Sequence durationInFrames={SCENE}>
        <TitleScene />
      </Sequence>
      <Sequence from={SCENE} durationInFrames={SCENE}>
        <TerminalScene />
      </Sequence>
      <Sequence from={SCENE * 2} durationInFrames={SCENE}>
        <SloganScene />
      </Sequence>
    </AbsoluteFill>
  );
};
