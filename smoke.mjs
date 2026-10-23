import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

function sampleWav(seconds = 1) {
  const rate = 16000;
  const samples = Math.floor(rate * seconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 880) * 5500), 44 + i * 2);
  return buffer;
}

const server = await createServer({ server: { host: "127.0.0.1", port: 4189, strictPort: true }, logLevel: "silent" });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:4189/", { waitUntil: "networkidle" });
  await page.locator(".preview-frame canvas").waitFor();
  assert.equal(await page.locator(".project-name-line input").inputValue(), "The art of elsewhere");
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".preview-frame canvas");
    return canvas && canvas.getContext("2d").getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[0] > 30;
  });
  console.log("PASS: starter project loads a real composed preview");

  await page.getByRole("button", { name: "Go to projects" }).click();
  await page.locator(".dashboard-hero h1").waitFor();
  assert.equal(await page.locator(".project-tile").count(), 1);
  await page.getByRole("button", { name: "Create new project" }).click();
  const newProject = page.getByRole("dialog", { name: "Create a new project" });
  await newProject.getByPlaceholder("Give your story a name").fill("Browser smoke project");
  await newProject.getByRole("button", { name: "Create project" }).click();
  await page.locator(".empty-preview").waitFor();
  assert.equal(await page.locator(".project-name-line input").inputValue(), "Browser smoke project");
  console.log("PASS: dashboard creates a blank, editable project");

  await page.locator('.tool-panel input[type="file"]').setInputFiles(resolve("tests/fixtures/short.mp4"));
  await page.locator(".asset-tile").first().waitFor({ timeout: 25000 });
  assert.equal(await page.locator(".asset-tile").count(), 1);
  await page.locator(".asset-tile").first().click();
  await page.locator(".timeline-clip.clip-video").waitFor();
  await page.waitForTimeout(550);
  const pixel = await page.evaluate(() => {
    const canvas = document.querySelector(".preview-frame canvas");
    return [...canvas.getContext("2d").getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data];
  });
  assert(pixel[0] + pixel[1] + pixel[2] > 75, `Expected decoded video frame, got ${pixel}`);
  console.log("PASS: imported MP4 decodes and displays on the timeline");

  await page.locator(".timeline-ruler").click({ position: { x: 30, y: 10 } });
  await page.keyboard.press("s");
  await page.waitForFunction(() => document.querySelectorAll(".timeline-clip.clip-video").length === 2);
  await page.keyboard.press("Control+z");
  await page.waitForFunction(() => document.querySelectorAll(".timeline-clip.clip-video").length === 1);
  await page.keyboard.press("Control+Shift+z");
  await page.waitForFunction(() => document.querySelectorAll(".timeline-clip.clip-video").length === 2);
  await page.keyboard.press("Control+z");
  console.log("PASS: split, undo, and redo modify actual clips");

  await page.locator(".tool-rail-button").filter({ hasText: "Text" }).click();
  await page.getByRole("button", { name: "Add text to video" }).click();
  await page.locator(".properties-scroll textarea").fill("NEXORA TEST");
  await page.getByRole("tab", { name: "Timing" }).click();
  const textStart = page.locator(".properties-scroll .numeric-field").filter({ hasText: "Start" }).locator("input");
  await textStart.fill("0"); await textStart.blur();
  const textDuration = page.locator(".properties-scroll .numeric-field").filter({ hasText: "Duration" }).locator("input");
  await textDuration.fill("1"); await textDuration.blur();
  assert.equal(await page.locator(".timeline-clip.clip-text").count(), 1);
  console.log("PASS: editable title is placed on a text track");

  await page.locator(".tool-rail-button").filter({ hasText: "Audio" }).click();
  await page.locator('.tool-panel input[type="file"]').setInputFiles({ name: "original-tone.wav", mimeType: "audio/wav", buffer: sampleWav() });
  await page.locator(".asset-tile").first().waitFor();
  await page.locator(".asset-tile").first().click();
  await page.locator(".timeline-clip.clip-audio").waitFor();
  await page.getByRole("tab", { name: "Timing" }).click();
  const audioStart = page.locator(".properties-scroll .numeric-field").filter({ hasText: "Start" }).locator("input");
  await audioStart.fill("0"); await audioStart.blur();
  assert((await page.locator(".clip-waveform i").count()) > 0, "Expected decoded audio waveform bars");
  console.log("PASS: imported WAV has an actual waveform and audio clip");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportDialog = page.getByRole("dialog", { name: "Export video" });
  await exportDialog.locator(".export-format-options button").nth(1).click();
  await exportDialog.getByRole("button", { name: "Start export" }).click();
  await page.locator(".export-done").waitFor({ timeout: 30000 });
  const output = await page.evaluate(async () => {
    const link = document.querySelector(".export-done a[download]");
    const blob = await (await fetch(link.href)).blob();
    return { size: blob.size, mime: blob.type, filename: link.download };
  });
  assert(output.size > 2000, `Export returned an empty or tiny file: ${JSON.stringify(output)}`);
  assert(output.filename.endsWith(".webm"));
  console.log(`PASS: actual edited WebM file generated (${output.size} bytes)`);

  await page.locator(".export-done .text-button").click();
  await page.locator(".export-format-options button").first().click();
  await page.getByRole("button", { name: "Start export" }).click();
  await page.locator(".export-done").waitFor({ timeout: 30000 });
  const mp4 = await page.evaluate(async () => {
    const link = document.querySelector(".export-done a[download]");
    const blob = await (await fetch(link.href)).blob();
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    return { size: blob.size, filename: link.download, signature: String.fromCharCode(...bytes.slice(4, 8)) };
  });
  assert(mp4.size > 2000);
  assert(mp4.filename.endsWith(".mp4"), `Expected native MP4 export in Chromium: ${JSON.stringify(mp4)}`);
  assert.equal(mp4.signature, "ftyp");
  console.log(`PASS: native MP4 export generated a valid MP4 header (${mp4.size} bytes)`);

  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".preview-frame canvas").waitFor();
  assert.equal(await page.locator(".project-name-line input").inputValue(), "Browser smoke project");
  assert.equal(await page.locator(".timeline-clip").count(), 3);
  console.log("PASS: project and local media recover after reload");

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".asset-remove").first().click({ force: true });
  await page.waitForFunction(() => document.querySelectorAll(".asset-tile").length === 1);
  await page.keyboard.press("Control+z");
  await page.waitForFunction(() => document.querySelectorAll(".asset-tile").length === 2);
  console.log("PASS: removing media can be undone without losing the local file");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open tools" }).click();
  assert(await page.locator(".editor-workspace.tools-open .tool-panel").isVisible());
  await page.getByRole("button", { name: "Open properties" }).click();
  assert(await page.locator(".editor-workspace.inspector-open .properties-panel").isVisible());
  console.log("PASS: mobile tool and properties drawers open");

  assert.deepEqual(errors, [], `Browser errors: ${errors.join("; ")}`);
  console.log("All Nexora Studio browser smoke checks passed.");
} finally {
  await browser.close();
  await server.close();
}