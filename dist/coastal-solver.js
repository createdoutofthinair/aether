// First-order Saint-Venant finite volumes with hydrostatic reconstruction.
// Depth-averaged flow supports wetting/drying; it cannot overturn a wave.
const G=9.81,DRY=1e-5;
export class CoastalSolver{
 constructor(bed,{size=128,step=4,forcing=true}={}){this.size=size;this.step=step;this.forcing=forcing;this.bed=Float64Array.from(bed,z=>Math.max(-32,Math.min(64,z)));const n=size*size;this.h=Float64Array.from(this.bed,z=>Math.max(0,-z));this.mx=new Float64Array(n);this.my=new Float64Array(n);this.nextH=new Float64Array(n);this.nextX=new Float64Array(n);this.nextY=new Float64Array(n);this.breaking=new Float32Array(n);this.foam=new Float64Array(n);this.wet=new Float64Array(n);this.nextFoam=new Float64Array(n);this.time=0;this.steps=0;}
 axis(dt,axis){const {size:n,step:dx,h,mx,my,bed:z,nextH:nh,nextX:nx,nextY:ny}=this;nh.set(h);nx.set(mx);ny.set(my);const mn=axis===0?mx:my,mt=axis===0?my:mx,nn=axis===0?nx:ny,nt=axis===0?ny:nx,k=dt/dx;
  // Interior and reflective exterior faces use the same Rusanov flux.
  for(let row=0;row<n;row++)for(let face=0;face<=n;face++){
   const left=face>0?(axis===0?row*n+face-1:(face-1)*n+row):-1,right=face<n?(axis===0?row*n+face:face*n+row):-1;
   const li=left<0?right:left,ri=right<0?left:right,hL=h[li],hR=h[ri],uL=(hL>DRY?mn[li]/hL:0)*(left<0?-1:1),uR=(hR>DRY?mn[ri]/hR:0)*(right<0?-1:1),vL=hL>DRY?mt[li]/hL:0,vR=hR>DRY?mt[ri]/hR:0;
   const top=Math.max(z[li],z[ri]),aL=Math.max(0,hL+z[li]-top),aR=Math.max(0,hR+z[ri]-top),speed=Math.max(Math.abs(uL)+Math.sqrt(G*aL),Math.abs(uR)+Math.sqrt(G*aR));
   const fH=.5*(aL*uL+aR*uR)-.5*speed*(aR-aL),fN=.5*(aL*uL*uL+aR*uR*uR)+.25*G*(aL*aL+aR*aR)-.5*speed*(aR*uR-aL*uL),fT=.5*(aL*uL*vL+aR*uR*vR)-.5*speed*(aR*vR-aL*vL);
   if(left>=0){nh[left]-=k*fH;nn[left]-=k*(fN+.5*G*(hL*hL-aL*aL));nt[left]-=k*fT;}
   if(right>=0){nh[right]+=k*fH;nn[right]+=k*(fN+.5*G*(hR*hR-aR*aR));nt[right]+=k*fT;}
  }
  for(let i=0;i<h.length;i++){if(nh[i]<-1e-8||!Number.isFinite(nh[i]+nx[i]+ny[i]))throw Error('Unstable coastal state');h[i]=Math.max(0,nh[i]);mx[i]=h[i]>DRY?nx[i]:0;my[i]=h[i]>DRY?ny[i]:0;}
 }
 sample(array,x,y){const n=this.size;x=Math.max(0,Math.min(n-1,x));y=Math.max(0,Math.min(n-1,y));const ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(n-1,ix+1),jy=Math.min(n-1,iy+1),a=x-ix,b=y-iy;return (array[iy*n+ix]*(1-a)+array[iy*n+jx]*a)*(1-b)+(array[jy*n+ix]*(1-a)+array[jy*n+jx]*a)*b;}
 advance(target){if(target<this.time)throw Error('Coastal time must increase');while(this.time<target-1e-9){let speed=.01;for(let i=0;i<this.h.length;i++)if(this.h[i]>DRY)speed=Math.max(speed,Math.hypot(this.mx[i],this.my[i])/this.h[i]+Math.sqrt(G*this.h[i]));const dt=Math.min(target-this.time,.35*this.step/speed,.05);this.axis(dt,0);this.axis(dt,1);this.time+=dt;this.steps++;
   const n=this.size;
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,depth=this.h[i],u=depth>DRY?this.mx[i]/depth:0,v=depth>DRY?this.my[i]/depth:0;
    // Offshore sponge drives incident waves and absorbs reflected energy.
    const edge=Math.min(x,y,n-1-x,n-1-y),z=this.bed[i];if(this.forcing&&edge<8&&z<-.75){const strength=(1-edge/8)*Math.min(1,(-z-.75)/2),phase=this.time*.8,eta=.65*Math.sin(phase),goal=Math.max(0,-z+eta),blend=1-Math.exp(-dt*strength*2);this.h[i]+=(goal-depth)*blend;this.mx[i]*=1-blend;this.my[i]*=1-blend;}
    const friction=1/(1+dt*.035*Math.hypot(u,v)/Math.max(.05,depth));this.mx[i]*=friction;this.my[i]*=friction;
    const xm=Math.max(0,x-1),xp=Math.min(n-1,x+1),ym=Math.max(0,y-1),yp=Math.min(n-1,y+1),velocity=(j,m)=>this.h[j]>DRY?m[j]/this.h[j]:0;
    const compression=Math.max(0,-((velocity(y*n+xp,this.mx)-velocity(y*n+xm,this.mx))+(velocity(yp*n+x,this.my)-velocity(ym*n+x,this.my)))/(2*this.step));
    const froude=Math.hypot(u,v)/Math.sqrt(G*Math.max(.03,depth)),breaking=Math.max(0,froude-.8)*Math.min(1,depth/.1);
    this.breaking[i]=compression*3+breaking;
    this.nextFoam[i]=Math.min(1,this.sample(this.foam,x-u*dt/this.step,y-v*dt/this.step)*Math.exp(-dt/3)+dt*(compression*3+breaking));
    if(depth>.025)this.wet[i]=1;else this.wet[i]*=Math.exp(-dt/12);
   }
   [this.foam,this.nextFoam]=[this.nextFoam,this.foam];
  }return this;
 }
 pixels(){const data=new Uint8Array(this.h.length*4);for(let i=0;i<this.h.length;i++){const eta=Math.max(-8,Math.min(8,this.h[i]+this.bed[i])),v=Math.round((eta+8)/16*65535);data[i*4]=v>>8;data[i*4+1]=v&255;data[i*4+2]=Math.round(this.foam[i]*255);data[i*4+3]=Math.round(this.wet[i]*255);}return data;}
 volume(){return this.h.reduce((a,b)=>a+b,0)*this.step*this.step;}
}
