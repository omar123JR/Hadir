import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, '../src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf-8');

  // Fix signature: async (req, res) => ...
  content = content.replace(/async\s*\(\s*(req[^,)]*)\s*,\s*(res[^,)]*)\s*\)\s*=>/g, 'async ($1, $2, next) =>');

  // Replace catch block:
  content = content.replace(/catch\s*\(\s*([^)]+)\s*\)\s*\{([\s\S]*?)res\.status\(\d+\)\.json\(\s*\{[\s\S]*?\}\s*\);?\n?\s*\}/g, (match, errVar, beforeRes) => {
    // If it already has next(error) inside, skip.
    if (beforeRes.includes('next(')) return match;
    
    return `catch (${errVar}) {${beforeRes}next(${errVar.split(':')[0].trim()});\n  }`;
  });

  fs.writeFileSync(path.join(routesDir, file), content);
  console.log('Processed', file);
}
