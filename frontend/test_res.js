async function test() {
  const res = await fetch('http://localhost:3000/api/residents?status=approved');
  const data = await res.json();
  console.log(data);
}
test();
