import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log("Navigating directly to Search Page...");
  await page.goto('http://localhost:5173/#search?q=BP');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
