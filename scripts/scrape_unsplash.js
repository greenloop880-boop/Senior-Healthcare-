const fs = require('fs');
const https = require('https');

async function scrapeUnsplash(query, count) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
  console.log(`Scraping ${url}...`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    
    // Unsplash uses images.unsplash.com/photo-XXX for their images
    const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-]+[^"'\s]*\?crop=entropy[^"'\s]*/g;
    let matches = html.match(regex) || [];
    
    // Remove duplicates
    matches = [...new Set(matches)];
    
    // Filter out profile pictures, keep only high res
    const validUrls = matches.filter(url => !url.includes('profile-') && !url.includes('w=64') && !url.includes('h=64'));
    
    const selectedUrls = validUrls.slice(0, count).map(url => {
        // Force high resolution and clean up the query params
        const baseUrl = url.split('?')[0];
        return `${baseUrl}?auto=format&fit=crop&q=80`;
    });

    return selectedUrls;
  } catch (err) {
    console.error(`Error scraping ${query}:`, err);
    return [];
  }
}

async function run() {
  const q1 = await scrapeUnsplash('massage-oil', 8);
  console.log('Massage Oil:', q1);

  const q2 = await scrapeUnsplash('herbal-powder', 8);
  console.log('Herbal Powder:', q2);

  const q3 = await scrapeUnsplash('herbal-tea', 8);
  console.log('Herbal Tea:', q3);
}

run();
