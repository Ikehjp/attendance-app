const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'backend-nodejs', 'utils', 'logs', 'combined.log');
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.trim().split('\n');
console.log(lines.slice(-20).join('\n'));
