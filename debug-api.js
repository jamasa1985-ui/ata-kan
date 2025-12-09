
const fetch = require('node-fetch');

async function checkApi() {
    try {
        const res = await fetch('http://localhost:3000/api/products');
        console.log('Status:', res.status);
        const body = await res.text();
        console.log('Body:', body);
    } catch (e) {
        console.error(e);
    }
}

checkApi();
