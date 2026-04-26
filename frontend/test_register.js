async function test() {
  const formData = new FormData();
  formData.append('name', 'Test');
  formData.append('email', 'test2@test.com');
  formData.append('password', 'test1234');
  formData.append('wing', 'A');
  formData.append('subWing', 'A1');
  formData.append('flatNo', '102');
  formData.append('twoWheelers', '0');
  formData.append('fourWheelers', '0');
  formData.append('vehicleNos', '');

  try {
    const res = await fetch('http://localhost:3000/api/residents/register', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      console.log("ERROR MESSAGE:", data.err.message);
      console.log("ERROR NAME:", data.err.name);
    } else {
      console.log(text.substring(0, 1000));
    }
  } catch (err) {
    console.error(err);
  }
}
test();
