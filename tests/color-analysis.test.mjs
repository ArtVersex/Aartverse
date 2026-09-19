import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  analyzeImageColors,
  classifyColorFamily,
  validateColorAnalysis,
  COLOR_FAMILIES,
} from "../lib/color-analysis.ts";

const SIZE = 200;

async function solidPng(r, g, b, alpha = 255) {
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r, g, b, alpha: alpha / 255 } },
  })
    .png()
    .toBuffer();
}

async function solidJpeg(r, g, b) {
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r, g, b } },
  })
    .jpeg()
    .toBuffer();
}

async function solidWebp(r, g, b) {
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r, g, b } },
  })
    .webp()
    .toBuffer();
}

/** Four equal quadrants, each a distinct solid color. */
async function fourQuadrantPng(colors) {
  const half = SIZE / 2;
  const base = sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  });
  const swatches = await Promise.all(
    colors.map(([r, g, b]) =>
      sharp({ create: { width: half, height: half, channels: 4, background: { r, g, b, alpha: 1 } } })
        .png()
        .toBuffer()
    )
  );
  return base
    .composite([
      { input: swatches[0], left: 0, top: 0 },
      { input: swatches[1], left: half, top: 0 },
      { input: swatches[2], left: 0, top: half },
      { input: swatches[3], left: half, top: half },
    ])
    .png()
    .toBuffer();
}

/** A centered opaque square on a fully transparent background. */
async function transparentPng(r, g, b) {
  const inner = Math.floor(SIZE / 2);
  const offset = Math.floor((SIZE - inner) / 2);
  const swatch = await sharp({
    create: { width: inner, height: inner, channels: 4, background: { r, g, b, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: swatch, left: offset, top: offset }])
    .png()
    .toBuffer();
}

function assertWellFormed(result, { maxExpectedColors } = {}) {
  assert.ok(Array.isArray(result.dominantColors));
  assert.ok(result.dominantColors.length <= 5);
  if (maxExpectedColors !== undefined) {
    assert.ok(result.dominantColors.length <= maxExpectedColors);
  }

  result.dominantColors.forEach((color, index) => {
    assert.equal(color.rank, index + 1);
    assert.ok(color.rank >= 1 && color.rank <= 5);
    assert.equal(typeof color.name, "string");
    assert.ok(color.name.length > 0);
    assert.ok(COLOR_FAMILIES.includes(color.family));
    assert.match(color.hex, /^#[0-9A-F]{6}$/);
    assert.equal(color.hex, color.hex.toUpperCase());
    assert.equal(color.rgb.length, 3);
    for (const channel of color.rgb) {
      assert.ok(Number.isInteger(channel));
      assert.ok(channel >= 0 && channel <= 255);
      assert.ok(!Number.isNaN(channel));
    }
    assert.equal(typeof color.proportion, "number");
    assert.ok(!Number.isNaN(color.proportion));
    assert.ok(color.proportion >= 0 && color.proportion <= 100);
    // max 2 decimal places
    assert.equal(Math.round(color.proportion * 100) / 100, color.proportion);
  });

  for (const [family, pct] of Object.entries(result.colorFamilies)) {
    assert.ok(COLOR_FAMILIES.includes(family), `unexpected family key: ${family}`);
    assert.equal(typeof pct, "number");
    assert.ok(!Number.isNaN(pct));
    assert.ok(pct >= 0 && pct <= 100);
  }

  // The generated object must also pass the strict output validator.
  assert.ok(validateColorAnalysis(result) !== null, "result failed validateColorAnalysis");
}

test("mostly red image classifies as Red and is internally consistent", async () => {
  const buf = await solidPng(220, 20, 20);
  const result = await analyzeImageColors(buf);
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Red");
  assert.ok((result.colorFamilies.Red ?? 0) > 90);
});

test("mostly blue image classifies as Blue", async () => {
  const buf = await solidPng(20, 40, 210);
  const result = await analyzeImageColors(buf);
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Blue");
});

test("mostly white image classifies as White", async () => {
  const buf = await solidPng(250, 250, 250);
  const result = await analyzeImageColors(buf);
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "White");
});

test("mostly black image classifies as Black", async () => {
  const buf = await solidPng(10, 10, 10);
  const result = await analyzeImageColors(buf);
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Black");
});

test("beige/brown artwork classifies into Beige or Brown, not Yellow", async () => {
  const beige = await analyzeImageColors(await solidPng(222, 196, 160));
  assertWellFormed(beige, { maxExpectedColors: 1 });
  assert.equal(beige.dominantColors[0].family, "Beige");

  const brown = await analyzeImageColors(await solidPng(101, 67, 33));
  assertWellFormed(brown, { maxExpectedColors: 1 });
  assert.equal(brown.dominantColors[0].family, "Brown");
});

test("multi-color artwork returns up to 5 ranked dominant colors summing to a sane total", async () => {
  const buf = await fourQuadrantPng([
    [200, 30, 30],
    [30, 30, 200],
    [30, 160, 60],
    [235, 225, 200],
  ]);
  const result = await analyzeImageColors(buf);
  assertWellFormed(result);
  assert.ok(result.dominantColors.length >= 3);
  const families = new Set(result.dominantColors.map((c) => c.family));
  assert.ok(families.size >= 3);

  const totalFamilyPct = Object.values(result.colorFamilies).reduce((a, b) => a + b, 0);
  assert.ok(totalFamilyPct > 95 && totalFamilyPct <= 100.5);
});

test("transparent PNG ignores fully-transparent pixels rather than treating them as white", async () => {
  const buf = await transparentPng(30, 120, 40); // green square on transparent field
  const result = await analyzeImageColors(buf);
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Green");
  // If transparency were being treated as white, White would dominate
  // instead (~75% of the canvas is transparent background).
  assert.ok((result.colorFamilies.White ?? 0) < 10);
});

test("WebP artwork is analyzed the same as an equivalent PNG", async () => {
  const result = await analyzeImageColors(await solidWebp(180, 90, 200));
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Purple");
});

test("JPEG artwork is analyzed correctly", async () => {
  const result = await analyzeImageColors(await solidJpeg(240, 200, 40));
  assertWellFormed(result, { maxExpectedColors: 1 });
  assert.equal(result.dominantColors[0].family, "Yellow");
});

test("analyzing the same image twice is deterministic", async () => {
  const buf = await fourQuadrantPng([
    [200, 30, 30],
    [30, 30, 200],
    [30, 160, 60],
    [235, 225, 200],
  ]);
  const first = await analyzeImageColors(buf);
  const second = await analyzeImageColors(buf);
  assert.deepEqual(first, second);
});

test("images with fewer than five meaningful colors don't invent extra ones", async () => {
  const result = await analyzeImageColors(await solidPng(100, 150, 200));
  assert.ok(result.dominantColors.length >= 1 && result.dominantColors.length <= 2);
});

test("classifyColorFamily never throws and always returns a valid family", () => {
  const samples = [
    [0, 0, 0],
    [255, 255, 255],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [222, 196, 160],
    [101, 67, 33],
  ];
  for (const [r, g, b] of samples) {
    const family = classifyColorFamily(r, g, b);
    assert.ok(COLOR_FAMILIES.includes(family));
  }
});

test("validateColorAnalysis rejects malformed input", () => {
  assert.equal(validateColorAnalysis(null), null);
  assert.equal(validateColorAnalysis({}), null);
  assert.equal(
    validateColorAnalysis({
      dominantColors: [{ rank: 1, name: "Red", family: "NotAFamily", hex: "#FF0000", rgb: [255, 0, 0], proportion: 50 }],
      colorFamilies: { Red: 50 },
    }),
    null
  );
  assert.equal(
    validateColorAnalysis({
      dominantColors: [{ rank: 1, name: "Red", family: "Red", hex: "ff0000", rgb: [255, 0, 0], proportion: 50 }],
      colorFamilies: { Red: 50 },
    }),
    null
  );
});
