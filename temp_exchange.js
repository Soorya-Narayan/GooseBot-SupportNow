const axios = require('axios');
require('dotenv').config();

const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET
} = process.env;

const params = new URLSearchParams();
params.append('code', '1000.4725b4909ce39ea7a3802948a0152425.b7e62848d7255e74b785e49477dc3916');
params.append('client_id', ZOHO_CLIENT_ID);
params.append('client_secret', ZOHO_CLIENT_SECRET);
params.append('grant_type', 'authorization_code');

// Using the working .in endpoint
axios.post('https://accounts.zoho.in/oauth/v2/token', params)
    .then(res => {
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    })
    .catch(err => {
        console.error('ERROR:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    });
