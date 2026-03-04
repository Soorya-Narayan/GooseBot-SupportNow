const axios = require('axios');
require('dotenv').config();

const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN,
    ZOHO_API_DOMAIN,
    ZOHO_ORG_ID
} = process.env;

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('refresh_token', ZOHO_REFRESH_TOKEN);
    params.append('client_id', ZOHO_CLIENT_ID);
    params.append('client_secret', ZOHO_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');
    const res = await axios.post('https://accounts.zoho.in/oauth/v2/token', params);
    return res.data.access_token;
}

async function listDepartments() {
    const token = await getAccessToken();
    const url = 'https://desk.zoho.in/api/v1/departments';

    try {
        const headers = {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'orgId': ZOHO_ORG_ID,
            'Accept': 'application/json',
            'User-Agent': 'GooseBotWhatsApp-Integration/1.0'
        };

        console.log(`\n--- Fetching Departments from ${url} ---`);
        const res = await axios.get(url, { headers });

        console.log(`SUCCESS:`);
        if (res.data && res.data.data) {
            res.data.data.forEach(dept => {
                console.log(`Name: ${dept.name}`);
                console.log(`ID:   ${dept.id}`);
                console.log('-----------------------------');
            });
        } else {
            console.log(JSON.stringify(res.data, null, 2));
        }
    } catch (err) {
        if (err.response) {
            console.error(`FAILED: Status ${err.response.status}`);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(`FAILED:`, err.message);
        }
    }
}

listDepartments();
