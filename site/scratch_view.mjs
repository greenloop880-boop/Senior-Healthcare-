import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 }); // standard mobile size
  
  console.log("Navigating to Collection Page...");
  await page.goto('http://localhost:5173/#collection');
  
  // Wait 3 seconds for data to load
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'collection_mobile.png' });
  
  const buttonsInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    return cards.map(card => {
      const title = card.querySelector('.product-card-title')?.innerText || '';
      // Find mobile buttons
      const mobileRow = card.querySelector('.mobile-buttons-row');
      const buttons = mobileRow ? Array.from(mobileRow.querySelectorAll('button')) : [];
      return {
        title,
        hasMobileRow: !!mobileRow,
        buttons: buttons.map(b => ({
          text: b.innerText,
          disabled: b.disabled,
          display: window.getComputedStyle(b).display,
          opacity: window.getComputedStyle(b).opacity
        }))
      };
    });
  });
  
  console.log("Collection page mobile buttons:");
  console.log(JSON.stringify(buttonsInfo, null, 2));
  
  console.log("Navigating to Search Page with 'BP' query...");
  await page.goto('http://localhost:5173/#search?q=BP');
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'search_mobile.png' });
  
  const searchButtonsInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    return cards.map(card => {
      const title = card.querySelector('.product-card-title')?.innerText || '';
      const mobileRow = card.querySelector('.mobile-buttons-row');
      const buttons = mobileRow ? Array.from(mobileRow.querySelectorAll('button')) : [];
      return {
        title,
        hasMobileRow: !!mobileRow,
        buttons: buttons.map(b => ({
          text: b.innerText,
          disabled: b.disabled,
          display: window.getComputedStyle(b).display,
          opacity: window.getComputedStyle(b).opacity
        }))
      };
    });
  });
  
  console.log("Search page mobile buttons:");
  console.log(JSON.stringify(searchButtonsInfo, null, 2));
  
  await browser.close();
})();
