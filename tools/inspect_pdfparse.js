const mod = require('pdf-parse');
console.log('typeof mod:', typeof mod);
console.log('keys:', Object.keys(mod));
console.log('mod default exists?', !!mod.default);
console.log('is function:', typeof (mod.default || mod));
console.log('mod sample:', mod);
