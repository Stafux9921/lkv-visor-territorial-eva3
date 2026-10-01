import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const target=resolve(process.argv[2]||'docs/evidencias/testing-final.tap');
const result=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/security.test.js'],{encoding:'utf8'});
mkdirSync(dirname(target),{recursive:true});writeFileSync(target,result.stdout+'\n'+result.stderr);
console.log(result.stdout);process.exitCode=result.status;
