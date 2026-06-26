const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createCanvas } = require('canvas');

const PRODUCTS = [
  { prefix: 'p1', name: 'Ashwagandha Vitality Capsules' },
  { prefix: 'p2', name: 'Brahmi Mind Focus Powder' },
  { prefix: 'p3', name: 'Joint Relief Herbal Massage Oil' },
  { prefix: 'p4', name: 'Digestive Harmony Churna' },
  { prefix: 'p5', name: 'Immunity Boost Herbal Tea' }
];

const IMAGES = [
  { suffix: 'photo1_main', width: 800, height: 800, color: '#f8ece1' },
  { suffix: 'photo2_ingredients', width: 800, height: 800, color: '#dce5db' },
  { suffix: 'photo3_lifestyle', width: 800, height: 800, color: '#fbe2cd' },
  { suffix: 'photo4_closeup', width: 800, height: 800, color: '#e5e1e1' },
  { suffix: 'banner1_benefits', width: 1200, height: 400, color: '#e1dcd7' },
  { suffix: 'banner2_ingredients', width: 1200, height: 400, color: '#d5e0cd' },
  { suffix: 'banner3_quality', width: 1200, height: 400, color: '#f4f1ea' },
  { suffix: 'banner4_usage', width: 1200, height: 400, color: '#e9d6c4' }
];

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\5637b5a4-f62e-43c4-a543-91d8366245fa';

async function processImages() {
  const existingFiles = fs.readdirSync(artifactDir);

  for (const product of PRODUCTS) {
    for (const imgConfig of IMAGES) {
      const baseName = `${product.prefix}_${imgConfig.suffix}`;
      
      // Find if we already have a generated PNG for this
      const existingPng = existingFiles.find(f => f.startsWith(baseName) && f.endsWith('.png'));
      
      const avifFileName = `${baseName}.avif`;
      const avifFilePath = path.join(artifactDir, avifFileName);

      if (existingPng) {
        console.log(`Converting existing PNG to AVIF: ${existingPng}`);
        try {
          await sharp(path.join(artifactDir, existingPng))
            .avif({ quality: 80 })
            .toFile(avifFilePath);
          console.log(`Saved ${avifFileName}`);
        } catch (err) {
          console.error(`Error converting ${existingPng}:`, err);
        }
      } else {
        console.log(`Generating placeholder AVIF: ${avifFileName}`);
        const canvas = createCanvas(imgConfig.width, imgConfig.height);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = imgConfig.color;
        ctx.fillRect(0, 0, imgConfig.width, imgConfig.height);
        
        // Text
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title
        ctx.font = 'bold 40px Arial';
        ctx.fillText(product.name, imgConfig.width / 2, imgConfig.height / 2 - 20);
        
        // Subtitle
        ctx.font = '30px Arial';
        const typeLabel = imgConfig.suffix.replace(/_/g, ' ').toUpperCase();
        ctx.fillText(typeLabel, imgConfig.width / 2, imgConfig.height / 2 + 40);

        const buffer = canvas.toBuffer('image/png');
        try {
          await sharp(buffer)
            .avif({ quality: 80 })
            .toFile(avifFilePath);
          console.log(`Saved ${avifFileName}`);
        } catch (err) {
          console.error(`Error generating placeholder ${avifFileName}:`, err);
        }
      }
    }
  }
  console.log('Finished image processing.');
}

processImages();
