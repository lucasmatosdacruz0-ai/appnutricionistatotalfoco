import fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Undo the broken theme-athlete additions
content = content.replace(/ theme-athlete:[a-zA-Z0-9\-\/:]+/g, '');
// Wait, the broken one was `theme-dark:hover theme-athlete:hover:bg-sky-700`
// This regex will remove ` theme-athlete:hover:bg-sky-700` but leave `theme-dark:hover`
// Let's just fix it manually by removing ALL ` theme-athlete:...`
content = content.replace(/ theme-athlete:[a-zA-Z0-9\-\/:]+/g, '');

// Also fix the broken `theme-dark:hover:bg` ...
// Let's read the file line by line and fix it!
fs.writeFileSync(filePath + '.temp', content);
