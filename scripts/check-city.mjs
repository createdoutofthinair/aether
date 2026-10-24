import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const file of readdirSync('dist/city').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/city/'+file],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/render/surface-atlas.js'],{stdio:'inherit'});

for(const file of readdirSync('dist/material-production').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/material-production/'+file],{stdio:'inherit'});

for(const file of readdirSync('dist/material-studio').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/material-studio/'+file],{stdio:'inherit'});
