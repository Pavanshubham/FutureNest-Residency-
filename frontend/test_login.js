async function testLogin() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'Resident',
      email: 'zaatusham@gmail.com', // from test_res.js output earlier
      password: 'test', // guessing, or maybe doesn't matter for the exception
      wing: 'A',
      subWing: 'A2',
      flatNo: '101'
    })
  });
  console.log(await res.json());
}
testLogin();
