import fs from 'fs';
import path from 'path';

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file === 'node_modules' || file === '.git' || file === 'scratch') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            results = results.concat(getFiles(filePath));
        } else if (file.endsWith('.md')) {
            results.push(filePath);
        }
    }
    return results;
}

const allMdFiles = getFiles('./');
const fileSet = new Set(allMdFiles.map(f => f.replace(/\\/g, '/')));
let linkErrors = [];
let allLinks = new Set();

for (const file of allMdFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const linkRegex = /\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        let link = match[1];
        if (link.startsWith('http') || link.startsWith('#')) continue; // skip web and anchor links
        if (link.startsWith('file:///')) {
            link = link.replace('file:///c:/Users/abhin/Videos/MigrationGuard/', '');
            link = link.replace('file:///C:/Users/abhin/Videos/MigrationGuard/', '');
        }
        link = link.split('#')[0]; // remove anchor
        allLinks.add(link);
        
        let target = path.resolve(path.dirname(file), link);
        target = path.relative(process.cwd(), target).replace(/\\/g, '/');
        
        if (!fileSet.has(target)) {
            linkErrors.push(`${file}: broken link to ${link} (resolved as ${target})`);
        }
    }
}

const orphans = Array.from(fileSet).filter(f => !allLinks.has(f) && !f.includes('README'));

console.log("=== BROKEN LINKS ===");
console.log(linkErrors.join('\n') || "None");
console.log("\n=== ORPHANED FILES (not linked) ===");
console.log(orphans.slice(0, 50).join('\n'));
