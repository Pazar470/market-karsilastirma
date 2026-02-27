
import fetch from 'node-fetch';
import * as fs from 'fs';

async function dumpCats() {
    const url = 'https://www.migros.com.tr/rest/categories';
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'X-Pweb-Device-Type': 'DESKTOP'
        }
    });
    const json = await res.json();
    fs.writeFileSync('migros_categories.json', JSON.stringify(json, null, 2));
    console.log('Dumped to migros_categories.json');
}

dumpCats();
