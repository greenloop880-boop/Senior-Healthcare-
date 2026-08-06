const fs = require('fs');
const files = [
  'd:/ecom/site/src/App.jsx',
  'd:/ecom/site/src/config/images.js',
  'd:/ecom/site/src/index.css',
  'd:/ecom/site/index.html'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/ageasy/gi, 'Senior Anandam');
  content = content.replace(/Senior Anandam10/g, 'SENIORANANDAM10');
  content = content.replace(/support@Senior Anandambyantara\.com/g, 'support@senioranandam.com');
  content = content.replace(/grievance@Senior Anandambyantara\.com/g, 'grievance@senioranandam.com');
  fs.writeFileSync(file, content);
});
console.log('Replaced successfully');
