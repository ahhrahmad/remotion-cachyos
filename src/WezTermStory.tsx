import {
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
  staticFile,
  useCurrentFrame,
} from "remotion";

/*
  WezTerm — 30s Instagram Story, take 2.

  Motion grammar is terminal-native, not cinematic:
  - hard cuts, no crossfades or camera pushes
  - monospace only, no gradient headline
  - typing, block cursor, reverse video, pane splits, status bars
  - SFX are key clicks and line ticks, no whooshes or chimes
*/

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const C = {
  bg: "#05090b",
  panel: "#0a1216",
  ink: "#dbe6ec",
  body: "#9fb2bc",
  dim: "#5d7079",
  line: "rgba(160, 190, 205, 0.18)",
  green: "#3ef08a",
  cyan: "#4cd7ff",
  amber: "#ffb454",
  magenta: "#ff5c8a",
  blue: "#7b7bff",
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

/* ------------------------------------------------------------------ */
/* Font + sound                                                        */
/* ------------------------------------------------------------------ */

const useMono = () => {
  const [handle] = useState(() => delayRender("Loading JetBrains Mono"));

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    const face = new FontFace(
      "JetBrains Mono",
      `url(${staticFile("fonts/jetbrains-mono-latin.woff2")}) format("woff2")`,
      { weight: "400 700", style: "normal" },
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
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const typed = (text: string, frame: number, at: number, cps = 30) => {
  const count = Math.floor(((frame - at) / 30) * cps);
  return text.slice(0, Math.max(0, Math.min(text.length, count)));
};

const Cursor: FC<{ frame: number; color?: string; visible?: boolean }> = ({
  frame,
  color = C.ink,
  visible = true,
}) => (
  <span
    style={{
      display: "inline-block",
      width: "0.58em",
      height: "1.05em",
      marginLeft: 2,
      verticalAlign: "-0.18em",
      background: color,
      opacity: visible && frame % 32 < 18 ? 1 : 0,
    }}
  />
);

const Screen: FC<{
  children: ReactNode;
  right: string;
  statusLeft: ReactNode;
  statusRight: ReactNode;
}> = ({ children, right, statusLeft, statusRight }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.bg,
      color: C.ink,
      fontFamily: MONO,
      overflow: "hidden",
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 3px)",
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 90% at 50% 50%, transparent 58%, rgba(0,0,0,0.45) 100%)",
      }}
    />

    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 250,
        height: 36,
        padding: "0 72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${C.line}`,
        fontSize: 13,
        letterSpacing: "0.14em",
        color: C.dim,
      }}
    >
      <span>
        <span style={{ color: C.green }}>$</span> wezterm
        <span style={{ color: C.line }}> / </span>
        {right}
      </span>
      <span>utf-8 · 120×32</span>
    </div>

    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 300,
        height: 1300,
      }}
    >
      {children}
    </div>

    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1616,
        height: 36,
        padding: "0 72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${C.line}`,
        fontSize: 13,
        letterSpacing: "0.14em",
        color: C.dim,
      }}
    >
      <span>{statusLeft}</span>
      <span>{statusRight}</span>
    </div>
  </AbsoluteFill>
);

const Reverse: FC<{
  at: number;
  y: number;
  children: ReactNode;
  h?: number;
  size?: number;
  bg?: string;
  color?: string;
}> = ({ at, y, children, h = 80, size = 40, bg = C.ink, color = C.bg }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: y,
        width: 936,
        height: h,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: bg,
        color,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </div>
  );
};

const Big: FC<{
  at: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  center?: boolean;
}> = ({ at, y, children, size = 80, color = C.ink, center = false }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: y,
        width: 936,
        textAlign: center ? "center" : "left",
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 0,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

const Line: FC<{
  at: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  center?: boolean;
}> = ({ at, y, children, size = 20, color = C.body, center = false }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: y,
        width: 936,
        textAlign: center ? "center" : "left",
        fontSize: size,
        lineHeight: 1.5,
        color,
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </div>
  );
};

const Command: FC<{
  at: number;
  y: number;
  cmd: string;
  path?: string;
  cps?: number;
  size?: number;
  cursor?: boolean;
}> = ({ at, y, cmd, path = "~/dev", cps = 30, size = 21, cursor = true }) => {
  const frame = useCurrentFrame();
  const text = typed(cmd, frame, at, cps);

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: y,
        width: 936,
        fontSize: size,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: C.green }}>{path}</span>
      <span style={{ color: C.dim }}> $ </span>
      <span style={{ color: C.ink }}>{text}</span>
      {cursor ? <Cursor frame={frame} /> : null}
    </div>
  );
};

const Prompt: FC<{ at: number; y: number; path?: string }> = ({
  at,
  y,
  path = "~",
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: y,
        fontSize: 21,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: C.green }}>{path}</span>
      <span style={{ color: C.dim }}> $ </span>
      <Cursor frame={frame} />
    </div>
  );
};

const PaneBox: FC<{
  label: string;
  color: string;
  right?: string;
  children: ReactNode;
  style?: CSSProperties;
}> = ({ label, color, right, children, style }) => (
  <div
    style={{
      position: "absolute",
      background: C.panel,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        borderBottom: `1px solid ${C.line}`,
        fontSize: 12,
        letterSpacing: "0.14em",
        color: C.dim,
      }}
    >
      <span style={{ color }}>[{label}]</span>
      <span>{right}</span>
    </div>
    <div
      style={{
        padding: "14px 18px",
        fontSize: 16,
        lineHeight: 1.75,
        color: C.body,
      }}
    >
      {children}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Scene 1 — hook                                                      */
/* ------------------------------------------------------------------ */

const HookScene: FC = () => (
  <Screen right="local" statusLeft="local" statusRight="zsh">
    <Command
      at={10}
      y={90}
      path="~/dev"
      cmd={'echo "you live in the terminal"'}
      cps={34}
    />
    <Big at={50} y={188} size={86}>
      you live in
    </Big>
    <Big at={56} y={286} size={86} color={C.green}>
      the terminal.
    </Big>
    <Line at={74} y={428} size={27} color={C.dim}>
      {"# it shouldn't slow you down."}
    </Line>
    <Prompt at={96} y={504} path="~/dev" />
  </Screen>
);

/* ------------------------------------------------------------------ */
/* Scene 2 — the tax                                                   */
/* ------------------------------------------------------------------ */

const TAX_STEPS = [20, 44, 68, 92, 116, 140];

const TabBody: FC<{ tab: number }> = ({ tab }) => {
  if (tab === 0) {
    return (
      <>
        <div>
          <span style={{ color: C.green }}>~/dev/api</span>
          <span style={{ color: C.dim }}> $ </span>
          <span style={{ color: C.ink }}>npm test</span>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ color: C.green }}>{" PASS  src/api.test.ts"}</div>
        <div style={{ color: C.green }}>{" PASS  src/db.test.ts"}</div>
        <div style={{ color: C.green }}>{" PASS  src/auth.test.ts"}</div>
        <div style={{ height: 12 }} />
        <div style={{ color: C.body }}>{" Tests:  24 passed, 24 total"}</div>
        <div style={{ color: C.body }}>{" Time:   1.42 s"}</div>
      </>
    );
  }

  if (tab === 1) {
    return (
      <>
        <div>
          <span style={{ color: C.cyan }}>deploy@prod-02</span>
          <span style={{ color: C.dim }}> $ </span>
          <span style={{ color: C.ink }}>tail -f app.log</span>
        </div>
        <div style={{ height: 12 }} />
        <div>{" 12:04:11  GET  /health   200   3ms"}</div>
        <div>{" 12:04:12  GET  /feed     200  41ms"}</div>
        <div>{" 12:04:12  POST /post     201  88ms"}</div>
        <div>{" 12:04:13  GET  /feed     200  39ms"}</div>
        <div style={{ color: C.dim }}>{" ... streaming"}</div>
      </>
    );
  }

  return (
    <>
      <div>
        <span style={{ color: C.green }}>~/dev</span>
        <span style={{ color: C.dim }}> $ </span>
        <span style={{ color: C.ink }}>tmux ls</span>
      </div>
      <div style={{ height: 12 }} />
      <div>{" 0: local*   3 panes"}</div>
      <div>{" 1: prod     2 panes"}</div>
      <div>{" 2: logs     1 pane"}</div>
      <div style={{ height: 12 }} />
      <div style={{ color: C.dim }}>{" prefix + arrow to switch"}</div>
    </>
  );
};

const TaxScene: FC = () => {
  const frame = useCurrentFrame();
  const passed = TAX_STEPS.filter((step) => frame >= step).length;
  const active = passed === 0 ? 0 : (passed - 1) % 3;
  const lastSwitch = passed === 0 ? -99 : TAX_STEPS[passed - 1];
  const flash = frame - lastSwitch < 3;
  const count = Math.min(27, passed * 5 + 2);
  const tabs = ["local", "prod", "tmux"];

  return (
    <Screen
      right="3 tabs"
      statusLeft="tabs: 3"
      statusRight={`context: ${count}`}
    >
      <Reverse at={4} y={120} h={84} size={42}>
        3 WINDOWS DEEP
      </Reverse>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 222,
          width: 936,
          height: 52,
          display: "flex",
          gap: 8,
          borderBottom: `1px solid ${flash ? C.amber : C.line}`,
        }}
      >
        {tabs.map((tab, i) => (
          <div
            key={tab}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              fontSize: 16,
              letterSpacing: "0.06em",
              background: i === active ? C.ink : "transparent",
              color: i === active ? C.bg : C.dim,
              border: `1px solid ${i === active ? C.ink : C.line}`,
              borderBottom: "none",
            }}
          >
            [{i + 1} {tab}]
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 300,
          width: 936,
          height: 720,
          background: C.panel,
          border: `1px solid ${C.line}`,
          padding: "26px 30px",
          fontSize: 20,
          lineHeight: 1.85,
        }}
      >
        <TabBody tab={active} />
        <div
          style={{
            position: "absolute",
            left: 30,
            bottom: 24,
            fontSize: 20,
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: C.green }}>~/dev</span>
          <span style={{ color: C.dim }}> $ </span>
          <Cursor frame={frame} />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 1060,
          width: 936,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontSize: 16,
          letterSpacing: "0.12em",
          color: C.dim,
        }}
      >
        <span>CONTEXT SWITCHES</span>
        <span style={{ fontSize: 30, color: C.amber }}>
          {String(count).padStart(2, "0")}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 1104,
          width: 936,
          fontSize: 18,
          letterSpacing: "0.02em",
          color: C.amber,
          whiteSpace: "pre",
        }}
      >
        {"[" + "#".repeat(count) + "-".repeat(27 - count) + "]"}
      </div>
    </Screen>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 3 — one window                                                */
/* ------------------------------------------------------------------ */

const FixScene: FC = () => {
  const frame = useCurrentFrame();
  const logsW = interpolate(frame, [56, 70], [0, 392], {
    ...clamp,
    easing: easeOut,
  });
  const prodH = interpolate(frame, [100, 114], [0, 470], {
    ...clamp,
    easing: easeOut,
  });
  const split1 = frame >= 56 && frame < 62;
  const split2 = frame >= 100 && frame < 106;

  return (
    <Screen right="3 panes" statusLeft="panes: 3" statusRight="multiplexer">
      <Big at={4} y={8} size={78}>
        one window.
      </Big>
      <Big at={10} y={98} size={78} color={C.green}>
        every host.
      </Big>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 250,
          width: 936,
          height: 900,
          border: `1px solid ${C.line}`,
          background: C.panel,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            right: logsW,
            borderRight: `1px solid ${split1 ? C.cyan : C.line}`,
          }}
        >
          <PaneBox
            label="local"
            color={C.green}
            right="zsh"
            style={{ left: 0, top: 0, right: 0, bottom: 0, border: "none" }}
          >
            <div>
              <span style={{ color: C.green }}>~/dev/api</span>
              <span style={{ color: C.dim }}> $ </span>
              <span style={{ color: C.ink }}>cargo test</span>
            </div>
            <div style={{ color: C.dim }}>{"   Compiling api v0.4.2"}</div>
            <div style={{ color: C.dim }}>
              {"    Finished test profile in 0.61s"}
            </div>
            <div style={{ color: C.dim }}>
              {"     Running unittests src/lib.rs"}
            </div>
            <div>{"running 24 tests"}</div>
            <div style={{ color: C.green }}>
              {"test api::routes::health ... ok"}
            </div>
            <div style={{ color: C.green }}>
              {"test api::routes::feed ... ok"}
            </div>
            <div style={{ color: C.green }}>
              {"test db::pool::connect ... ok"}
            </div>
            <div style={{ color: C.green }}>
              {"test auth::token::verify ... ok"}
            </div>
            <div style={{ color: C.green }}>{"test result: ok. 24 passed"}</div>
          </PaneBox>

          {prodH > 0 ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: prodH,
                background: C.panel,
                borderTop: `1px solid ${split2 ? C.cyan : C.line}`,
                overflow: "hidden",
              }}
            >
              <PaneBox
                label="prod"
                color={C.cyan}
                right="ssh"
                style={{ left: 0, top: 0, right: 0, bottom: 0, border: "none" }}
              >
                <div style={{ color: C.dim }}>{"ssh prod-02"}</div>
                <div>
                  <span style={{ color: C.cyan }}>ubuntu@prod-02</span>
                  <span style={{ color: C.dim }}> $ </span>
                  <span style={{ color: C.ink }}>systemctl status api</span>
                </div>
                <div>{"* api.service - api"}</div>
                <div>{"   Loaded: loaded (/etc/systemd/api)"}</div>
                <div style={{ color: C.green }}>
                  {"   Active: active (running) 12:01 UTC"}
                </div>
                <div>{" Main PID: 812 (api)"}</div>
                <div>{"   Memory: 84.2M"}</div>
              </PaneBox>
            </div>
          ) : null}
        </div>

        {logsW > 0 ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: logsW,
              background: C.panel,
              overflow: "hidden",
            }}
          >
            <PaneBox
              label="logs"
              color={C.amber}
              right="kubectl"
              style={{ left: 0, top: 0, right: 0, bottom: 0, border: "none" }}
            >
              <div style={{ color: C.dim }}>{"kubectl logs -f deploy/api"}</div>
              <div>{"12:04:11 GET /health 200 3ms"}</div>
              <div>{"12:04:12 GET /feed   200 41ms"}</div>
              <div>{"12:04:12 POST /post  201 88ms"}</div>
              <div>{"12:04:13 GET /feed   200 39ms"}</div>
              <div>{"12:04:13 GET /health 200 2ms"}</div>
              <div>{"12:04:14 GET /feed   200 40ms"}</div>
              <div>{"12:04:14 POST /post  201 91ms"}</div>
              <div>{"12:04:15 GET /health 200 2ms"}</div>
              <div>{"12:04:15 GET /feed   200 38ms"}</div>
              <div>{"12:04:16 GET /feed   200 41ms"}</div>
              <div style={{ color: C.dim }}>{"tail -f · streaming"}</div>
            </PaneBox>
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 1180,
          display: "flex",
          gap: 12,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ background: C.green, color: C.bg, padding: "7px 12px" }}>
          GPU-ACCELERATED
        </span>
        <span style={{ background: C.ink, color: C.bg, padding: "7px 12px" }}>
          MULTIPLEXER BUILT IN
        </span>
      </div>

      <Line at={150} y={1236} size={18} color={C.dim}>
        {"# one process. three panes. no extra layer."}
      </Line>
    </Screen>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 4 — payoff                                                    */
/* ------------------------------------------------------------------ */

const INFO_ROWS: [string, string][] = [
  ["wezterm", "20240203"],
  ["renderer", "GPU-accelerated"],
  ["config", "Lua · live reload"],
  ["glyphs", "ligatures · true color"],
  ["platform", "linux · macos · windows"],
];

const PayoffScene: FC = () => {
  const frame = useCurrentFrame();

  return (
    <Screen right="info" statusLeft="wezterm --info" statusRight="gpu">
      <Command at={8} y={40} path="~/dev" cmd="wezterm --info" cps={32} />

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 98,
          width: 936,
          height: 1,
          background: C.line,
        }}
      />

      {INFO_ROWS.map(([label, value], i) =>
        frame < 34 + i * 10 ? null : (
          <div
            key={label}
            style={{
              position: "absolute",
              left: 72,
              top: 148 + i * 148,
              width: 936,
              display: "flex",
              alignItems: "baseline",
              fontSize: 30,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 280, color: C.dim }}>{label}</span>
            <span style={{ color: C.ink }}>{value}</span>
            <span style={{ flex: 1 }} />
            <span
              style={{ fontSize: 17, letterSpacing: "0.1em", color: C.green }}
            >
              [ok]
            </span>
          </div>
        ),
      )}

      <Line at={112} y={890} size={22} color={C.dim}>
        {"# one binary. one window. no extra layer."}
      </Line>
      <Prompt at={124} y={952} path="~/dev" />
    </Screen>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 5 — reveal                                                    */
/* ------------------------------------------------------------------ */

const RevealScene: FC = () => {
  const frame = useCurrentFrame();
  const word = typed("WezTerm", frame, 20, 18);
  const tagline = typed("one terminal. every machine.", frame, 46, 34);

  return (
    <Screen right="about" statusLeft="about" statusRight="mit">
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 250,
          width: 190,
          height: 190,
          transform: "translateX(-50%)",
          opacity: frame >= 6 ? 1 : 0,
        }}
      >
        <Img
          src={staticFile("brand/wezterm-icon.svg")}
          style={{ width: 190, height: 190, borderRadius: 36 }}
        />
      </div>

      <Big at={20} y={500} size={104} center>
        {word}
        <Cursor frame={frame} visible={word.length < 7} />
      </Big>

      <Line at={46} y={660} size={26} color={C.body} center>
        {tagline}
        <Cursor frame={frame} visible={tagline.length < 27} />
      </Line>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 750,
          width: 936,
          display: "flex",
          justifyContent: "center",
          opacity: frame >= 80 ? 1 : 0,
        }}
      >
        <span
          style={{
            background: C.ink,
            color: C.bg,
            padding: "10px 18px",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          wezterm.org
        </span>
      </div>

      <Line at={96} y={830} size={15} color={C.dim} center>
        free &amp; open source · mit
      </Line>

      <Prompt at={108} y={940} path="~" />
    </Screen>
  );
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const WezTermStory: FC = () => {
  useMono();

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <Sfx at={10} name="click" volume={0.07} />
      <Sfx at={36} name="click" volume={0.05} />
      <Sfx at={50} name="tick-low" volume={0.06} />
      <Sfx at={56} name="tick-low" volume={0.06} />
      <Sfx at={74} name="tick" volume={0.04} />

      <Sfx at={SCENE.tax.from} name="tick" volume={0.05} />
      {TAX_STEPS.map((step) => (
        <Sfx key={step} at={SCENE.tax.from + step} name="click" volume={0.05} />
      ))}

      <Sfx at={SCENE.fix.from + 4} name="tick-low" volume={0.06} />
      <Sfx at={SCENE.fix.from + 56} name="click" volume={0.06} />
      <Sfx at={SCENE.fix.from + 100} name="click" volume={0.06} />
      <Sfx at={SCENE.fix.from + 140} name="tick" volume={0.05} />

      <Sfx at={SCENE.payoff.from + 8} name="click" volume={0.05} />
      {INFO_ROWS.map(([label], i) => (
        <Sfx
          key={label}
          at={SCENE.payoff.from + 40 + i * 8}
          name="tick-low"
          volume={0.05}
        />
      ))}

      <Sfx at={SCENE.reveal.from + 6} name="click" volume={0.06} />
      <Sfx at={SCENE.reveal.from + 46} name="tick" volume={0.04} />
      <Sfx at={SCENE.reveal.from + 80} name="tick" volume={0.04} />

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
