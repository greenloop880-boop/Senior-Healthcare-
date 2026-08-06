import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\172c5b46-ff8c-4d30-8472-b199420c11e5';

const products = [
  {
    handle: 'shower-chair',
    prompt: 'A professional e-commerce product photograph of an ergonomic medical shower chair with backrest, with the text "Senior Anandam" printed on the back. Clean white studio background, realistic lighting, studio photography, high resolution.',
    filename: 'shower_chair_branded.png'
  },
  {
    handle: 'wrist-bp',
    prompt: 'A professional e-commerce product photograph of a wrist blood pressure monitor with the text "Senior Anandam" printed on the casing. Clean white studio background, realistic lighting, studio photography, high resolution.',
    filename: 'wrist_bp_branded.png'
  }
];

async function downloadImage(url, destPath) {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`Downloading from ${url} to ${destPath}... (retries left: ${retries})`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log(`Saved ${destPath}`);
      return;
    } catch (err) {
      retries--;
      console.error(`Error downloading: ${err.message}. Retrying...`);
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function run() {
  for (const product of products) {
    const encodedPrompt = encodeURIComponent(product.prompt);
    // Add random seed to get fresh images if needed
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&private=true&seed=${seed}`;
    const destPath = path.join(artifactDir, product.filename);
    try {
      await downloadImage(url, destPath);
    } catch (e) {
      console.error(`Error downloading ${product.handle}:`, e);
    }
  }
  console.log('All downloads completed!');
}

run();
