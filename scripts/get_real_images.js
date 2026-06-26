const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const path = require('path');

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\5637b5a4-f62e-43c4-a543-91d8366245fa';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const request = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    request.on('error', (err) => {
      reject(err);
    });
  });
}

// Fixed URLs that are product specific
const PRODUCTS_IMAGES = {
  p3: { // Joint Relief Massage Oil
    query: 'massage oil bottle',
    urls: [
      'https://images.pexels.com/photos/3757945/pexels-photo-3757945.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/6621430/pexels-photo-6621430.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3865676/pexels-photo-3865676.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/4465121/pexels-photo-4465121.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/6621422/pexels-photo-6621422.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/6621431/pexels-photo-6621431.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/3757946/pexels-photo-3757946.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/6724391/pexels-photo-6724391.jpeg?auto=compress&cs=tinysrgb&w=1200'  // banner
    ]
  },
  p4: { // Digestive Harmony Churna (Powder)
    query: 'herbal powder bowl',
    urls: [
      'https://images.pexels.com/photos/8844390/pexels-photo-8844390.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/8844391/pexels-photo-8844391.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/8844394/pexels-photo-8844394.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/8844396/pexels-photo-8844396.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/8844402/pexels-photo-8844402.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/8844395/pexels-photo-8844395.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/8844392/pexels-photo-8844392.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/8844389/pexels-photo-8844389.jpeg?auto=compress&cs=tinysrgb&w=1200'  // banner
    ]
  },
  p5: { // Immunity Boost Herbal Tea
    query: 'herbal tea cup',
    urls: [
      'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/227908/pexels-photo-227908.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1417944/pexels-photo-1417944.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1417946/pexels-photo-1417946.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/1417947/pexels-photo-1417947.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/159201/tea-cup-tea-time-relax-159201.jpeg?auto=compress&cs=tinysrgb&w=1200', // banner
      'https://images.pexels.com/photos/2583842/pexels-photo-2583842.jpeg?auto=compress&cs=tinysrgb&w=1200'  // banner
    ]
  }
};

const TYPES = [
  { suffix: 'photo1_main.avif', w: 800, h: 800 },
  { suffix: 'photo2_ingredients.avif', w: 800, h: 800 },
  { suffix: 'photo3_lifestyle.avif', w: 800, h: 800 },
  { suffix: 'photo4_closeup.avif', w: 800, h: 800 },
  { suffix: 'banner1_benefits.avif', w: 1200, h: 400 },
  { suffix: 'banner2_ingredients.avif', w: 1200, h: 400 },
  { suffix: 'banner3_quality.avif', w: 1200, h: 400 },
  { suffix: 'banner4_usage.avif', w: 1200, h: 400 }
];

async function run() {
  for (const [prefix, data] of Object.entries(PRODUCTS_IMAGES)) {
    for (let i = 0; i < 8; i++) {
      const type = TYPES[i];
      const url = data.urls[i];
      const tempPath = path.join(artifactDir, `temp_${prefix}_${i}.jpg`);
      const finalPath = path.join(artifactDir, `${prefix}_${type.suffix}`);

      try {
        console.log(`Downloading ${url}...`);
        await downloadFile(url, tempPath);
        
        console.log(`Processing to ${finalPath}...`);
        await sharp(tempPath)
          .resize(type.w, type.h, { fit: 'cover', position: 'center' })
          .avif({ quality: 80 })
          .toFile(finalPath);
          
        fs.unlinkSync(tempPath);
        console.log(`Done: ${finalPath}`);
      } catch (err) {
        console.error(`Failed on ${prefix} image ${i}:`, err);
      }
    }
  }
  console.log('All real images processed.');
}

run();
