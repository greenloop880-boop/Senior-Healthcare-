import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 });
  await page.goto('http://localhost:5173/');
  
  // Wait for React to load
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'mobile_view.png' });
  
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.carousel-btn')).map(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        className: btn.className,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        background: style.background
      };
    });
  });
  
  console.log(JSON.stringify(buttons, null, 2));
  
  await browser.close();
})();
