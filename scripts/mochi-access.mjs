import { randomBytes, scryptSync } from 'node:crypto';
// Read the group code through hidden stdin, never as a process argument.
if (!process.stdin.isTTY) {
  console.error('Execute em um terminal interativo.');
  process.exit(1);
}
process.stdout.write('Novo acesso do grupo (12–128 caracteres, entrada oculta): ');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');
let code = '';
process.stdin.on('data', (chunk) => {
  for (const char of chunk) {
    if (char === '\u0003') {
      process.stdin.setRawMode(false);
      process.exit(1);
    }
    if (char === '\r' || char === '\n') {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      if (code.length < 12 || code.length > 128) {
        console.error('\nUse de 12 a 128 caracteres.');
        process.exit(1);
      }
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(code, salt, 64).toString('hex');
      code = '';
      console.log(`\nMOCHI_GROUP_ACCESS_HASH=scrypt:${salt}:${hash}`);
      console.log(`MOCHI_SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
      console.log(
        'Guarde estes valores somente no ambiente privado. Não os envie ao chat nem ao Git.',
      );
      process.exit(0);
    }
    if (char === '\u007f') code = code.slice(0, -1);
    else code += char;
  }
});
