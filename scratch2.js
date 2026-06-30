const str = "-----BEGIN PRIVATE KEY-----\\\\nMIIEvwIBADAN";
console.log("Original:", str);
const fixed1 = str.replace(/(\\+)n/g, '\n');
console.log("Fixed1:", fixed1);

const fixed2 = str.replace(/(\\\\+)n/g, '\n');
console.log("Fixed2:", fixed2);
