const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

// Load environment variables from admin/.env manually since dotenv might not be fully configured for paths
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

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'];
const SUPABASE_KEY = envVars['VITE_SUPABASE_ANON_KEY'];
const R2_ENDPOINT = envVars['VITE_CLOUDFLARE_R2_ENDPOINT'];
const R2_ACCESS_KEY = envVars['VITE_CLOUDFLARE_R2_ACCESS_KEY_ID'];
const R2_SECRET_KEY = envVars['VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
const R2_BUCKET = envVars['VITE_CLOUDFLARE_R2_BUCKET'] || 'storage';
const R2_PUBLIC_URL = envVars['VITE_CLOUDFLARE_R2_PUBLIC_URL'];

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY
  }
});

const PRODUCTS = [
  {
    prefix: 'p1',
    name: 'Ashwagandha Vitality Capsules',
    short_description: 'Stress relief and natural energy support.',
    description: 'Ashwagandha Vitality Capsules are formulated with premium, highly potent Ashwagandha root extract to help you manage daily stress, promote a calm and relaxed state of mind, and boost your natural energy levels. Our 100% organic, lab-tested supplement is designed for adults seeking holistic well-being and enhanced vitality.',
    mrp: 1499,
    selling_price: 1199,
    openingStock: 150
  },
  {
    prefix: 'p2',
    name: 'Brahmi Mind Focus Powder',
    short_description: 'Cognitive enhancement and memory support.',
    description: 'Brahmi Mind Focus Powder is a finely milled, premium Ayurvedic supplement crafted to enhance cognitive function, boost memory, and increase mental clarity. Perfect for students and professionals looking to sharpen their focus naturally without caffeine jitters.',
    mrp: 1299,
    selling_price: 999,
    openingStock: 120
  },
  {
    prefix: 'p3',
    name: 'Joint Relief Herbal Massage Oil',
    short_description: 'Soothing relief for muscle and joint pain.',
    description: 'Experience soothing relief with our Joint Relief Herbal Massage Oil. A potent blend of warming herbs, essential oils, and deeply penetrating carrier oils designed to alleviate joint discomfort, reduce inflammation, and improve flexibility.',
    mrp: 899,
    selling_price: 699,
    openingStock: 200
  },
  {
    prefix: 'p4',
    name: 'Digestive Harmony Churna',
    short_description: 'Natural blend for gut health and digestion.',
    description: 'Digestive Harmony Churna is a traditional Ayurvedic digestive aid made from a blend of premium, pure herbs. It helps balance stomach acidity, reduces bloating, and promotes healthy, comfortable digestion after meals.',
    mrp: 749,
    selling_price: 599,
    openingStock: 180
  },
  {
    prefix: 'p5',
    name: 'Immunity Boost Herbal Tea',
    short_description: 'Antioxidant-rich tea for daily wellness.',
    description: 'A comforting, antioxidant-rich herbal tea blend featuring holy basil, ginger, and warming spices. Designed to naturally boost your immune system, soothe your throat, and provide a warming daily wellness ritual.',
    mrp: 499,
    selling_price: 399,
    openingStock: 300
  }
];

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\5637b5a4-f62e-43c4-a543-91d8366245fa';

async function uploadToR2(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const contentType = mime.lookup(filePath) || 'application/octet-stream';
  const folder = 'products';
  const objectKey = `${folder}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${R2_PUBLIC_URL}/${objectKey}`;
}

async function seedProducts() {
  console.log('Starting seed process...');

  try {

    console.log('Cleaning up existing seed products...');
    const slugsToDelete = PRODUCTS.map(p => p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    await supabase.from('products').delete().in('slug', slugsToDelete);

    for (const product of PRODUCTS) {
      console.log(`Processing product: ${product.name}`);
      
      // 1. Gather all required AVIF images
      const mainPhotoName = `${product.prefix}_photo1_main.avif`;
      const galleryPhotoNames = [
        `${product.prefix}_photo2_ingredients.avif`,
        `${product.prefix}_photo3_lifestyle.avif`,
        `${product.prefix}_photo4_closeup.avif`
      ];
      const bannerNames = [
        `${product.prefix}_banner1_benefits.avif`,
        `${product.prefix}_banner2_ingredients.avif`,
        `${product.prefix}_banner3_quality.avif`,
        `${product.prefix}_banner4_usage.avif`
      ];

      // 2. Upload images to R2
      console.log('Uploading main image...');
      const imageUrl = await uploadToR2(path.join(artifactDir, mainPhotoName), mainPhotoName);
      
      console.log('Uploading gallery images...');
      const images = [];
      for (const name of galleryPhotoNames) {
        images.push(await uploadToR2(path.join(artifactDir, name), name));
      }

      console.log('Uploading banner images...');
      const detailBanners = [];
      for (const name of bannerNames) {
        detailBanners.push(await uploadToR2(path.join(artifactDir, name), name));
      }

      // 3. Create metadata
      const metadata = {
        brand: 'Senior Anandam',
        net_quantity: 'See packaging',
        country_of_origin: 'India',
        dimensions: 'Standard',
        generic_name: 'Ayurvedic Supplement',
        marketed_by: 'Senior Anandam Pvt Ltd',
        detail_banners: detailBanners
      };

      // 4. Insert Product
      const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const productPayload = {
        name: product.name,
        slug: slug,
        short_description: product.short_description,
        description: product.description,
        is_active: true,
        image_url: imageUrl,
        images: images,
        metadata: metadata
      };

      console.log('Inserting product to Supabase...');
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (productError) throw new Error(`Error inserting product ${product.name}: ${productError.message}`);

      // 5. Insert SKU
      const skuPayload = {
        product_id: productData.id,
        sku_code: `${product.prefix.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        variant_name: 'Standard',
        mrp: product.mrp,
        selling_price: product.selling_price,
        reorder_level: 10,
        average_cost: product.selling_price * 0.6
      };

      console.log('Inserting SKU to Supabase...');
      const { data: skuData, error: skuError } = await supabase
        .from('skus')
        .insert(skuPayload)
        .select()
        .single();

      if (skuError) throw new Error(`Error inserting SKU for ${product.name}: ${skuError.message}`);

      console.log(`Successfully completed: ${product.name}`);
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seedProducts();
