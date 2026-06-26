const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const envPath = path.resolve(__dirname, '../admin/.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      envVars[key.trim()] = values.join('=').trim();
    }
  }
});

const R2_ENDPOINT = envVars['VITE_CLOUDFLARE_R2_ENDPOINT'];
const R2_ACCESS_KEY = envVars['VITE_CLOUDFLARE_R2_ACCESS_KEY_ID'];
const R2_SECRET_KEY = envVars['VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
const R2_BUCKET = envVars['VITE_CLOUDFLARE_R2_BUCKET'] || 'storage';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY
  }
});

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\5637b5a4-f62e-43c4-a543-91d8366245fa';

async function uploadImages() {
  console.log('Uploading updated images to R2...');
  const files = fs.readdirSync(artifactDir).filter(f => f.endsWith('.avif') && (f.startsWith('p3_') || f.startsWith('p4_') || f.startsWith('p5_')));
  
  for (const file of files) {
    const filePath = path.join(artifactDir, file);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const objectKey = `products/${file}`;
    
    console.log(`Uploading ${objectKey}...`);
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: fs.readFileSync(filePath),
      ContentType: contentType,
    });
    
    try {
      await s3Client.send(command);
      console.log(`Successfully uploaded ${objectKey}`);
    } catch (err) {
      console.error(`Error uploading ${objectKey}:`, err);
    }
  }
  console.log('Done uploading!');
}

uploadImages();
