// Solver-driven visual spray. Ballistic droplet bundles approximate unresolved
// spray; the depth-averaged coastal solver does not resolve air entrainment.
export const SPRAY_LIMIT=2048,EMITTER_LIMIT=128;
export function sprayEmitters(solver){
 const candidates=[],n=solver.size;
 for(let y=2;y<n-2;y+=2)for(let x=2;x<n-2;x+=2){const i=y*n+x,h=solver.h[i],source=solver.breaking[i];if(h>.025&&h<4&&source>.08)candidates.push({i,x,y,source});}
 candidates.sort((a,b)=>b.source-a.source||a.i-b.i);const count=Math.min(EMITTER_LIMIT,candidates.length),data=new Float32Array(count*6);
 for(let k=0;k<count;k++){const {i,x,y,source}=candidates[k],h=solver.h[i];data.set([(x-(n-1)/2)*solver.step,(y-(n-1)/2)*solver.step,h+solver.bed[i],solver.mx[i]/h,solver.my[i]/h,Math.min(4,source)],k*6);}return data;
}
function random(seed){let v=(seed^0x9e3779b9)>>>0;v=Math.imul(v^(v>>>16),0x21f0aaad);v=Math.imul(v^(v>>>15),0x735a2d97);return ((v^(v>>>15))>>>0)/4294967296;}
export class SprayPool{
 constructor(limit=SPRAY_LIMIT){this.limit=limit;this.position=new Float32Array(limit*3);this.velocity=new Float32Array(limit*3);this.life=new Float32Array(limit*4);this.cursor=0;this.emitted=0;this.lastTime=-Infinity;this.generation=0;}
 clear(){this.life.fill(0);this.cursor=0;this.lastTime=-Infinity;this.emitted=0;this.generation++;}
 emit(data,time){if(time<=this.lastTime)return 0;this.lastTime=time;let emitted=0;const tick=Math.floor(time*15);
  for(let i=0;i<data.length;i+=6){const strength=data[i+5];if(!Number.isFinite(data[i]+data[i+1]+data[i+2]+data[i+3]+data[i+4]+strength)||strength<=.08)continue;const count=Math.min(6,Math.max(1,Math.ceil(strength*2)));
   for(let j=0;j<count;j++){const slot=this.cursor++%this.limit,seed=Math.imul(tick+1,73856093)^Math.imul(i+1,19349663)^Math.imul(j+1,83492791),a=random(seed),b=random(seed+1),c=random(seed+2),vertical=1.2+Math.sqrt(Math.min(4,strength))*(.7+.9*c),life=Math.min(.85,2*vertical/9.81);
    this.position.set([data[i]+(a-.5)*3,data[i+1]+(b-.5)*3,data[i+2]+.025],slot*3);this.velocity.set([data[i+3]*.6+(a-.5)*1.4,data[i+4]*.6+(b-.5)*1.4,vertical],slot*3);this.life.set([time,life,.006+.012*c,.25+.35*a],slot*4);emitted++;
   }
  }this.emitted+=emitted;return emitted;
 }
 alive(time){let n=0;for(let i=0;i<this.limit;i++){const birth=this.life[i*4],life=this.life[i*4+1];if(life>0&&time>=birth&&time<birth+life)n++;}return n;}
}
export const sprayVertex=`
attribute vec3 sprayOrigin,sprayVelocity;attribute vec4 sprayLife;
uniform vec3 coastalCenter,coastalEast,coastalNorth,origin,sunDir,sunColor;
uniform float seaRadius,time,enabled;
varying vec2 sprayUV;varying float sprayAlpha;varying vec3 sprayLight;
void main(){
 float age=time-sprayLife.x,life=sprayLife.y;if(age<0.||age>=life||life<=0.||enabled<.5){gl_Position=vec4(2.,2.,2.,1.);sprayUV=vec2(0.);sprayAlpha=0.;sprayLight=vec3(0.);return;}float live=step(0.,age)*(1.-step(life,age))*step(.001,life)*enabled;
 vec2 q=sprayOrigin.xy+sprayVelocity.xy*max(0.,age);
 vec3 up=normalize(coastalCenter+(coastalEast*q.x+coastalNorth*q.y)/60000.);
 float rise=sprayVelocity.z*age-4.905*age*age;
 vec3 p=up*(seaRadius+sprayOrigin.z+rise)-origin;
 vec4 view=modelViewMatrix*vec4(p,1.);float distanceFade=1.-smoothstep(200.,600.,length(p));
 view.xy+=position.xy*sprayLife.z*live;gl_Position=projectionMatrix*view;
 sprayUV=position.xy;float fraction=age/max(.001,life);
 sprayAlpha=live*sprayLife.w*smoothstep(0.,.12,fraction)*(1.-smoothstep(.5,1.,fraction))*distanceFade;
 sprayLight=vec3(.66,.74,.79)*(.32+.68*max(0.,dot(up,sunDir)))+sunColor*.08;
}`;
export const sprayFragment=`precision highp float;varying vec2 sprayUV;varying float sprayAlpha;varying vec3 sprayLight;
void main(){float r=dot(sprayUV,sprayUV),aa=max(.02,fwidth(r));float alpha=(1.-smoothstep(.25,1.+aa,r))*sprayAlpha;if(alpha<.003)discard;gl_FragColor=vec4(sprayLight,alpha);}`;
export class CoastalSpray{
 constructor(T,uniforms){this.T=T;this.pool=new SprayPool();this.scene=new T.Scene();this.uniforms={coastalCenter:uniforms.coastalCenter,coastalEast:uniforms.coastalEast,coastalNorth:uniforms.coastalNorth,origin:uniforms.origin,sunDir:uniforms.sunDir,sunColor:uniforms.sunColor,seaRadius:uniforms.seaRadius,time:uniforms.time,enabled:{value:0}};
  const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);g.instanceCount=0;
  this.attributes=[['sprayOrigin',this.pool.position,3],['sprayVelocity',this.pool.velocity,3],['sprayLife',this.pool.life,4]].map(([name,array,size])=>{const a=new T.InstancedBufferAttribute(array,size);a.setUsage(T.DynamicDrawUsage);g.setAttribute(name,a);return a;});
  const m=new T.ShaderMaterial({uniforms:this.uniforms,vertexShader:sprayVertex,fragmentShader:sprayFragment,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide});this.mesh=new T.Mesh(g,m);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
 }
 dirty(){for(const a of this.attributes)a.needsUpdate=true;}
 clear(){this.pool.clear();this.dirty();this.mesh.geometry.instanceCount=0;this.mesh.visible=false;}
 emit(data,time){if(this.pool.emit(data,time)){this.mesh.geometry.instanceCount=Math.min(SPRAY_LIMIT,this.pool.cursor);this.dirty();}}
 update(time,enabled){this.uniforms.enabled.value=enabled?1:0;this.mesh.visible=enabled&&this.pool.alive(time)>0;}
 state(time){return{limit:SPRAY_LIMIT,alive:this.pool.alive(time),emitted:this.pool.emitted,bufferBytes:this.pool.position.byteLength+this.pool.velocity.byteLength+this.pool.life.byteLength,model:'solver-driven ballistic droplet bundles'};}
}
