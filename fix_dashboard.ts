import fs from 'fs';

const filePath = 'components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Use a regex to find all `theme-dark:XXX` and append `theme-athlete:XXX` if it doesn't already exist
content = content.replace(/theme-dark:([a-zA-Z0-9\-\/]+)/g, (match, classSuffix) => {
    return `${match} theme-athlete:${classSuffix}`;
});

fs.writeFileSync(filePath, content);
console.log('Dashboard.tsx updated!');
