const fs = require('fs');
const css = fs.readFileSync('src/index.css', 'utf8');
const lines = css.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('header') || l.toLowerCase().includes('nav') || l.toLowerCase().includes('gap') || l.toLowerCase().includes('margin')) {
    console.log(`${i+1}: ${l}`);
  }
});
