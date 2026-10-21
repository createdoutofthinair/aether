import assert from 'node:assert/strict';
import {createState,allocatePower,setScenario,selectContact,tick} from '../dist/hud/state.js';
const s=createState();
// Arbitrary redistribution always conserves the finite power budget.
for(let i=0;i<3;i++)for(const v of [-30,0,1,29,50,99,100,150]){allocatePower(s,i,v);assert.equal(s.power.reduce((a,b)=>a+b,0),100);assert.ok(s.power.every(n=>Number.isInteger(n)&&n>=0&&n<=100));}
s.power=[100,0,0];allocatePower(s,0,0);assert.deepEqual(s.power,[0,50,50]);
selectContact(s,'unknown');s.scanning=true;tick(s,2);assert.equal(s.scan,50);s.paused=true;tick(s,8);assert.equal(s.scan,50);s.paused=false;tick(s,3);assert.equal(s.scan,100);assert.equal(s.scanning,false);
selectContact(s,'port');assert.equal(s.scan,0);assert.equal(s.locked,false);assert.equal(selectContact(s,'missing'),false);assert.equal(s.selected,'port');
s.acknowledged=true;setScenario(s,'emergency');assert.ok(s.shield<35);assert.ok(s.warning);assert.equal(s.acknowledged,false);assert.equal(s.selected,null);assert.equal(setScenario(s,'missing'),false);
const run=(s,seconds)=>{for(let t=0;t<seconds;t+=.05)tick(s,.05);};
const moving=createState();moving.power=[100,0,0];moving.throttle=100;run(moving,30);assert.ok(moving.speed>500);moving.mode='SCM';run(moving,30);assert.ok(Math.abs(moving.speed-200)<.01);moving.throttle=0;run(moving,30);assert.ok(moving.speed<.01);
const cooling=createState();setScenario(cooling,'emergency');allocatePower(cooling,1,100);run(cooling,60);assert.ok(cooling.heat<80);assert.ok(Number.isFinite(cooling.speed));
console.log('HUD: conserved power, scan/pause lifecycle, scenario isolation, throttle response, SCM speed limit and thermal response passed');

// Every aspect ratio fits the same cockpit frame, with symmetric spare space.
const {fitHudFrame,HUD_FRAME}=await import('../dist/hud/layout.js');
for(const [w,h]of [[3440,1290],[2560,930],[1920,930],[1440,750],[1280,874],[1024,618],[844,284],[390,900]]){
 const f=fitHudFrame(w,h);
 assert.ok(f.width<=w+1e-8&&f.height<=h+1e-8);
 assert.ok(Math.abs(f.left+f.width/2-w/2)<1e-8);
 assert.ok(Math.abs(f.top+f.height/2-h/2)<1e-8);
 assert.ok(Math.abs(f.width/f.height-HUD_FRAME.width/HUD_FRAME.height)<1e-8);
}
assert.equal(fitHudFrame(0,0).scale,0);
console.log('HUD layout: shared aspect ratio, contained frame and stable centre across ultrawide, tall and short viewports passed');

// Prevent accidentally publishing an opaque replacement for the cockpit cutout.
const {readFileSync}=await import('node:fs');
const foreground=readFileSync(new URL('../dist/hud/assets/cockpit-foreground.webp',import.meta.url));
assert.equal(foreground.toString('ascii',0,4),'RIFF');assert.equal(foreground.toString('ascii',8,12),'WEBP');
let lossless=false;
for(let offset=12;offset+8<=foreground.length;){
 const length=foreground.readUInt32LE(offset+4),kind=foreground.toString('ascii',offset,offset+4);
 if(kind==='VP8L'){
  assert.equal(foreground[offset+8],0x2f);const bits=foreground.readUInt32LE(offset+9);
  assert.equal((bits&0x3fff)+1,1678);assert.equal(((bits>>>14)&0x3fff)+1,937);
  assert.equal((bits>>>28)&1,1,'Cockpit foreground must contain alpha');lossless=true;
 }
 offset+=8+length+(length%2);
}
assert.ok(lossless,'Cockpit foreground must use lossless WebP');
console.log('HUD cockpit: lossless foreground dimensions and alpha channel passed');
