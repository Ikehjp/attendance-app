const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'backend-nodejs', 'utils', 'logs', 'combined.log');
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.trim().split('\n');
const lastLines = lines.slice(-10);
console.log(JSON.stringify(lastLines, null, 2));
