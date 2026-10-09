import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {positionSunShadow} from '../dist/shadows.js';
const sun=new T.DirectionalLight();sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24});
const focus=new T.Vector3(12000,48000,33000),camera=new T.Vector3(12004,48003,33008);
for(const d of [new T.Vector3(1,2,3).normalize(),new T.Vector3(0,1,0)]){
 positionSunShadow(sun,d,focus,camera);const a=sun.target.position.clone().add(camera);
 const next=camera.clone().add(new T.Vector3(2.13,-1.4,7.7));positionSunShadow(sun,d,focus,next);
 assert.ok(a.distanceTo(sun.target.position.clone().add(next))<1e-9,'camera movement cannot move world shadow grid');
 assert.ok(Math.abs(sun.position.distanceTo(sun.target.position)-150)<1e-9);
 assert.ok(Math.abs(sun.shadow.camera.up.dot(d))<1e-9);
 assert.ok(a.distanceTo(focus)<Math.SQRT2*48/2048/2+1e-9);
}
console.log('Stable floating-origin shadow grid and polar sun basis: pass');
