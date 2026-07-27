const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = `
# Security Keys
CSRF_SECRET=958f4e69ba97bf905c28bbb5f57983d423c5f144264c885f2ca752bbde3976b1
ENCRYPTION_KEY=aef4b53ec161418baa7522c3c0f2f31f626049fee5ca9f5aa5964158429fc641
`;

fs.appendFileSync(envPath, envContent);
console.log('✓ Environment variables added to .env');
