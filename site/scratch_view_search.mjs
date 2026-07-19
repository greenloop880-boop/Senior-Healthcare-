import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  
  console.log("Navigating directly to Search Page...");
  await page.goto('http://localhost:5173/#search?q=BP');
  await page.reload(); // Force reload to run initial router code
  
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'search_results_mobile.png' });
  
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
  
  console.log("Search page results:");
  console.log(JSON.stringify(searchButtonsInfo, null, 2));
  
  await browser.close();
})();
