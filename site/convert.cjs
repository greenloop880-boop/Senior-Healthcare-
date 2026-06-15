const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const img1 = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\d64d660d-7d42-4fd5-98df-f67e106d0041\\senior_banner_1_1781099851815.png';
const img2 = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\d64d660d-7d42-4fd5-98df-f67e106d0041\\senior_banner_2_1781099869775.png';

const outDir = path.join(__dirname, 'src', 'assets');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function convert() {
    try {
        await sharp(img1)
            .avif({ quality: 80 })
            .toFile(path.join(outDir, 'senior_banner_1.avif'));
        console.log('Converted banner 1');

        await sharp(img2)
            .avif({ quality: 80 })
            .toFile(path.join(outDir, 'senior_banner_2.avif'));
        console.log('Converted banner 2');
    } catch (error) {
        console.error('Error converting:', error);
    }
}

convert();
