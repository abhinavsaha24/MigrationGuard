import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file.includes('node_modules') || file.includes('.git')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (file.endsWith('.md')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk('./');
const report = files.map(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const title = lines.find(l => l.startsWith('#')) || 'NO TITLE';
    const firstFewLines = lines.slice(0, 10).join('\\n');
    return `${file}\n--- TITLE: ${title} ---\n${firstFewLines}\n======================\n`;
}).join('\n');

fs.writeFileSync('audit-summary.txt', report);
console.log('Saved to audit-summary.txt');
