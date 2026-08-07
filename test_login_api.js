const http = require('http');

const data = JSON.stringify({
  email: "laibaaslub@gmail.com",
  password: "testuser123" // Assuming this is correct from earlier, if not I will just get 401
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';

  res.on('data', d => {
    body += d;
  });

  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
