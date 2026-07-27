import http from 'http';

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 1000)
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function main() {
  const url1 = 'http://localhost:5173/finance/italian-charm-bracelet/produk';
  const url2 = 'http://localhost:5174/finance/italian-charm-bracelet/produk';
  
  console.log(`Checking ${url1}...`);
  const res1 = await checkUrl(url1);
  console.log('Result 1:', { status: res1.status, error: res1.error });
  if (res1.status >= 400 || res1.error) {
    console.log('Body snippet 1:', res1.body);
  }

  console.log(`Checking ${url2}...`);
  const res2 = await checkUrl(url2);
  console.log('Result 2:', { status: res2.status, error: res2.error });
  if (res2.status >= 400 || res2.error) {
    console.log('Body snippet 2:', res2.body);
  }
}

main();
