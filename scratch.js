const str = "-----BEGIN PRIVATE KEY-----\\\\nMIIEvwIBADAN";
console.log("Original:", str);
const fixed = str.replace(/(\\+)n/g, '\n');
console.log("Fixed:", fixed);
console.log("Has real newline:", fixed.includes('\n'));
