import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Fastfetch config (from ~/.config/fastfetch/config.jsonc)
const LOGO = ` ▄       ▄
▄ ▀▄   ▄▀ ▄
█▄█▀███▀█▄█
▀█████████▀
 ▄▀     ▀▄`;

const LINES: { key: string; value: string; color: string; delay: number }[] = [
  { key: "ahhrahmad@lenovothinkpadt480", value: "", color: "#ff8a8a", delay: 0 },
  { key: "  OS", value: "CachyOS", color: "#71b7ff", delay: 12 },
  { key: " 󰌽 Kernel", value: "linux-cachyos", color: "#d2a8ff", delay: 24 },
  { key: "  WM", value: "niri", color: "#ff8a8a", delay: 36 },
  { key: "  Shell", value: "fish", color: "#8ddb8c", delay: 48 },
  { key: " 󰔚 Uptime", value: "3h 12m", color: "#d2b45f", delay: 60 },
  { key: "  Ram", value: "2.8G / 15G", color: "#71b7ff", delay: 72 },
  { key: " 󰸱 Color", value: "●●●●●●●●", color: "#ffffff", delay: 84 },
];

const FPS = 30;

export const IGStory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: 0-3s title
  const titleOpacity = interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });

  // Scene 2: fastfetch lines appear one by one (3-12s)
  const ffStart = 3 * FPS;
  const ffEnd = 12 * FPS;

  // Scene 3: highlights (12-17s)
  const hlOpacity = interpolate(frame, [12 * FPS, 13 * FPS, 16 * FPS, 17 * FPS], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 4: outro (17-20s)
  const outroOpacity = interpolate(frame, [17 * FPS, 18 * FPS, 20 * FPS], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const musicVolume = (f: number) =>
    interpolate(f, [17 * FPS, 20 * FPS], [0.3, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e", color: "#ebdbb2", fontFamily: "monospace" }}>
      {/* Background music */}
      <Audio src={staticFile("audio/music.wav")} volume={musicVolume} />

      {/* Scene 1: Title */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: titleOpacity }}>
        <div style={{ transform: `scale(${titleScale})`, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#b8bb26" }}>CachyOS</div>
          <div style={{ fontSize: 36, marginTop: 16, color: "#83a598" }}>on ThinkPad T480</div>
          <div style={{ fontSize: 24, marginTop: 24, color: "#928374" }}>i5-8350U · 16GB · niri · wezterm</div>
        </div>
      </AbsoluteFill>

      {/* Scene 2: Fastfetch */}
      {frame >= ffStart && frame < ffEnd && (
        <AbsoluteFill style={{ padding: 60, justifyContent: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1.6, whiteSpace: "pre" }}>
            <div style={{ color: "#ffffff", marginBottom: 12 }}>{LOGO}</div>
            {LINES.map((line, i) => {
              const lineStart = ffStart + line.delay;
              const visible = frame >= lineStart;
              if (!visible) return null;
              return (
                <React.Fragment key={i}>
                  <Sequence from={lineStart} durationInFrames={10}>
                    <Audio src={staticFile("audio/key.wav")} volume={0.4} />
                  </Sequence>
                  <div>
                    <span style={{ color: "#ffffff" }}>{line.key}</span>
                    {line.value && (
                      <>
                        <span style={{ color: "#666666" }}>  </span>
                        <span style={{ color: line.color }}>{line.value}</span>
                      </>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 3: Highlights */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: hlOpacity, padding: 60 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#b8bb26", marginBottom: 24 }}>Lean. Fast. Local.</div>
          <div style={{ fontSize: 28, color: "#ebdbb2", lineHeight: 1.8 }}>
            <div>OpenCode → standalone (no background service)</div>
            <div>Goose CLI → gemini-3.5-flash-lite</div>
            <div>WezTerm + niri · mpv · Flea/Strata</div>
            <div>Remotion → GitHub Actions render</div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Scene 4: Outro */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: outroOpacity }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#b8bb26" }}>CachyOS</div>
          <div style={{ fontSize: 28, marginTop: 16, color: "#83a598" }}>on ThinkPad T480</div>
          <div style={{ fontSize: 20, marginTop: 32, color: "#928374" }}>#linux #rust #opensource</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
