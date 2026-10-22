import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {groups,testGroup} from './plan.mjs';
const group=process.argv[2];if(!groups.includes(group))throw Error(`Unknown test group: ${group}`);
const script=JSON.parse(readFileSync('package.json','utf8')).scripts.test;
// Keep npm test authoritative. Reject unrecognised syntax instead of skipping it.
const tests=script.split(/\s*&&\s*/).map(command=>{const match=/^node (scripts\/[\w-]+\.mjs)$/.exec(command);if(!match)throw Error(`Unmapped test command: ${command}`);return match[1];});
for(const path of tests.filter(p=>testGroup(p)===group)){
 console.log(`::group::${path}`);const start=performance.now(),result=spawnSync(process.execPath,[path],{stdio:'inherit'});console.log(`Finished in ${((performance.now()-start)/1000).toFixed(2)}s\n::endgroup::`);if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
