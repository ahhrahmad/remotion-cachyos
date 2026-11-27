import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from "remotion";

/* ------------------------------------------------------------------ */
/* WezTerm — graze-face-tour style (2.5D camera skim + hover-settle)   */
/* 30s IG Story, 1080×1920, 30fps. Heavy render on CI only.          */
/* ------------------------------------------------------------------ */

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const C = {
  bg: "#05090b",
  surf: "#2a3440",
  ink: "#dbe6ec",
  body: "#9fb2bc",
  dim: "#5d7079",
  line: "rgba(160, 190, 205, 0.18)",
  green: "#3ef08a",
  cyan: "#4cd7ff",
  amber: "#ffb454",
  magenta: "#ff5c8a",
  blue: "#7b7bff",
  acc: "#4e49ee",
};

const PAGE_W = 1080;
const PAGE_H = 2600;
const VP_CY = 1920 / 2;

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  // cubic-bezier via remotion Easing.bezier
  return Easing.bezier(x1, y1, x2, y2);
};
const easeFall = bezier(0.5, 0.05, 0.6, 1);

const SFX_GAIN: Record<string, number> = { tick: 9, click: 12, "tick-low": 8 };
const Sfx: React.FC<{ at: number; name?: string; volume?: number }> = ({ at, name = "tick", volume = 0.1 }) => (
  <Sequence from={at} durationInFrames={50} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={Math.min(1, volume * (SFX_GAIN[name] ?? 9) * 1.8)} />
  </Sequence>
);

const useMono = () => {
  const [handle] = useState(() => delayRender("Loading JetBrains Mono"));
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    const face = new FontFace("JetBrains Mono", `url(${staticFile("fonts/jetbrains-mono-latin.woff2")}) format("woff2")`, {
      weight: "400 700",
      style: "normal",
    });
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        finish();
      })
      .catch(finish);
  }, [handle]);
};

/* ------------------------------------------------------------------ */
/* FloatWrap — hover + same-shape soft shadow that converges on land    */
/* ------------------------------------------------------------------ */

const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: "relative" }}>
    {h > 1.5 && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${h * 0.22}px, ${h * 0.42}px) scale(${1 + h * 0.0011})`,
          filter: `brightness(0) blur(${2 + h * 0.09}px)`,
          opacity: Math.min(0.32, 0.1 + h * 0.003),
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    )}
    <div style={{ transform: `translate(${-h * 0.34}px, ${-h * 0.78}px)` }}>{children}</div>
  </div>
);

const liftOf = (t: number, land: number, H = 120) => {
  const FALL = 0.34;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

/* ------------------------------------------------------------------ */
/* WezTerm surface primitives                                          */
/* ------------------------------------------------------------------ */

const TermLine: React.FC<{ path?: string; cmd: string; color?: string }> = ({ path = "~/dev", cmd, color = C.ink }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 34, lineHeight: 1.5, whiteSpace: "nowrap" }}>
    <span style={{ color: C.green }}>{path}</span>
    <span style={{ color: C.dim }}>$</span>
    <span style={{ color }}>{cmd}</span>
  </div>
);

const RevBar: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size?: number }> = ({
  children,
  bg = C.ink,
  color = C.bg,
  size = 72,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "10px 24px",
      background: bg,
      color,
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: "0.02em",
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; delay: number; t: number }> = ({ label, value, delay, t }) => {
  const h = liftOf(t, delay, 150);
  return (
    <FloatWrap h={h}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          width: PAGE_W - 160,
          fontFamily: MONO,
          fontSize: 38,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 260, color: C.dim }}>{label}</span>
        <span style={{ color: C.ink }}>{value}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 22, letterSpacing: "0.1em", color: C.green }}>[ok]</span>
      </div>
    </FloatWrap>
  );
};

/* ------------------------------------------------------------------ */
/* Scene surfaces (each a tall "page")                                  */
/* ------------------------------------------------------------------ */

// Scene 1 — hook
const SceneHook: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      width: PAGE_W,
      height: PAGE_H,
      background: C.surf,
      padding: "120px 80px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 40,
    }}
  >
    <FloatWrap h={liftOf(t, 0.18, 130)}>
      <TermLine cmd={'echo "you live in the terminal"'} />
    </FloatWrap>
    <div style={{ height: 60 }} />
    <FloatWrap h={liftOf(t, 0.32, 160)}>
      <RevBar size={86}>you live in</RevBar>
    </FloatWrap>
    <FloatWrap h={liftOf(t, 0.42, 160)}>
      <RevBar bg={C.green} color={C.bg} size={86}>the terminal.</RevBar>
    </FloatWrap>
    <div style={{ height: 40 }} />
    <FloatWrap h={liftOf(t, 0.58, 140)}>
      <div style={{ fontFamily: MONO, fontSize: 30, color: C.dim }}>{"# it shouldn't slow you down."}</div>
    </FloatWrap>
    <div style={{ height: 40 }} />
    <FloatWrap h={liftOf(t, 0.72, 130)}>
      <TermLine cmd="" />
    </FloatWrap>
  </div>
);

// Scene 2 — tax
const TAX_TABS = ["local", "prod", "tmux"];
const SceneTax: React.FC<{ t: number }> = ({ t }) => {
  const tab = Math.floor(t * 3) % 3;
  return (
    <div
      style={{
        width: PAGE_W,
        height: PAGE_H,
        background: C.surf,
        padding: "120px 80px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      <FloatWrap h={liftOf(t, 0.15, 140)}>
        <RevBar bg={C.amber} color={C.bg} size={52}>3 WINDOWS DEEP</RevBar>
      </FloatWrap>
      <div style={{ height: 20 }} />
      <FloatWrap h={liftOf(t, 0.25, 130)}>
        <div style={{ display: "flex", gap: 16 }}>
          {TAX_TABS.map((tb, i) => (
            <div
              key={tb}
              style={{
                padding: "10px 22px",
                fontFamily: MONO,
                fontSize: 26,
                background: i === tab ? C.ink : "transparent",
                color: i === tab ? C.bg : C.dim,
                border: `1px solid ${i === tab ? C.ink : C.line}`,
              }}
            >
              [{i + 1} {tb}]
            </div>
          ))}
        </div>
      </FloatWrap>
      <div style={{ height: 20 }} />
      <FloatWrap h={liftOf(t, 0.4, 160)}>
        <div
          style={{
            width: PAGE_W - 160,
            height: 900,
            background: C.bg,
            border: `1px solid ${C.line}`,
            padding: "30px 36px",
            fontFamily: MONO,
            fontSize: 26,
            lineHeight: 1.8,
            color: C.body,
            boxSizing: "border-box",
          }}
        >
          {tab === 0 && (
            <>
              <TermLine path="~/dev/api" cmd="npm test" />
              <div style={{ height: 10 }} />
              <div style={{ color: C.green }}>{" PASS  src/api.test.ts"}</div>
              <div style={{ color: C.green }}>{" PASS  src/db.test.ts"}</div>
              <div style={{ color: C.green }}>{" PASS  src/auth.test.ts"}</div>
              <div style={{ height: 10 }} />
              <div>{" Tests:  24 passed, 24 total"}</div>
            </>
          )}
          {tab === 1 && (
            <>
              <TermLine path="deploy@prod-02" cmd="tail -f app.log" color={C.cyan} />
              <div style={{ height: 10 }} />
              <div>{" 12:04:11  GET  /health   200   3ms"}</div>
              <div>{" 12:04:12  GET  /feed     200  41ms"}</div>
              <div>{" 12:04:12  POST /post     201  88ms"}</div>
              <div>{" 12:04:13  GET  /feed     200  39ms"}</div>
            </>
          )}
          {tab === 2 && (
            <>
              <TermLine path="~/dev" cmd="tmux ls" />
              <div style={{ height: 10 }} />
              <div>{" 0: local*   3 panes"}</div>
              <div>{" 1: prod     2 panes"}</div>
              <div>{" 2: logs     1 pane"}</div>
              <div style={{ height: 10, color: C.dim }}>{" prefix + arrow to switch"}</div>
            </>
          )}
        </div>
      </FloatWrap>
      <div style={{ height: 30 }} />
      <FloatWrap h={liftOf(t, 0.7, 140)}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, fontFamily: MONO, fontSize: 26 }}>
          <span style={{ color: C.dim, letterSpacing: "0.12em" }}>CONTEXT SWITCHES</span>
          <span style={{ fontSize: 40, color: C.amber }}>{String(Math.min(27, Math.floor(t * 27) + 2).toString().padStart(2, "0"))}</span>
        </div>
      </FloatWrap>
    </div>
  );
};

// Scene 3 — fix (pane grid)
const SceneFix: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      width: PAGE_W,
      height: PAGE_H,
      background: C.surf,
      padding: "120px 80px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 30,
    }}
  >
    <FloatWrap h={liftOf(t, 0.15, 140)}>
      <RevBar size={72}>one window.</RevBar>
    </FloatWrap>
    <FloatWrap h={liftOf(t, 0.22, 140)}>
      <RevBar bg={C.green} color={C.bg} size={72}>every host.</RevBar>
    </FloatWrap>
    <div style={{ height: 20 }} />
    <FloatWrap h={liftOf(t, 0.38, 170)}>
      <div
        style={{
          width: PAGE_W - 160,
          height: 1100,
          background: C.bg,
          border: `1px solid ${C.line}`,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* left column: local + prod */}
        <div style={{ flex: 1, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "24px 28px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.green, letterSpacing: "0.14em", marginBottom: 8 }}>[local]</div>
            <TermLine path="~/dev/api" cmd="cargo test" />
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.dim, marginTop: 6 }}>{"running 24 tests"}</div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.green }}>{"test result: ok"}</div>
          </div>
          <div style={{ flex: 1, padding: "24px 28px" }}>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.cyan, letterSpacing: "0.14em", marginBottom: 8 }}>[prod]</div>
            <TermLine path="ubuntu@prod-02" cmd="systemctl status api" color={C.cyan} />
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.green, marginTop: 6 }}>{"active (running)"}</div>
          </div>
        </div>
        {/* right column: logs */}
        <div style={{ width: 420, padding: "24px 28px" }}>
          <div style={{ fontFamily: MONO, fontSize: 16, color: C.amber, letterSpacing: "0.14em", marginBottom: 8 }}>[logs]</div>
          <div style={{ fontFamily: MONO, fontSize: 15, lineHeight: 1.7, color: C.body }}>
            <div>{"12:04:11 GET /health 200 3ms"}</div>
            <div>{"12:04:12 GET /feed   200 41ms"}</div>
            <div>{"12:04:12 POST /post  201 88ms"}</div>
            <div>{"12:04:13 GET /feed   200 39ms"}</div>
            <div style={{ color: C.dim }}>{"tail -f · streaming"}</div>
          </div>
        </div>
      </div>
    </FloatWrap>
    <div style={{ height: 20 }} />
    <FloatWrap h={liftOf(t, 0.7, 140)}>
      <div style={{ display: "flex", gap: 14, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.08em" }}>
        <span style={{ background: C.green, color: C.bg, padding: "8px 14px" }}>GPU-ACCELERATED</span>
        <span style={{ background: C.ink, color: C.bg, padding: "8px 14px" }}>MULTIPLEXER BUILT IN</span>
      </div>
    </FloatWrap>
    <FloatWrap h={liftOf(t, 0.82, 130)}>
      <div style={{ fontFamily: MONO, fontSize: 22, color: C.dim }}>{"# one process. three panes. no extra layer."}</div>
    </FloatWrap>
  </div>
);

// Scene 4 — payoff
const INFO_ROWS: [string, string][] = [
  ["wezterm", "20240203"],
  ["renderer", "GPU-accelerated"],
  ["config", "Lua · live reload"],
  ["glyphs", "ligatures · true color"],
  ["platform", "linux · macos · windows"],
];
const ScenePayoff: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      width: PAGE_W,
      height: PAGE_H,
      background: C.surf,
      padding: "120px 80px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}
  >
    <FloatWrap h={liftOf(t, 0.12, 130)}>
      <TermLine cmd="wezterm --info" />
    </FloatWrap>
    <div style={{ height: 20, borderBottom: `1px solid ${C.line}`, width: PAGE_W - 160 }} />
    <div style={{ height: 20 }} />
    {INFO_ROWS.map(([label, value], i) => (
      <InfoRow key={label} label={label} value={value} delay={0.22 + i * 0.1} t={t} />
    ))}
    <div style={{ height: 30 }} />
    <FloatWrap h={liftOf(t, 0.82, 130)}>
      <div style={{ fontFamily: MONO, fontSize: 26, color: C.dim }}>{"# one binary. one window. no extra layer."}</div>
    </FloatWrap>
  </div>
);

// Scene 5 — reveal
const SceneReveal: React.FC<{ t: number }> = ({ t }) => (
  <div
    style={{
      width: PAGE_W,
      height: PAGE_H,
      background: C.surf,
      padding: "120px 80px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 40,
    }}
  >
    <FloatWrap h={liftOf(t, 0.12, 150)}>
      <Img src={staticFile("brand/wezterm-icon.svg")} style={{ width: 220, height: 220, borderRadius: 44 }} />
    </FloatWrap>
    <div style={{ height: 20 }} />
    <FloatWrap h={liftOf(t, 0.28, 160)}>
      <RevBar size={110}>WezTerm</RevBar>
    </FloatWrap>
    <FloatWrap h={liftOf(t, 0.44, 150)}>
      <div style={{ fontFamily: MONO, fontSize: 34, color: C.body, textAlign: "center" }}>one terminal. every machine.</div>
    </FloatWrap>
    <div style={{ height: 30 }} />
    <FloatWrap h={liftOf(t, 0.62, 140)}>
      <div
        style={{
          background: C.ink,
          color: C.bg,
          padding: "12px 24px",
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        wezterm.org
      </div>
    </FloatWrap>
    <FloatWrap h={liftOf(t, 0.78, 130)}>
      <div style={{ fontFamily: MONO, fontSize: 20, color: C.dim, textAlign: "center" }}>free &amp; open source · mit</div>
    </FloatWrap>
  </div>
);

/* ------------------------------------------------------------------ */
/* Camera (Plane + cruise)                                             */
/* ------------------------------------------------------------------ */

type Cam = { rx: number; ry: number; rz: number; scale: number; x: [number, number]; y: [number, number] };

const cruise = (u: number, first: boolean, last: boolean) => {
  const A = 0.3;
  const k = 1 / (1 - (first ? A / 2 : 0) - (last ? A / 2 : 0));
  const inPart = (x: number) => (x < A ? (x * x) / (2 * A) : x - A / 2);
  if (first && u <= A) return k * inPart(Math.max(0, u));
  if (last && u >= 1 - A) return 1 - k * inPart(Math.max(0, 1 - u));
  return first ? k * inPart(u) : k * u;
};

const Plane: React.FC<{ cam: Cam; p: number; children: React.ReactNode }> = ({ cam, p, children }) => {
  const x = cam.x[0] + (cam.x[1] - cam.x[0]) * p;
  const y = cam.y[0] + (cam.y[1] - cam.y[0]) * p;
  const roll = cam.rz + (p - 0.5) * 2;
  return (
    <AbsoluteFill style={{ perspective: 1050, perspectiveOrigin: "50% 46%" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `scale(${cam.scale}) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${roll}deg)`,
        }}
      >
        <div style={{ position: "absolute", transform: `translate3d(${x}px, ${y}px, 0)` }}>
          <div style={{ position: "relative", transform: "translate(-50%, -50%)" }}>{children}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Neon edge glow (dark field)                                          */
/* ------------------------------------------------------------------ */

const NeonRects: React.FC<{ drift: number }> = ({ drift }) => {
  const box = (c: string, a: number): React.CSSProperties => ({
    position: "absolute",
    borderRadius: 32,
    border: `3px solid ${c}`,
    opacity: a,
    boxShadow: `0 0 24px ${c}, inset 0 0 18px ${c}`,
    filter: "blur(3px)",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ ...box(C.green, 0.32), left: -140 + drift * 60, top: 240, width: 620, height: 380 }} />
      <div style={{ ...box(C.cyan, 0.26), left: 60 + drift * 36, top: 700, width: 420, height: 260 }} />
      <div style={{ ...box(C.amber, 0.24), right: -180 - drift * 44, top: -80, width: 560, height: 340 }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Polish (Grain + Vignette) — inlined                                 */
/* ------------------------------------------------------------------ */

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Grain: React.FC<{ opacity?: number; step?: number }> = ({ opacity = 0.06, step = 2 }) => {
  const frame = useCurrentFrame();
  const k = Math.floor(frame / Math.max(1, step));
  const tile = 256;
  const ox = Math.floor(hash(k * 3 + 1) * tile);
  const oy = Math.floor(hash(k * 7 + 2) * tile);
  const freq = 0.85;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${(k % 6) * 17 + 3}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/>` +
    `<feComponentTransfer><feFuncR type='linear' slope='2.4' intercept='-0.7'/><feFuncG type='linear' slope='2.4' intercept='-0.7'/>` +
    `<feFuncB type='linear' slope='2.4' intercept='-0.7'/></feComponentTransfer></filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        mixBlendMode: "soft-light",
        backgroundImage: url,
        backgroundSize: `${tile}px ${tile}px`,
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    />
  );
};

const Vignette: React.FC<{ strength?: number; inner?: number; cx?: number; cy?: number }> = ({
  strength = 0.62,
  inner = 0.42,
  cx = 0.5,
  cy = 0.46,
}) => {
  const c = "6,4,14";
  const mid = inner + (1 - inner) * 0.55;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(ellipse 72% 72% at ${cx * 100}% ${cy * 100}%, rgba(${c},0) ${inner * 100}%, ` +
          `rgba(${c},${(strength * 0.32).toFixed(3)}) ${(mid * 100).toFixed(1)}%, rgba(${c},${strength.toFixed(3)}) 100%), ` +
          `radial-gradient(ellipse 100% 100% at ${cx * 100}% ${cy * 100}%, rgba(${c},0) 60%, rgba(${c},${(strength * 0.6).toFixed(3)}) 100%)`,
      }}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Segments                                                             */
/* ------------------------------------------------------------------ */

const SEG_LEN = 180;
const FADE = 8;
const N_SEGS = 5;

const SEGS: { cam: Cam; render: (t: number) => React.ReactNode }[] = [
  {
    cam: { rx: 14, ry: 22, rz: -4, scale: 0.9, x: [60, -60], y: [VP_CY - 400, VP_CY - 1400] },
    render: (t) => <SceneHook t={t} />,
  },
  {
    cam: { rx: 18, ry: -18, rz: 5, scale: 0.92, x: [-40, 50], y: [VP_CY - 500, VP_CY - 1300] },
    render: (t) => <SceneTax t={t} />,
  },
  {
    cam: { rx: 12, ry: 26, rz: -5, scale: 0.95, x: [50, -40], y: [VP_CY - 450, VP_CY - 1350] },
    render: (t) => <SceneFix t={t} />,
  },
  {
    cam: { rx: 16, ry: -22, rz: 4, scale: 0.9, x: [-50, 60], y: [VP_CY - 400, VP_CY - 1400] },
    render: (t) => <ScenePayoff t={t} />,
  },
  {
    cam: { rx: 20, ry: 18, rz: -3, scale: 0.88, x: [40, -50], y: [VP_CY - 500, VP_CY - 1200] },
    render: (t) => <SceneReveal t={t} />,
  },
];

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {SEGS.map((s, i) => {
        const start = i * SEG_LEN;
        const local = frame - start;
        if (local < -FADE || local > SEG_LEN + FADE) return null;
        const u = local / SEG_LEN;
        const t = Math.min(1, Math.max(0, u));
        const p = cruise(u, i === 0, i === SEGS.length - 1);
        const fadeIn = i === 0 ? 1 : Math.min(1, Math.max(0, (local + FADE) / FADE));
        const fadeOut = i === SEGS.length - 1 ? 1 : Math.min(1, Math.max(0, (SEG_LEN - local) / FADE));
        return (
          <AbsoluteFill key={i} style={{ opacity: Math.min(fadeIn, fadeOut) }}>
            <NeonRects drift={p} />
            <Plane cam={s.cam} p={p}>{s.render(t)}</Plane>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Main composition                                                     */
/* ------------------------------------------------------------------ */

export const WezTermStory: React.FC = () => {
  useMono();
  const frame = useCurrentFrame();

  // DOF focus moves per segment
  const FX = [48, 44, 50, 46, 48];
  const FY = [44, 42, 48, 44, 46];
  const seg = Math.min(N_SEGS - 1, Math.floor(frame / SEG_LEN));
  const next = Math.min(N_SEGS - 1, seg + 1);
  const localInSeg = frame - seg * SEG_LEN;
  const k = Math.min(1, Math.max(0, localInSeg / SEG_LEN));
  const focusX = FX[seg] + (FX[next] - FX[seg]) * k;
  const focusY = FY[seg] + (FY[next] - FY[seg]) * k;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Sfx at={0} name="click" volume={0.06} />
      <Sfx at={SEG_LEN} name="click" volume={0.05} />
      <Sfx at={SEG_LEN * 2} name="click" volume={0.05} />
      <Sfx at={SEG_LEN * 3} name="click" volume={0.05} />
      <Sfx at={SEG_LEN * 4} name="click" volume={0.05} />
      <Stage />
      {/* DOF: screen-space radial blur, focus follows segment */}
      <AbsoluteFill
        style={{
          filter: "blur(8px)",
          WebkitMaskImage: `radial-gradient(ellipse 58% 52% at ${focusX}% ${focusY}%, transparent 34%, rgba(0,0,0,0.85) 72%, black 92%)`,
          maskImage: `radial-gradient(ellipse 58% 52% at ${focusX}% ${focusY}%, transparent 34%, rgba(0,0,0,0.85) 72%, black 92%)`,
        }}
      >
        <Stage />
      </AbsoluteFill>
      <Vignette strength={0.62} inner={0.42} cx={focusX / 100} cy={focusY / 100} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};