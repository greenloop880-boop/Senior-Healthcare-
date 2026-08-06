import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const s3Client = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
}) : null;

const BUCKET = process.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';
const PUBLIC_URL = process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;

// Copy existing static configs (Mock data for initial seeding)
const heroBanners = [
  {
    title: "Active Fall Prevention",
    subtitle: "Ensure safety at home with robust walking aids and non-slip bathroom installations",
    image: "https://picsum.photos/seed/img3/3200/1200",
    mobileImage: "https://picsum.photos/seed/img4/1200/1200",
    link: "/collection/fall",
    bgGradient: "linear-gradient(90deg, rgba(47,57,102,0) 0%, rgba(29,36,68,0.7) 100%)"
  },
  {
    title: "Better Gut Wellness",
    subtitle: "Discover natural balance and gentle relief with herbal digestive supplements",
    image: "https://picsum.photos/seed/img5/3200/1200",
    mobileImage: "https://picsum.photos/seed/img6/1200/1200",
    link: "/collection/gut-wellness",
    bgGradient: "linear-gradient(90deg, rgba(47,57,102,0) 0%, rgba(29,36,68,0.7) 100%)"
  }
];

const healthReviews = [
  {
    title: "Lung Health Assessment",
    image: "https://picsum.photos/seed/img25/1000/1400",
    description: "Evaluate your respiratory wellness and lung efficiency with our 2-minute assessment developed by senior therapists.",
    tag: "Lung Health",
    link: "/respiratory-assessment",
    quizId: "lung"
  },
  {
    title: "Gut Health Assessment",
    image: "https://picsum.photos/seed/img26/1000/1400",
    description: "Understand your digestion, gut flora balance, and natural nutrient absorption through a quick digestive review.",
    tag: "Gut Health",
    link: "/gut-assessment",
    quizId: "gut"
  }
];

const communityVideos = [
  {
    id: "sugar-check",
    title: "Continuous Glucose Monitor (CGM) + Transmit...",
    bgImage: "https://picsum.photos/seed/img28/720/1280",
    overlayText: "Blood sugar check karli aapne?",
    youtubeId: "dQw4w9WgXcQ",
    productImg: "https://picsum.photos/seed/img29/160/160"
  },
  {
    id: "bp-monitor",
    title: "Digital bp Monitor by Senior Anandam",
    bgImage: "https://picsum.photos/seed/img30/720/1280",
    overlayText: "Accurate blood pressure tracks at home",
    youtubeId: "J_VjW8jI98I",
    productImg: "https://picsum.photos/seed/img31/160/160"
  }
];

const premiumCustomerReviews = [
  {
    title: "A life saving product",
    text: "This bunion corrector is a lifesaver! The adjustable knob really helps in customizing the stretch.",
    author: "Anuradha",
    productIcon: "https://picsum.photos/seed/img38/240/240",
    bgImage: "https://picsum.photos/seed/img39/800/1000",
    stars: 5
  },
  {
    title: "Awesome Product for knees",
    text: "It's very helpful for knee support. It fits the knees perfectly. The quality is very good.",
    author: "Sanjay Hirani",
    productIcon: "https://picsum.photos/seed/img40/240/240",
    bgImage: "https://picsum.photos/seed/img41/800/1000",
    stars: 5
  }
];

async function uploadImageToR2(imageUrl, folder) {
  if (!s3Client || !imageUrl) return imageUrl || null;
  console.log(`Downloading ${imageUrl}...`);
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg'
  }));

  return `${PUBLIC_URL}/${filename}`;
}

async function seedData() {
  console.log("Seeding Hero Banners...");
  for (let banner of heroBanners) {
    const desktopUrl = await uploadImageToR2(banner.image, 'hero');
    const mobileUrl = await uploadImageToR2(banner.mobileImage, 'hero');
    await supabase.from('hero_banners').insert({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: desktopUrl,
      mobile_image_url: mobileUrl,
      link: banner.link,
      bg_gradient: banner.bgGradient
    });
  }

  console.log("Seeding Health Reviews...");
  for (let review of healthReviews) {
    const imgUrl = await uploadImageToR2(review.image, 'health');
    await supabase.from('health_reviews').insert({
      title: review.title,
      description: review.description,
      image_url: imgUrl,
      tag: review.tag,
      link: review.link,
      quiz_id: review.quizId
    });
  }

  console.log("Seeding Community Videos...");
  for (let video of communityVideos) {
    const bgUrl = await uploadImageToR2(video.bgImage, 'community');
    const prodUrl = await uploadImageToR2(video.productImg, 'community');
    await supabase.from('community_videos').insert({
      id: video.id,
      title: video.title,
      bg_image_url: bgUrl,
      product_img_url: prodUrl,
      overlay_text: video.overlayText,
      youtube_id: video.youtubeId
    });
  }

  console.log("Seeding Customer Reviews...");
  for (let cr of premiumCustomerReviews) {
    const iconUrl = await uploadImageToR2(cr.productIcon, 'reviews');
    const bgUrl = await uploadImageToR2(cr.bgImage, 'reviews');
    await supabase.from('customer_reviews').insert({
      title: cr.title,
      text: cr.text,
      author: cr.author,
      product_icon_url: iconUrl,
      bg_image_url: bgUrl,
      stars: cr.stars
    });
  }

  console.log("Database seeded successfully!");
}

seedData().catch(console.error);
