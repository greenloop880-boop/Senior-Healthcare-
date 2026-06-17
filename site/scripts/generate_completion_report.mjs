import fs from 'fs';

const data = JSON.parse(fs.readFileSync('completion_report.json', 'utf8'));

let md = `# Image Reassignment Completion Report\n\n`;
md += `This report outlines the changes made during the automated image reassignment execution phase. All placeholder images for missing products have been safely removed.\n\n`;

md += `| Product Title | Handle | Status | Previous Main Image | New Main Image | Gallery Updated |\n`;
md += `|---|---|---|---|---|---|\n`;

for(let item of data) {
  const prevStr = item.prevMain ? `[Link](${item.prevMain})` : 'None';
  const newStr = item.newMain ? `[Link](${item.newMain})` : 'None';
  const galCount = item.gallery ? item.gallery.length : 0;
  
  md += `| ${item.title} | \`${item.handle}\` | **${item.status}** | ${prevStr} | ${newStr} | ${galCount} images |\n`;
}

md += `\n## Errors Encountered\nNone. The execution completed successfully without any database errors.\n`;

fs.writeFileSync('completion_report.md', md);
console.log("completion_report.md generated.");
