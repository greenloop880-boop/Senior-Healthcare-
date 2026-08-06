const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\5637b5a4-f62e-43c4-a543-91d8366245fa';

const BANNER_CONTENT = {
  p3: { // Joint Relief Massage Oil
    banner1_benefits: { title: "Targeted Pain Relief", subtitle: "Soothes joints and muscles naturally" },
    banner2_ingredients: { title: "Potent Ayurvedic Herbs", subtitle: "Turmeric, Ginger & Sesame Extract" },
    banner3_quality: { title: "100% Pure & Organic", subtitle: "Clinically tested for safety" },
    banner4_usage: { title: "Daily Usage Guide", subtitle: "Massage gently onto affected areas twice daily" }
  },
  p4: { // Digestive Harmony Churna
    banner1_benefits: { title: "Soothes Digestion", subtitle: "Reduces bloating and stomach acidity" },
    banner2_ingredients: { title: "Natural Ingredients", subtitle: "Fennel, Cumin, & Mint Extracts" },
    banner3_quality: { title: "GMP Certified", subtitle: "No artificial preservatives or colors" },
    banner4_usage: { title: "How to Consume", subtitle: "Mix 1 teaspoon in warm water after meals" }
  },
  p5: { // Immunity Boost Herbal Tea
    banner1_benefits: { title: "Boost Your Immunity", subtitle: "Rich in vital natural antioxidants" },
    banner2_ingredients: { title: "Handpicked Herbs", subtitle: "Tulsi, Ginger, & Premium Cardamom" },
    banner3_quality: { title: "Ethically Sourced", subtitle: "100% natural, premium loose leaf tea" },
    banner4_usage: { title: "The Perfect Brew", subtitle: "Steep for 3-5 mins in hot water" }
  }
};

async function processBanners() {
  console.log("Starting banner overlay generation...");
  
  for (const [prefix, banners] of Object.entries(BANNER_CONTENT)) {
    for (const [suffix, textContent] of Object.entries(banners)) {
      const fileName = `${prefix}_${suffix}.avif`;
      const filePath = path.join(artifactDir, fileName);
      
      try {
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          continue;
        }

        console.log(`Processing ${fileName}...`);
        
        // Convert AVIF to PNG buffer so Canvas can read it
        const pngBuffer = await sharp(filePath).png().toBuffer();
        
        // Setup Canvas
        const width = 1200;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Load Image
        const img = await loadImage(pngBuffer);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Draw dark gradient overlay on the left for text readability
        const gradient = ctx.createLinearGradient(0, 0, width * 0.6, 0);
        gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw Text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        
        // Title
        ctx.font = 'bold 54px Arial';
        ctx.fillText(textContent.title, 80, height / 2 - 20);
        
        // Subtitle
        ctx.font = '32px Arial';
        ctx.fillStyle = '#e5e7eb'; // Light gray
        ctx.fillText(textContent.subtitle, 80, height / 2 + 40);
        
        // Draw a decorative line
        ctx.fillStyle = '#f59e0b'; // Amber-500
        ctx.fillRect(80, height / 2 + 80, 100, 4);

        // Convert back to AVIF
        const finalBuffer = canvas.toBuffer('image/png');
        await sharp(finalBuffer)
          .avif({ quality: 85 })
          .toFile(filePath);
          
        console.log(`Success: Added text to ${fileName}`);
        
      } catch (err) {
        console.error(`Failed processing ${fileName}:`, err);
      }
    }
  }
  console.log("Finished all banner overlays.");
}

processBanners();
