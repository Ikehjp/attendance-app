const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'backend-nodejs', 'utils', 'logs', 'error.log');
if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    console.log(content.split('\n').slice(-10).join('\n'));
} else {
    console.log('error.log does not exist');
}
