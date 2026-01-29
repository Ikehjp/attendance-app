const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'backend-nodejs', 'utils', 'logs', 'combined.log');
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.trim().split('\n');
lines.reverse();
for (let line of lines) {
    if (line.includes('サーバーが起動しました')) {
        console.log(line);
        break;
    }
}
