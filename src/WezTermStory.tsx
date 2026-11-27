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
  Img,
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
  WezTerm — 30s Instagram Story (1080x1920).

  Angle: performance + built-in multiplexer.
  Copy is limited to documented WezTerm features: GPU acceleration,
  Lua configuration, ligatures/true color, Linux/macOS/Windows, and the
  built-in multiplexer. Everything is drawn in code; the only external
  assets are the official icon, Inter and JetBrains Mono.
*/

const FONT = '"Inter", ui-sans-serif, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const C = {
  bg: "#080d10",
  bg2: "#0c151a",
  ink: "#eef3f7",
  body: "#9aabb5",
  muted: "#5f7480",
  indigo: "#4e49ee",
  indigoSoft: "#9b97ff",
  cyan: "#4cc9f0",
  green: "#3ddc97",
  amber: "#ffb454",
  magenta: "#ff5c8a",
  line: "rgba(146, 170, 184, 0.16)",
  bar: "#121c22",
  panel: "#0a1115",
};

const SCENE = {
  hook: { from: 0, dur: 150 },
  tax: { from: 150, dur: 180 },
  fix: { from: 330, dur: 210 },
  payoff: { from: 540, dur: 210 },
  reveal: { from: 750, dur: 150 },
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

/* ------------------------------------------------------------------ */
/* Fonts + sound                                                       */
/* ------------------------------------------------------------------ */

const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading WezTerm fonts"));

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    const inter = new FontFace(
      "Inter",
      `url(${staticFile("fonts/inter-latin.woff2")}) format("woff2")`,
      { weight: "100 900", style: "normal" },
    );
    const mono = new FontFace(
      "JetBrains Mono",
      `url(${staticFile("fonts/jetbrains-mono-latin.woff2")}) format("woff2")`,
      { weight: "400 700", style: "normal" },
    );

    Promise.all([inter.load(), mono.load()])
      .then((faces) => {
        faces.forEach((face) => document.fonts.add(face));
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
/* Motion helpers                                                      */
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
  const s = spring({
    frame: Math.max(0, frame - at),
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
  yFrom?: number;
  yTo?: number;
  fadeOut?: number;
}> = ({
  dur,
  children,
  scaleFrom = 1.035,
  scaleTo = 1,
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
  const y = interpolate(frame, [0, dur], [yFrom, yTo], {
    ...clamp,
    easing: easeInOut,
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const typed = (text: string, frame: number, at: number, cps = 26) => {
  const count = Math.floor(((frame - at) / 30) * cps);
  return text.slice(0, Math.max(0, Math.min(text.length, count)));
};

const Cursor: FC<{ frame: number; color?: string }> = ({
  frame,
  color = C.indigoSoft,
}) => (
  <span
    style={{
      display: "inline-block",
      width: "0.55em",
      height: "1.05em",
      marginLeft: 3,
      verticalAlign: "-0.16em",
      background: color,
      opacity: frame % 30 < 16 ? 0.95 : 0.12,
    }}
  />
);

const accentGradient = (tone: "indigo" | "amber" = "indigo") =>
  tone === "amber"
    ? "linear-gradient(100deg, #ffd9a3 0%, #ffb454 45%, #ff5c8a 100%)"
    : "linear-gradient(100deg, #d6d4ff 0%, #9b97ff 42%, #4e49ee 100%)";

/* ------------------------------------------------------------------ */
/* Type                                                                */
/* ------------------------------------------------------------------ */

const Kicker: FC<{ index: string; title: string; at: number }> = ({
  index,
  title,
  at,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 18, stiffness: 160 },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
      }}
    >
      <div
        style={{
          width: 46 * s,
          height: 2,
          borderRadius: 2,
          background: C.indigo,
        }}
      />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: "0.22em",
          color: C.indigoSoft,
        }}
      >
        {index}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 17,
          letterSpacing: "0.22em",
          color: C.muted,
        }}
      >
        {title}
      </span>
    </div>
  );
};

const Headline: FC<{
  at: number;
  lines: { t: string; accent?: boolean }[];
  size?: number;
  tone?: "indigo" | "amber";
}> = ({ at, lines, size = 96, tone = "indigo" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let cursor = 0;

  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.99,
        letterSpacing: "-0.055em",
        color: C.ink,
      }}
    >
      {lines.map((line, li) => {
        const words = line.t.split(" ");
        const offset = cursor;
        cursor += words.length;

        return (
          <div
            key={li}
            style={{ display: "flex", flexWrap: "wrap", columnGap: "0.24em" }}
          >
            {words.map((word, wi) => {
              const start = at + (offset + wi) * 3;
              const s = spring({
                frame: Math.max(0, frame - start),
                fps,
                config: { damping: 15, stiffness: 150, mass: 0.65 },
              });
              const accent = line.accent;

              return (
                <span
                  key={`${word}-${wi}`}
                  style={{
                    display: "inline-block",
                    opacity: interpolate(
                      frame,
                      [start, start + 8],
                      [0, 1],
                      clamp,
                    ),
                    transform: `translateY(${(1 - s) * 34}px)`,
                    filter: `blur(${interpolate(
                      frame,
                      [start, start + 12],
                      [7, 0],
                      clamp,
                    )}px)`,
                    backgroundImage: accent
                      ? accentGradient(tone)
                      : undefined,
                    WebkitBackgroundClip: accent ? "text" : undefined,
                    backgroundClip: accent ? "text" : undefined,
                    color: accent ? "transparent" : undefined,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const Body: FC<{
  at: number;
  children: ReactNode;
  size?: number;
  color?: string;
  width?: number;
  style?: CSSProperties;
}> = ({ at, children, size = 29, color = C.body, width = 860, style }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        lineHeight: 1.4,
        letterSpacing: "-0.02em",
        color,
        maxWidth: width,
        opacity: interpolate(frame, [at, at + 12], [0, 1], clamp),
        transform: `translateY(${interpolate(frame, [at, at + 18], [16, 0], {
          ...clamp,
          easing: easeOut,
        })}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Backdrop                                                            */
/* ------------------------------------------------------------------ */

const Backdrop: FC<{ frame: number }> = ({ frame }) => {
  const drift = Math.sin(frame / 220) * 46;
  const drift2 = Math.cos(frame / 260) * 40;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1100px 900px at 52% 8%, #17242c 0%, #0a1115 52%, #070b0e 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(140,170,185,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,185,0.055) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          maskImage:
            "radial-gradient(820px 1180px at 50% 46%, black, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(820px 1180px at 50% 46%, black, transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 600 + drift,
          top: -280,
          width: 820,
          height: 820,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(78,73,238,0.32), rgba(78,73,238,0.06) 48%, transparent 66%)",
          filter: "blur(38px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -260 + drift2,
          top: 1320,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(76,201,240,0.14), transparent 64%)",
          filter: "blur(46px)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(125% 95% at 50% 48%, transparent 52%, rgba(0,0,0,0.58) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Terminal chrome                                                     */
/* ------------------------------------------------------------------ */

const Dots: FC = () => (
  <div style={{ display: "flex", gap: 7 }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
      <div
        key={color}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          opacity: 0.55,
        }}
      />
    ))}
  </div>
);

const TermWindow: FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  tabs?: string[];
  activeTab?: number;
  rotate?: number;
  z?: number;
  compact?: boolean;
  children: ReactNode;
  status?: ReactNode;
}> = ({
  x,
  y,
  w,
  h,
  title,
  tabs,
  activeTab = 0,
  rotate = 0,
  z = 1,
  compact = false,
  children,
  status,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      zIndex: z,
      display: "flex",
      flexDirection: "column",
      borderRadius: 16,
      overflow: "hidden",
      background: C.panel,
      border: "1px solid rgba(150, 175, 190, 0.22)",
      boxShadow:
        "0 36px 90px rgba(0,0,0,0.62), 0 0 0 1px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
    }}
  >
    <div
      style={{
        height: compact ? 44 : 54,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 16px",
        background: C.bar,
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <Dots />
      <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
        {tabs ? (
          tabs.map((tab, i) => (
            <div
              key={tab}
              style={{
                padding: compact ? "4px 10px" : "6px 13px",
                borderRadius: 8,
                fontFamily: MONO,
                fontSize: compact ? 12 : 13,
                color: i === activeTab ? "#dcdcff" : C.muted,
                background:
                  i === activeTab ? "rgba(78,73,238,0.24)" : "transparent",
              }}
            >
              {tab}
            </div>
          ))
        ) : (
          <span
            style={{
              fontFamily: MONO,
              fontSize: compact ? 12 : 13,
              color: C.body,
            }}
          >
            {title}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.16em",
          color: C.muted,
        }}
      >
        WEZTERM
      </span>
    </div>

    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: compact ? "12px 14px" : "22px 24px",
        fontFamily: MONO,
        fontSize: compact ? 14 : 19,
        lineHeight: 1.62,
        color: "#c9d6dd",
        overflow: "hidden",
      }}
    >
      {children}
    </div>

    {status ? (
      <div
        style={{
          height: 32,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          borderTop: `1px solid ${C.line}`,
          background: "rgba(18,28,34,0.6)",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          color: C.muted,
        }}
      >
        {status}
      </div>
    ) : null}
  </div>
);

const Prompt: FC<{ path: string; cmd: string; cursor?: ReactNode }> = ({
  path,
  cmd,
  cursor,
}) => (
  <div style={{ whiteSpace: "nowrap" }}>
    <span style={{ color: C.green }}>{path}</span>
    <span style={{ color: C.indigoSoft }}> &gt; </span>
    <span style={{ color: C.ink }}>{cmd}</span>
    {cursor}
  </div>
);

/* ------------------------------------------------------------------ */
/* Scene 1 — hook                                                      */
/* ------------------------------------------------------------------ */

const HookScene: FC = () => {
  const frame = useCurrentFrame();
  const command = typed("cargo build --release", frame, 46, 24);
  const run = typed("./target/release/api", frame, 106, 24);

  return (
    <SceneShell dur={SCENE.hook.dur} yFrom={8} yTo={-6}>
      <div style={{ position: "absolute", left: 84, top: 296, width: 912 }}>
        <Kicker index="01" title="THE TERMINAL" at={4} />
        <div style={{ marginTop: 30 }}>
          <Headline
            at={12}
            size={104}
            lines={[
              { t: "You live in" },
              { t: "the terminal.", accent: true },
            ]}
          />
        </div>
        <div style={{ marginTop: 32 }}>
          <Body at={66} size={31} width={780}>
            It shouldn’t slow you down.
          </Body>
        </div>
      </div>

      <Reveal
        at={26}
        sfx="whoosh"
        volume={0.11}
        y={56}
        scaleFrom={0.95}
        blurFrom={10}
      >
        <TermWindow
          x={84}
          y={790}
          w={912}
          h={480}
          title="api"
          tabs={["wezterm", "api"]}
          activeTab={1}
          status={
            <>
              <span>UTF-8 · zsh</span>
              <span>120×32</span>
            </>
          }
        >
          <Prompt path="~/dev/api" cmd={command} />
          <div
            style={{
              color: C.muted,
              opacity: interpolate(frame, [78, 86], [0, 1], clamp),
            }}
          >
            {"   Compiling api v0.9.0"}
          </div>
          <div
            style={{
              color: C.green,
              opacity: interpolate(frame, [86, 94], [0, 1], clamp),
            }}
          >
            {"    Finished `release` in 3.84s"}
          </div>
          <div style={{ marginTop: 14 }}>
            <Prompt
              path="~/dev/api"
              cmd={run}
              cursor={<Cursor frame={frame} />}
            />
          </div>
          <div
            style={{
              color: C.cyan,
              opacity: interpolate(frame, [136, 144], [0, 1], clamp),
            }}
          >
            {"listening on :3000"}
          </div>
        </TermWindow>
      </Reveal>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 2 — the tax                                                   */
/* ------------------------------------------------------------------ */

const TaxScene: FC = () => {
  const frame = useCurrentFrame();
  const switches = Math.round(
    interpolate(frame, [104, 146], [0, 27], clamp),
  );

  return (
    <SceneShell dur={SCENE.tax.dur} yFrom={-6} yTo={8}>
      <div style={{ position: "absolute", left: 84, top: 296, width: 912 }}>
        <Kicker index="02" title="THE TAX" at={4} />
        <div style={{ marginTop: 30 }}>
          <Headline
            at={12}
            size={98}
            tone="amber"
            lines={[
              { t: "Three windows" },
              { t: "deep.", accent: true },
            ]}
          />
        </div>
        <div style={{ marginTop: 30 }}>
          <Body at={48} size={27} width={840}>
            Tabs for local. Another window for SSH. tmux on top.
          </Body>
        </div>
      </div>

      <Reveal at={26} sfx="whoosh" volume={0.1} y={50} scaleFrom={0.95}>
        <TermWindow
          x={84}
          y={836}
          w={730}
          h={252}
          compact
          title="local"
          tabs={["local", "tab 14"]}
          activeTab={1}
          rotate={-2}
          z={1}
        >
          <Prompt path="~/dev/api" cmd="npm test" />
          <div style={{ color: C.green }}>{" PASS  src/api.test.ts"}</div>
          <div style={{ color: C.green }}>{" PASS  src/db.test.ts"}</div>
        </TermWindow>
      </Reveal>

      <Reveal at={52} sfx="whoosh" volume={0.1} y={50} scaleFrom={0.95}>
        <TermWindow
          x={196}
          y={1018}
          w={710}
          h={252}
          compact
          title="ssh"
          tabs={["prod-02"]}
          rotate={1.3}
          z={2}
        >
          <Prompt path="deploy@prod-02" cmd="tail -f app.log" />
          <div style={{ color: C.body }}>{"12:04 GET /health 200"}</div>
          <div style={{ color: C.body }}>{"12:04 GET /feed   200"}</div>
        </TermWindow>
      </Reveal>

      <Reveal at={78} sfx="whoosh" volume={0.1} y={50} scaleFrom={0.95}>
        <TermWindow
          x={300}
          y={1200}
          w={680}
          h={252}
          compact
          title="tmux"
          tabs={["tmux"]}
          rotate={-0.9}
          z={3}
        >
          <div style={{ color: C.amber }}>{"[0] local*  [1] prod  [2] logs"}</div>
          <div style={{ color: C.muted }}>{"tmux: 3 sessions, 6 panes"}</div>
          <div style={{ color: C.muted }}>{"prefix + arrow to switch"}</div>
        </TermWindow>
      </Reveal>

      <Reveal
        at={104}
        y={16}
        style={{ position: "absolute", left: 84, top: 1508, width: 912 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: C.magenta,
                opacity: 0.55 + 0.45 * Math.sin(frame * 0.18),
              }}
            />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 15,
                letterSpacing: "0.2em",
                color: C.muted,
              }}
            >
              CONTEXT SWITCHES
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 74,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: C.amber,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(switches).padStart(2, "0")}
          </div>
        </div>
      </Reveal>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 3 — one window                                                */
/* ------------------------------------------------------------------ */

const Pane: FC<{
  label: string;
  color: string;
  at: number;
  children: ReactNode;
  style?: CSSProperties;
}> = ({ label, color, at, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 17, stiffness: 150 },
  });

  return (
    <div
      style={{
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        background: "#080e12",
        border: `1px solid ${C.line}`,
        padding: "12px 14px",
        fontFamily: MONO,
        fontSize: 14,
        lineHeight: 1.62,
        color: "#c9d6dd",
        opacity: interpolate(frame, [at, at + 8], [0, 1], clamp),
        transform: `translateY(${(1 - s) * 18}px) scale(${0.97 + s * 0.03})`,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 8,
          fontSize: 10,
          letterSpacing: "0.2em",
          color: C.muted,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
          }}
        />
        {label}
      </div>
      {children}
    </div>
  );
};

const FixScene: FC = () => {
  const frame = useCurrentFrame();
  const local = typed("cargo test", frame, 56, 22);
  const prod = typed("systemctl status api", frame, 72, 22);

  return (
    <SceneShell dur={SCENE.fix.dur} yFrom={8} yTo={-6}>
      <div style={{ position: "absolute", left: 84, top: 296, width: 912 }}>
        <Kicker index="03" title="ONE WINDOW" at={4} />
        <div style={{ marginTop: 30 }}>
          <Headline
            at={12}
            size={98}
            lines={[
              { t: "One window." },
              { t: "Every host.", accent: true },
            ]}
          />
        </div>
      </div>

      <Reveal at={18} sfx="whoosh" volume={0.12} y={52} scaleFrom={0.96}>
        <TermWindow
          x={84}
          y={700}
          w={912}
          h={700}
          title="wezterm"
          tabs={["local", "prod-02", "logs"]}
          activeTab={0}
          status={
            <>
              <span>MULTIPLEXER · 3 PANES</span>
              <span>GPU</span>
            </>
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "42% 58%",
              gap: 10,
              height: "100%",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateRows: "1fr 1fr",
                gap: 10,
                minHeight: 0,
              }}
            >
              <Pane label="LOCAL" color={C.green} at={40}>
                <div>
                  <span style={{ color: C.green }}>~/dev/api</span>
                  <span style={{ color: C.indigoSoft }}> &gt; </span>
                  <span style={{ color: C.ink }}>{local}</span>
                </div>
                <div style={{ color: C.muted }}>
                  {"running 24 tests"}
                </div>
                <div style={{ color: C.green }}>
                  {"test result: ok"}
                </div>
              </Pane>
              <Pane label="PROD" color={C.cyan} at={56}>
                <div style={{ color: C.muted }}>{"ssh prod-02"}</div>
                <div>
                  <span style={{ color: C.cyan }}>ubuntu@prod-02</span>
                  <span style={{ color: C.indigoSoft }}> &gt; </span>
                  <span style={{ color: C.ink }}>{prod}</span>
                </div>
                <div style={{ color: C.green }}>{"active (running)"}</div>
              </Pane>
            </div>

            <Pane label="LOGS" color={C.amber} at={72}>
              <div style={{ color: C.muted }}>
                {"kubectl logs -f deploy/api"}
              </div>
              <div>{"12:04:11 GET /health 200 3ms"}</div>
              <div>{"12:04:12 GET /feed   200 41ms"}</div>
              <div>{"12:04:12 POST /post  201 88ms"}</div>
              <div>{"12:04:13 GET /feed   200 39ms"}</div>
              <div>{"12:04:13 GET /health 200 2ms"}</div>
              <div style={{ color: C.muted }}>
                {"tail -f  ·  streaming"}
              </div>
            </Pane>
          </div>
        </TermWindow>
      </Reveal>

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 1448,
          width: 912,
          display: "flex",
          gap: 14,
        }}
      >
        <Reveal at={108} sfx="tick" volume={0.08} y={14}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "12px 18px",
              borderRadius: 999,
              border: "1px solid rgba(78,73,238,0.5)",
              background: "rgba(78,73,238,0.16)",
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: "0.14em",
              color: "#dcdcff",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.indigoSoft,
              }}
            />
            GPU-ACCELERATED
          </div>
        </Reveal>
        <Reveal at={118} sfx="tick" volume={0.08} y={14}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "12px 18px",
              borderRadius: 999,
              border: "1px solid rgba(61,220,151,0.4)",
              background: "rgba(61,220,151,0.1)",
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: "0.14em",
              color: C.green,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.green,
              }}
            />
            MULTIPLEXER BUILT IN
          </div>
        </Reveal>
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 4 — payoff                                                    */
/* ------------------------------------------------------------------ */

const IconBolt: FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <path
      d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBraces: FC = () => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "-0.06em",
    }}
  >
    {"{}"}
  </span>
);

const IconLigature: FC = () => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: 25,
      fontWeight: 700,
      letterSpacing: "-0.04em",
    }}
  >
    {"->"}
  </span>
);

const IconMonitor: FC = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="4"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M9 20h6M12 16v4"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const PayoffCard: FC<{
  at: number;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  mono?: boolean;
}> = ({ at, icon, title, body, mono = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 16, stiffness: 140, mass: 0.7 },
  });

  return (
    <div
      style={{
        height: 300,
        padding: "30px 30px 26px",
        borderRadius: 20,
        background:
          "linear-gradient(160deg, rgba(23,34,41,0.94), rgba(11,18,22,0.94))",
        border: "1px solid rgba(150,175,190,0.16)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        opacity: interpolate(frame, [at, at + 9], [0, 1], clamp),
        transform: `translateY(${(1 - s) * 34}px) scale(${0.96 + s * 0.04})`,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          color: C.indigoSoft,
          background: "rgba(78,73,238,0.16)",
          border: "1px solid rgba(78,73,238,0.34)",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 29,
          letterSpacing: "-0.035em",
          color: C.ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: mono ? MONO : FONT,
          fontSize: mono ? 16 : 19,
          lineHeight: 1.5,
          letterSpacing: mono ? "0.02em" : "-0.01em",
          color: C.body,
        }}
      >
        {body}
      </div>
    </div>
  );
};

const PayoffScene: FC = () => {
  return (
    <SceneShell dur={SCENE.payoff.dur} yFrom={-6} yTo={6}>
      <div style={{ position: "absolute", left: 84, top: 296, width: 912 }}>
        <Kicker index="04" title="WHY IT'S FAST" at={4} />
        <div style={{ marginTop: 30 }}>
          <Headline
            at={12}
            size={92}
            lines={[
              { t: "Fast where" },
              { t: "it counts.", accent: true },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 646,
          width: 912,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <PayoffCard
          at={34}
          icon={<IconBolt />}
          title="GPU rendering"
          body="Every frame drawn on the GPU, not the CPU."
        />
        <PayoffCard
          at={56}
          icon={<IconBraces />}
          title="Lua config"
          body="One config file. Reload it without restarting."
        />
        <PayoffCard
          at={78}
          icon={<IconLigature />}
          title="Ligatures + true color"
          body="Your editor’s type and palette, in the terminal."
        />
        <PayoffCard
          at={100}
          icon={<IconMonitor />}
          title="Every platform"
          mono
          body="Linux · macOS · Windows"
        />
      </div>

      <div style={{ position: "absolute", left: 84, top: 1320, width: 912 }}>
        <Body at={130} size={24} width={860} color={C.muted}>
          One binary. One window. No extra layer.
        </Body>
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 5 — reveal                                                    */
/* ------------------------------------------------------------------ */

const Halo: FC<{ frame: number }> = ({ frame }) => {
  const rings = [
    { size: 300, opacity: 0.26, speed: 0.18 },
    { size: 430, opacity: 0.16, speed: -0.12 },
    { size: 570, opacity: 0.09, speed: 0.08 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: 570,
        width: 0,
        height: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -300,
          top: -300,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(78,73,238,0.34), rgba(76,201,240,0.07) 45%, transparent 68%)",
          filter: "blur(28px)",
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
            border: `1px ${i === 1 ? "dashed" : "solid"} rgba(155,151,255,${ring.opacity})`,
            transform: `rotate(${frame * ring.speed}deg)`,
          }}
        />
      ))}
    </div>
  );
};

const Wordmark: FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letters = "WezTerm".split("");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 128,
        letterSpacing: "-0.06em",
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
        const term = i >= 3;

        return (
          <React.Fragment key={`${letter}-${i}`}>
            <span
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [start, start + 5], [0, 1], clamp),
                transform: `translateY(${(1 - s) * 42}px)`,
                filter: `blur(${interpolate(
                  frame,
                  [start, start + 10],
                  [8, 0],
                  clamp,
                )}px)`,
                backgroundImage: term
                  ? accentGradient("indigo")
                  : undefined,
                WebkitBackgroundClip: term ? "text" : undefined,
                backgroundClip: term ? "text" : undefined,
                color: term ? "transparent" : undefined,
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

const UrlPill: FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.08);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
        transform: `translateY(${(1 - s) * 24}px) scale(${0.94 + s * 0.06})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "17px 30px",
          borderRadius: 999,
          border: "1px solid rgba(78,73,238,0.55)",
          background: "rgba(78,73,238,0.16)",
          boxShadow: `0 0 ${28 + glow * 26}px rgba(78,73,238,${
            0.16 + glow * 0.16
          })`,
          fontFamily: MONO,
          fontSize: 25,
          letterSpacing: "0.02em",
          color: "#e6e5ff",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: C.indigoSoft,
          }}
        />
        wezterm.org
      </div>
    </div>
  );
};

const RevealScene: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.8 },
  });

  return (
    <SceneShell dur={SCENE.reveal.dur} fadeOut={0} yFrom={6} yTo={0}>
      <Halo frame={frame} />

      <div
        style={{
          position: "absolute",
          left: 540,
          top: 570,
          width: 0,
          height: 0,
          opacity: interpolate(frame, [6, 16], [0, 1], clamp),
          transform: `translate(-50%, 0) scale(${0.7 + s * 0.3})`,
        }}
      >
        <Img
          src={staticFile("brand/wezterm-icon.svg")}
          style={{
            position: "absolute",
            left: -105,
            top: -105,
            width: 210,
            height: 210,
            borderRadius: 40,
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55))",
          }}
        />
      </div>

      <div style={{ position: "absolute", left: 84, top: 840, width: 912 }}>
        <Wordmark at={26} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 1012,
          width: 912,
          display: "flex",
          justifyContent: "center",
          gap: "0.3em",
          fontFamily: FONT,
          fontSize: 33,
          fontWeight: 450,
          letterSpacing: "-0.025em",
          color: C.body,
        }}
      >
        {["One", "terminal.", "Every", "machine."].map((word, i) => {
          const start = 56 + i * 5;
          return (
            <span
              key={word}
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
                transform: `translateY(${interpolate(
                  frame,
                  [start, start + 16],
                  [16, 0],
                  { ...clamp, easing: easeOut },
                )}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 84, top: 1114, width: 912 }}>
        <UrlPill at={86} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          top: 1236,
          width: 912,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 14,
          letterSpacing: "0.2em",
          color: C.muted,
          opacity: interpolate(frame, [104, 118], [0, 1], clamp),
        }}
      >
        FREE &amp; OPEN SOURCE · MIT
      </div>
    </SceneShell>
  );
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const WezTermStory: FC = () => {
  useFonts();
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
      <Sfx at={SCENE.reveal.from} name="whoosh" volume={0.12} />
      <Sfx at={SCENE.reveal.from + 6} name="chime" volume={0.1} />

      <Sequence from={SCENE.hook.from} durationInFrames={SCENE.hook.dur}>
        <HookScene />
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
    </AbsoluteFill>
  );
};
