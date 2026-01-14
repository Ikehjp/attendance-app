const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const EMAIL = `debug_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function runDebug() {
    try {
        console.log('1. Registering new student...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Debug Student',
            email: EMAIL,
            password: PASSWORD,
            role: 'student',
            studentId: 'DEBUG' + Date.now()
        });
        console.log('Register success:', regRes.data);
        const userId = regRes.data.userId;

        console.log('2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        console.log('Login success');

        // Get token from cookie or response? 
        // The backend sets httpOnly cookie 'token'.
        // Axios needs to handle cookies.
        const cookie = loginRes.headers['set-cookie'];
        const headers = {
            Cookie: cookie
        };

        console.log('3. Calling getMonthlyReport...');
        try {
            const reportRes = await axios.get(`${API_URL}/attendance/report`, {
                params: { year: 2025, month: 12, userId: userId },
                headers
            });
            console.log('getMonthlyReport success');
        } catch (e) {
            console.error('getMonthlyReport failed:', e.response ? e.response.data : e.message);
        }

        console.log('4. Calling getDailyStats...');
        try {
            const statsRes = await axios.get(`${API_URL}/attendance/daily-stats`, {
                params: { year: 2025, month: 12 },
                headers
            });
            console.log('getDailyStats success');
        } catch (e) {
            console.error('getDailyStats failed:', e.response ? e.response.data : e.message);
        }

        console.log('5. Calling getEvents...');
        try {
            const eventsRes = await axios.get(`${API_URL}/events`, {
                params: { startDate: '2025-12-01', endDate: '2025-12-31' },
                headers
            });
            console.log('getEvents success');
        } catch (e) {
            console.error('getEvents failed:', e.response ? e.response.data : e.message);
        }

    } catch (error) {
        console.error('Debug script error:', error.response ? error.response.data : error.message);
    }
}

runDebug();
