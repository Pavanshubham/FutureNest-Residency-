const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/residents/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('BODY:');
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({
  name: "Test",
  email: "test@test.com",
  password: "test",
  wing: "A",
  subWing: "A1",
  flatNo: "101"
}));
req.end();
