const key = process.argv[2] || 'd067848a0baba8e41516f9934fd2cec7';

async function main() {
  const res = await fetch(`http://119.23.70.228:8080/tcy/qrcode?key=${key}`);
  const json = await res.json();
  const arr = JSON.parse(json.data.codeValue);
  console.log('Array length:', arr.length);
  arr.forEach((v, i) => console.log(i, v));

  const weight = parseFloat(arr[18]);
  const heightCm = parseFloat(arr[4]);
  const bmiCalc = weight / ((heightCm / 100) ** 2);
  console.log('\nDerived BMI:', bmiCalc.toFixed(1));
}

main().catch(console.error);
