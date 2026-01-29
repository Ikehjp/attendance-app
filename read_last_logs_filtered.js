const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'backend-nodejs', 'utils', 'logs', 'combined.log');
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.trim().split('\n');
const lastLines = lines.slice(-50);
lastLines.forEach(line => {
    try {
        const obj = JSON.parse(line);
        if (obj.level === 'error' || obj.message.includes('出欠')) {
            console.log(JSON.stringify(obj, null, 2));
        }
    } catch (e) {
        // ignore
    }
});
