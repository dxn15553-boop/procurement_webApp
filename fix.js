const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('route.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('d:/DXN/procurement/app/api');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const runtime')) {
    content += '\nexport const runtime = "nodejs";\n';
    fs.writeFileSync(file, content);
  }
}
