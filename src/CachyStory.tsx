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

const FPS = 30;

const TERMINAL_LINES = [
  "Mod+Return → wezterm",
  "opencode",
  "goose",
  "yazi",
  "thinkterm",
];

const PILLS = ["Lean", "Fast", "Local", "Rust"];

export const CachyStory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: Title (0-3s)
  const titleOpacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleScale = spring({ frame, fps, config: { damping: 10, stiffness: 140 } });

  // Scene 2: Terminal (3-8s)
  const termStart = 3 * FPS;
  const termEnd = 8 * FPS;
  const termOpacity = interpolate(frame, [termStart, termStart + 8, termEnd - 8, termEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 3: Pills (8-12s)
  const pillStart = 8 * FPS;
  const pillOpacity = interpolate(frame, [pillStart, pillStart + 10, 12 * FPS - 8, 12 * FPS], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 4: System info (12-16s)
  const infoOpacity = interpolate(frame, [12 * FPS, 13 * FPS, 15 * FPS, 16 * FPS], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const infoSlide = interpolate(frame, [12 * FPS, 13.5 * FPS], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 5: Outro (16-20s)
  const outroOpacity = interpolate(frame, [16 * FPS, 17 * FPS, 20 * FPS], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroScale = spring({ frame: frame - 16 * FPS, fps, config: { damping: 12, stiffness: 100 } });

  const musicVolume = (f: number) =>
    interpolate(f, [16 * FPS, 20 * FPS], [0.3, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ backgroundColor: "#282828", color: "#ebdbb2", fontFamily: "JetBrainsMono Nerd Font, monospace" }}>
      {/* Background music */}
      <Audio src={staticFile("audio/music.wav")} volume={musicVolume} />

      {/* Scene 1: Title */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: titleOpacity }}>
        <div style={{ transform: `scale(${titleScale})`, textAlign: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: "#b8bb26" }}>CachyOS</div>
          <div style={{ fontSize: 40, marginTop: 20, color: "#83a598" }}>on ThinkPad T480</div>
          <div style={{ fontSize: 26, marginTop: 32, color: "#928374" }}>i5-8350U · 16GB · niri</div>
        </div>
      </AbsoluteFill>

      {/* Scene 2: Terminal typing */}
      {frame >= termStart && frame < termEnd && (
        <AbsoluteFill style={{ padding: 80, justifyContent: "center", opacity: termOpacity }}>
          <div style={{ fontSize: 34, lineHeight: 1.8, color: "#ebdbb2" }}>
            <div style={{ color: "#928374", marginBottom: 16 }}>$ fastfetch</div>
            {TERMINAL_LINES.map((line, i) => {
              const lineStart = termStart + i * 18;
              const visible = frame >= lineStart;
              if (!visible) return null;
              return (
                <React.Fragment key={i}>
                  <Sequence from={lineStart} durationInFrames={8}>
                    <Audio src={staticFile("audio/key.wav")} volume={0.45} />
                  </Sequence>
                  <div style={{ color: "#b8bb26" }}>{line}</div>
                </React.Fragment>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 3: Pills */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: pillOpacity, padding: 60 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
          {PILLS.map((pill, i) => {
            const pillFrame = pillStart + i * 6;
            const s = spring({ frame: frame - pillFrame, fps, config: { damping: 10, stiffness: 160 } });
            const sc = interpolate(s, [0, 1], [0.6, 1]);
            const op = interpolate(frame, [pillFrame, pillFrame + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <React.Fragment key={pill}>
                <Sequence from={pillFrame} durationInFrames={6}>
                  <Audio src={staticFile("audio/mouse.wav")} volume={0.5} />
                </Sequence>
                <div
                  style={{
                    transform: `scale(${sc})`,
                    opacity: op,
                    padding: "20px 40px",
                    borderRadius: 999,
                    backgroundColor: "#3c3836",
                    border: "2px solid #b8bb26",
                    fontSize: 40,
                    fontWeight: 700,
                    color: "#b8bb26",
                  }}
                >
                  {pill}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Scene 4: System info */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: infoOpacity, padding: 60 }}>
        <div style={{ transform: `translateY(${infoSlide}px)`, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#b8bb26", marginBottom: 32 }}>Lean. Fast. Local.</div>
          <div style={{ fontSize: 26, color: "#ebdbb2", lineHeight: 2 }}>
            <div>RAM 16GB · i5-8350U · T480</div>
            <div>niri · wezterm · mpv · strata</div>
            <div>OpenCode · Goose · ai-memory</div>
            <div>Remotion → GitHub Actions</div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Scene 5: Outro */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: outroOpacity }}>
        <div style={{ transform: `scale(${outroScale})`, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#b8bb26" }}>CachyOS</div>
          <div style={{ fontSize: 32, marginTop: 20, color: "#83a598" }}>on ThinkPad T480</div>
          <div style={{ fontSize: 22, marginTop: 40, color: "#928374" }}>#linux #rust #opensource</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
