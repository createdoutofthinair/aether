import {coastalGLSL} from './coastal.js?v=terrain-18';
import {skyGLSL} from './sky-light.js?v=terrain-18';
// Parametric breaking sheets are a visual closure for depth-averaged flow.
// They do not reconstruct a volume-of-fluid or air-entraining water surface.
export const CREST_LIMIT=48,CREST_SOURCES=32;
export function crestSources(solver){const data=[],n=solver.size,candidates=[];
 for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){const i=y*n+x,h=solver.h[i],strength=solver.breaking[i],speed=Math.hypot(solver.mx[i],solver.my[i])/Math.max(h,.001);if(h>.08&&h<3&&strength>.01&&speed>.08&&(h+solver.bed[i])/h>.35)candidates.push({i,x,y,strength});}
 candidates.sort((a,b)=>b.strength-a.strength||a.i-b.i);const selected=[];
 for(const c of candidates){if(selected.some(a=>Math.hypot(c.x-a.x,c.y-a.y)*solver.step<12))continue;selected.push(c);const h=solver.h[c.i];data.push((c.x-(n-1)/2)*solver.step,(c.y-(n-1)/2)*solver.step,h+solver.bed[c.i],solver.mx[c.i]/h,solver.my[c.i]/h,Math.min(4,c.strength),h);if(selected.length===CREST_SOURCES)break;}
 return new Float32Array(data);
}
export function curlSection(t,radius,progress,across=0){const edge=Math.max(0,1-across*across),envelope=Math.sin(Math.PI*Math.max(0,Math.min(1,progress))),r=radius*edge*envelope,angle=t*(Math.PI*.65+Math.PI*.85*Math.min(1,progress*2));return{forward:r*Math.sin(angle),height:r*(1-Math.cos(angle)),tangentForward:Math.cos(angle),tangentUp:Math.sin(angle),angle};}
export class CrestPool{
 constructor(limit=CREST_LIMIT){this.limit=limit;this.anchor=new Float32Array(limit*3);this.flow=new Float32Array(limit*4);this.life=new Float32Array(limit*4);this.lastTime=-Infinity;this.spawned=0;}
 clear(){this.life.fill(0);this.lastTime=-Infinity;this.spawned=0;}
 alive(time){let count=0;for(let i=0;i<this.limit;i++)if(this.life[i*4+1]>0&&time>=this.life[i*4]&&time<this.life[i*4]+this.life[i*4+1])count++;return count;}
 emit(data,time){if(time<=this.lastTime)return false;this.lastTime=time;let changed=false;
  for(let k=0;k<data.length;k+=7){const x=data[k],y=data[k+1],eta=data[k+2],vx=data[k+3],vy=data[k+4],strength=data[k+5],depth=data[k+6],speed=Math.hypot(vx,vy);if(![x,y,eta,vx,vy,strength,depth].every(Number.isFinite)||strength<=.01||depth<=.08||speed<=.08)continue;let match=-1,slot=-1;
   for(let i=0;i<this.limit;i++){const age=time-this.life[i*4],active=this.life[i*4+1]>0&&age<this.life[i*4+1];if(!active){if(slot<0)slot=i;continue;}const px=this.anchor[i*3]+this.flow[i*4]*this.flow[i*4+2]*age,py=this.anchor[i*3+1]+this.flow[i*4+1]*this.flow[i*4+2]*age;if(Math.hypot(px-x,py-y)<10){match=i;break;}}
   if(match>=0||slot<0)continue;const radius=Math.min(.5,depth*.4,.18+.15*Math.min(4,strength)),duration=1.2;
   this.anchor.set([x,y,eta],slot*3);this.flow.set([vx/speed,vy/speed,Math.min(3,speed*.6),radius],slot*4);this.life.set([time,duration,4,Math.min(1,strength)],slot*4);this.spawned++;changed=true;
  }return changed;
 }
}
export const crestVertex=`
attribute vec3 crestAnchor;attribute vec4 crestFlow,crestLife;
uniform sampler2D referenceMask;
${coastalGLSL}
uniform vec3 origin;
uniform float seaRadius,time,enabled;
varying vec3 crestPoint,crestNormal;varying vec2 crestUV;varying float crestCoverage;
void main(){float age=time-crestLife.x,life=crestLife.y;if(life<=0.||age<0.||age>=life||enabled<.5){gl_Position=vec4(2.,2.,2.,1.);crestPoint=vec3(0.);crestNormal=vec3(0.,1.,0.);crestUV=vec2(0.);crestCoverage=0.;return;}
 float progress=age/life,across=position.x,t=position.y,edge=1.-across*across,envelope=sin(3.141592654*progress),radius=crestFlow.w*edge*envelope;
 float angle=t*(2.042035225+2.670353756*min(1.,progress*2.)),forward=radius*sin(angle),rise=radius*(1.-cos(angle));
 vec2 direction=crestFlow.xy,along=vec2(-direction.y,direction.x),q=crestAnchor.xy+direction*(crestFlow.z*age+forward)+along*across*crestLife.z;
 vec3 up=normalize(coastalCenter+(coastalEast*q.x+coastalNorth*q.y)/60000.),travel=normalize(coastalEast*direction.x+coastalNorth*direction.y),span=normalize(coastalEast*along.x+coastalNorth*along.y);
 // Analytic sheet tangents include the width taper, so normals follow the curl.
 vec3 tangent=travel*cos(angle)+up*sin(angle),width=span*crestLife.z+(travel*sin(angle)+up*(1.-cos(angle)))*(-2.*across*crestFlow.w*envelope);
 crestNormal=normalize(cross(width,tangent));vec3 base=up*(seaRadius+crestAnchor.z),water=coastalWater(base),field=coastalSample(base);float wet=step(.025,water.x-field.x)*field.z;crestPoint=up*(seaRadius+water.x+rise);
 crestUV=vec2(across,t);crestCoverage=wet*smoothstep(0.,.15,progress)*(1.-smoothstep(.72,1.,progress))*(1.-smoothstep(.75,1.,abs(across)));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(crestPoint-origin,1.);
}`;
export const crestFragment=`precision highp float;
uniform vec3 origin,sunDir,sunColor;uniform float air,sunIntensity;
varying vec3 crestPoint,crestNormal;varying vec2 crestUV;varying float crestCoverage;
${skyGLSL}
void main(){if(crestCoverage<.05)discard;vec3 n=normalize(crestNormal),view=normalize(origin-crestPoint);if(dot(n,view)<0.)n=-n;float ndv=max(.01,dot(n,view)),fresnel=.0204+.9796*pow(1.-ndv,5.);
 vec3 sky=reflectedSky(crestPoint,reflect(-view,n));float foam=smoothstep(.25,.9,crestUV.y);vec3 body=vec3(.009,.07,.10)*(.4+.6*max(0.,dot(n,sunDir))),film=vec3(.64,.73,.75)*(.32+.68*max(0.,dot(n,sunDir)));
 vec3 color=mix(mix(body,sky,fresnel),film,foam*.8);gl_FragColor=vec4(color,crestCoverage*mix(.55,.94,foam));}
`;
export class CoastalCrests{
 constructor(T,uniforms){this.pool=new CrestPool();this.scene=new T.Scene();this.uniforms={};for(const name of ['referenceMask','coastalActive','coastalTime','coastalReady','coastalMix','coastalCenter','coastalEast','coastalNorth','origin','sunDir','sunColor','seaRadius','time','air','sunIntensity'])this.uniforms[name]=uniforms[name];this.uniforms.enabled={value:0};const g=new T.InstancedBufferGeometry(),positions=[],indices=[];const across=8,curl=24;
  for(let y=0;y<=curl;y++)for(let x=0;x<=across;x++)positions.push(x/across*2-1,y/curl,0);for(let y=0;y<curl;y++)for(let x=0;x<across;x++){const a=y*(across+1)+x,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.instanceCount=CREST_LIMIT;
  this.attributes=[['crestAnchor',this.pool.anchor,3],['crestFlow',this.pool.flow,4],['crestLife',this.pool.life,4]].map(([name,array,size])=>{const a=new T.InstancedBufferAttribute(array,size);a.setUsage(T.DynamicDrawUsage);g.setAttribute(name,a);return a;});const material=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader:crestVertex,fragmentShader:crestFragment,transparent:true,depthTest:true,depthWrite:true,side:T.DoubleSide});this.mesh=new T.Mesh(g,material);this.mesh.frustumCulled=false;this.mesh.visible=false;this.scene.add(this.mesh);
 }
 dirty(){for(const a of this.attributes)a.needsUpdate=true;}
 clear(){this.pool.clear();this.dirty();this.mesh.visible=false;}
 emit(data,time){if(this.pool.emit(data,time))this.dirty();}
 update(time,enabled){this.uniforms.enabled.value=enabled?1:0;this.mesh.visible=enabled&&this.pool.alive(time)>0;}
 state(time){return{limit:CREST_LIMIT,alive:this.pool.alive(time),spawned:this.pool.spawned,trianglesPerSheet:384,model:'solver-driven parametric overturning sheets'};}
}
