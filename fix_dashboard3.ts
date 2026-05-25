import fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The file currently has "theme-dark:hover theme-athlete:hover"
// Let's replace the broken strings manually!

content = content.replace(/theme-dark:hover theme-athlete:hover:bg-sky-700/g, 'theme-dark:hover:bg-sky-700 theme-athlete:hover:bg-sky-700');
content = content.replace(/theme-dark:hover theme-athlete:hover:bg-slate-700/g, 'theme-dark:hover:bg-slate-700 theme-athlete:hover:bg-slate-700');

// Wait! What if the regex from `fix_dashboard.ts` did:
// `content = content.replace(/theme-dark:([a-zA-Z0-9\-\/]+)/g, ...`
// `"theme-dark:hover:bg-sky-700"` -> matched `"theme-dark:hover"` with `classSuffix="hover"`.
// Replaced with `"theme-dark:hover theme-athlete:hover"`.
// The remainder `":bg-sky-700"` was untouched!
// So it became: `"theme-dark:hover theme-athlete:hover:bg-sky-700"`
// Let's see what happened to hover:bg-slate-700.
// It became `"theme-dark:hover theme-athlete:hover:bg-slate-700"`.

fs.writeFileSync(filePath, content);
console.log("Restored missing colons!");
