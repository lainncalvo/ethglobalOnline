import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("loads a dedicated cinematic motion layer before responsive overrides", async () => {
  const layout = await readSource("../app/layout.tsx");
  const motionIndex = layout.indexOf('import "./motion.css"');
  const responsiveIndex = layout.indexOf('import "./responsive.css"');

  assert.ok(motionIndex >= 0, "layout should load the cinematic motion stylesheet");
  assert.ok(
    motionIndex < responsiveIndex,
    "responsive and reduced-motion rules should load after motion",
  );
});

test("the page reveal is decorative and can never intercept input", async () => {
  const motion = await readSource("../app/motion.css");
  const page = await readSource("../app/page.tsx");
  const intro = await readSource("../app/components/CinematicIntro.tsx");

  assert.match(page, /<CinematicIntro \/>/);
  assert.match(intro, /className="cinematic-curtain"/);
  assert.match(intro, /className="cinematic-grid-sweep"/);
  assert.match(motion, /\.cinematic-curtain\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(motion, /\.cinematic-grid-sweep\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(motion, /@keyframes cinematic-curtain-reveal/);
  assert.match(motion, /100%\s*\{[^}]*visibility:\s*hidden;/s);
});

test("assembles the hero headline and terminal in controlled layers", async () => {
  const motion = await readSource("../app/motion.css");
  const hero = await readSource("../app/components/Hero.tsx");

  assert.match(hero, /className="headline-clip"/);
  assert.match(hero, /className="headline-reveal"/);
  assert.match(motion, /\.headline-clip\s*\{[^}]*overflow:\s*(?:clip|hidden);/s);
  assert.match(motion, /\.terminal-row:nth-child\(4\)/);
  assert.match(motion, /\.terminal-market,/);
  assert.match(motion, /\.compliance-row,/);
  assert.match(motion, /\.timeline\s*\{/);
});

test("reduced motion removes overlays and entrance transforms immediately", async () => {
  const motion = await readSource("../app/motion.css");
  const reducedMotion = motion.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/,
  )?.[1];

  assert.ok(reducedMotion, "motion stylesheet should include a reduced-motion contract");
  assert.match(
    reducedMotion,
    /\.cinematic-curtain,\s*\.cinematic-grid-sweep\s*\{[^}]*display:\s*none;/s,
  );
  assert.match(reducedMotion, /transform:\s*none\s*!important;/);
  assert.match(reducedMotion, /animation:\s*none\s*!important;/);
});
