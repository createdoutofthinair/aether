// Pure, deterministic reference-region generator. Runs in a worker in the browser.
// Heights are metres, not normalized texture values. No Three.js dependency.
export const REFERENCE_SIZE=513,REFERENCE_EXTENT=8192;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function rng(seed){let s=(seed+1)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function noise(x,y,seed){const hash=(a,b)=>{let n=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);return(1-v)*((1-u)*hash(i,j)+u*hash(i+1,j))+v*((1-u)*hash(i,j+1)+u*hash(i+1,j+1));}
function sample(a,n,x,y){const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,k=j*n+i;const h00=a[k],h10=a[k+1],h01=a[k+n],h11=a[k+n+1];return{h:(1-v)*(h00+(h10-h00)*u)+v*(h01+(h11-h01)*u),dx:(h10-h00)*(1-v)+(h11-h01)*v,dy:(h01-h00)*(1-u)+(h11-h10)*u};}
function deposit(a,n,x,y,m){const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,k=j*n+i;a[k]+=m*(1-u)*(1-v);a[k+1]+=m*u*(1-v);a[k+n]+=m*(1-u)*v;a[k+n+1]+=m*u*v;}
export function generateReference(seed=6,{size=REFERENCE_SIZE,droplets=100000}={}){
 const n=size,extent=REFERENCE_EXTENT,step=extent/(n-1),h=new Float32Array(n*n),initial=new Float32Array(n*n),removed=new Float32Array(n*n),laid=new Float32Array(n*n),random=rng(seed);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=(i/(n-1)-.5)*extent,z=(j/(n-1)-.5)*extent;
  const bend=480*Math.sin(z/1700)+420*(noise(z/1150,7,seed)-.5)+140*(noise(z/430,11,seed)-.5);
  const valley=smooth(80,780,Math.abs(x-bend));
  const broad=noise(x/1700+5,z/2200+8,seed),ridge=1-Math.abs(noise(x/680+9,z/1050+17,seed+1)*2-1);
  const shoulder=180+330*broad+90*ridge+35*(noise(x/170,z/230,seed+2)-.5);
  const foothill=18*(noise(x/67,z/83,seed+3)-.5)*valley;
  h[j*n+i]=120+z*.009+valley*shoulder+foothill;
 }
 initial.set(h);
 // Hydraulic droplets transport sediment along the actual downhill gradient.
 const brush=[];let brushSum=0;for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++){const w=Math.max(0,2.5-Math.hypot(x,z));if(w){brush.push([x,z,w]);brushSum+=w;}}
 for(let d=0;d<droplets;d++){
  let x=3+random()*(n-7),y=3+random()*(n-7),dx=0,dy=0,water=1,speed=1,sediment=0;
  for(let t=0;t<90;t++){
   const old=sample(h,n,x,y);dx=dx*.18-old.dx*.82;dy=dy*.18-old.dy*.82;let len=Math.hypot(dx,dy);if(len<1e-7){const a=random()*Math.PI*2;dx=Math.cos(a);dy=Math.sin(a);len=1;}dx/=len;dy/=len;
   const nx=x+dx,ny=y+dy;if(nx<3||ny<3||nx>=n-4||ny>=n-4)break;
   const next=sample(h,n,nx,ny),delta=next.h-old.h,capacity=Math.max(.02,-delta*speed*water*3.5);
   if(delta>0||sediment>capacity){const amount=delta>0?Math.min(delta,sediment):(sediment-capacity)*.22;deposit(h,n,x,y,amount);deposit(laid,n,x,y,amount);sediment-=amount;}
   else{const amount=Math.min((capacity-sediment)*.20,Math.max(0,-delta)*.5,1.7);const ix=Math.floor(x),iy=Math.floor(y);for(const [bx,by,w]of brush){const k=(iy+by)*n+ix+bx,m=amount*w/brushSum;h[k]-=m;removed[k]+=m;}sediment+=amount;}
   speed=Math.sqrt(Math.max(.04,speed*speed-delta*.3));water*=.97;x=nx;y=ny;if(water<.05)break;
  }
  // Last carried sediment is laid down, maintaining transport mass balance.
  if(sediment>0){deposit(h,n,x,y,sediment);deposit(laid,n,x,y,sediment);}
 }
 // Thermal relaxation moves loose material off slopes exceeding a talus angle.
 const change=new Float32Array(n*n);for(let pass=0;pass<12;pass++){
  change.fill(0);for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i;let target=k,drop=step*.72;for(const q of [k-1,k+1,k-n,k+n])if(h[k]-h[q]>drop){drop=h[k]-h[q];target=q;}if(target!==k){const m=(drop-step*.72)*.16;change[k]-=m;change[target]+=m;laid[target]+=m;removed[k]+=m;}}
  for(let k=0;k<h.length;k++)h[k]+=change[k];
 }
 // Gentle landing pad integrated into the landscape, not a separate collision plane.
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(i/(n-1)-.5)*extent,z=(j/(n-1)-.5)*extent,w=1-smooth(70,180,Math.hypot(x,z));h[j*n+i]=h[j*n+i]*(1-w)+(120+z*.009)*w;}
 // Flow accumulation follows the final eroded surface. A descending height order
 // is deterministic; split flow among all downhill neighbours to avoid grid streaks.
 const flow=new Float32Array(n*n);flow.fill(1);const order=Array.from({length:h.length},(_,k)=>k).sort((a,b)=>h[b]-h[a]||a-b);
 for(const k of order){const x=k%n,y=Math.floor(k/n);if(x<1||y<1||x>=n-1||y>=n-1)continue;const downs=[];let total=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const q=k+dz*n+dx,drop=(h[k]-h[q])/Math.hypot(dx,dz);if(drop>0){const w=drop*drop;downs.push([q,w]);total+=w;}}for(const [q,w]of downs)flow[q]+=flow[k]*w/total;}
 const masks=new Uint8Array(n*n*4);let maxFlow=0,erosion=0;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const k=j*n+i,l=h[j*n+Math.max(0,i-1)],r=h[j*n+Math.min(n-1,i+1)],b=h[Math.max(0,j-1)*n+i],t=h[Math.min(n-1,j+1)*n+i];
  const slope=Math.hypot(r-l,t-b)/(2*step),curve=(l+r+b+t-4*h[k])/step;
  const drainage=clamp(Math.log2(flow[k])/13),soil=clamp(.35+laid[k]*.16-removed[k]*.10+curve*.14+drainage*.25-slope*.85);
  const exposure=clamp(smooth(.10,.55,slope)+removed[k]*.05-soil*.30);
  let shelter=0;for(let ray=0;ray<8;ray++){const angle=ray*Math.PI/4;let horizon=0;for(const distance of [2,4,8,16,32,64]){const sx=clamp(Math.round(i+Math.cos(angle)*distance),0,n-1),sz=clamp(Math.round(j+Math.sin(angle)*distance),0,n-1);horizon=Math.max(horizon,(h[sz*n+sx]-h[k])/(distance*step));}shelter+=1/(1+horizon*horizon);}shelter/=8;
  masks[k*4]=Math.round(soil*255);masks[k*4+1]=Math.round(exposure*255);masks[k*4+2]=Math.round(drainage*255);masks[k*4+3]=Math.round(shelter*255);
  maxFlow=Math.max(maxFlow,flow[k]);erosion+=Math.abs(h[k]-initial[k]);
 }
 return{seed,size:n,extent,step,height:h,masks,stats:{droplets,maxFlow,meanChange:erosion/h.length}};
}
const mix=(a,b,t)=>a+(b-a)*t;
function cubic(a,b,c,d,t){return b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*(b-c)+d-a)));}
// Catmull-Rom reconstruction removes the bilinear grid's normal discontinuities.
export function referenceSample(data,x,z){
 if(!data||Math.abs(x)>data.extent/2||Math.abs(z)>data.extent/2)return null;
 const n=data.size,u=(x/data.extent+.5)*(n-1),v=(z/data.extent+.5)*(n-1),i=Math.floor(u),j=Math.floor(v),fx=u-i,fz=v-j,rows=[];
 for(let y=-1;y<=2;y++){const at=q=>data.height[clamp(j+y,0,n-1)*n+clamp(i+q,0,n-1)];rows.push(cubic(at(-1),at(0),at(1),at(2),fx));}
 const channels=[];for(let c=0;c<4;c++){const at=(dx,dy)=>data.masks[(clamp(j+dy,0,n-1)*n+clamp(i+dx,0,n-1))*4+c]/255;channels.push(mix(mix(at(0,0),at(1,0),fx),mix(at(0,1),at(1,1),fx),fz));}
 return{height:cubic(...rows,fz),soil:channels[0],exposure:channels[1],flow:channels[2],shelter:channels[3],weight:1-smooth(2700,3900,Math.hypot(x,z))};
}
