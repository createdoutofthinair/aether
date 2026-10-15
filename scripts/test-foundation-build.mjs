import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base=new URL('https://example.test/aether/');
const seen=new Set();
function visit(url){const key=url.pathname;if(seen.has(key))return;seen.add(key);assert.ok(key.startsWith('/aether/'));
 const path='dist/'+decodeURIComponent(key.slice('/aether/'.length));assert.ok(existsSync(path),`Missing deployed module: ${path}`);
 if(!path.endsWith('.js'))return;const source=readFileSync(path,'utf8');
 const imports=[...source.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()(['"])(\.[^'"]+)\1/g)].map(m=>m[2]);
 for(const name of imports)visit(new URL(name,url));
}
visit(new URL('entry.js',base));visit(new URL('navigation.js',base));
assert.ok(seen.has('/aether/domain/terrain.js'));assert.ok(seen.has('/aether/domain/world.js'));assert.ok(seen.has('/aether/terrain-worker.js'));
console.log(`Pages /aether/ module and worker URLs resolve: ${seen.size} files`);
