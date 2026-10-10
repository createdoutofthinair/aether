// Deterministic Phillips wind spectrum, evolved with deep-water dispersion.
// CPU inverse FFT keeps the existing WebGL2 renderer; three 64² bands upload
// height and slopes at 15 Hz, with shader interpolation between frames.
export function fft(real,imag,inverse=false){
 const n=real.length;if((n&(n-1))!==0)throw Error('FFT size must be a power of two');
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[real[i],real[j]]=[real[j],real[i]];[imag[i],imag[j]]=[imag[j],imag[i]];}}
 for(let len=2;len<=n;len*=2){const angle=(inverse?2:-2)*Math.PI/len;
  for(let i=0;i<n;i+=len){for(let j=0;j<len/2;j++){const c=Math.cos(angle*j),s=Math.sin(angle*j),a=i+j,b=a+len/2,tr=real[b]*c-imag[b]*s,ti=real[b]*s+imag[b]*c;real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;}}}
 if(inverse)for(let i=0;i<n;i++){real[i]/=n;imag[i]/=n;}
}
export class OceanBand{
 constructor(size,length,rms,seed=17){
  this.size=size;this.length=length;this.rms=rms;const count=size*size;
  this.foam=new Float32Array(count);this.advected=new Float32Array(count);this.velocityX=new Float32Array(count);this.velocityZ=new Float32Array(count);this.previousX=new Float64Array(count);this.previousZ=new Float64Array(count);this.dx=new Float64Array(count);this.dxi=new Float64Array(count);this.dz=new Float64Array(count);this.dzi=new Float64Array(count);this.chop=new Float32Array(count*4);this.lastTime=null;this.h0r=new Float64Array(count);this.h0i=new Float64Array(count);this.omega=new Float64Array(count);this.real=new Float64Array(count);this.imag=new Float64Array(count);this.output=new Float32Array(count*4);this.rowR=new Float64Array(size);this.rowI=new Float64Array(size);
  let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return(state+.5)/4294967296;};
  let power=0;const windLength=12*12/9.81;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x,kx=(x<=size/2?x:x-size)*2*Math.PI/length,ky=(y<=size/2?y:y-size)*2*Math.PI/length,k=Math.hypot(kx,ky);if(!k)continue;
   const directional=(kx*.86+ky*.51)/k;
   const p=Math.exp(-1/(k*k*windLength*windLength))*Math.pow(directional,2)*Math.exp(-k*k*.09)/Math.pow(k,4);
   const g=Math.sqrt(-2*Math.log(random())),a=2*Math.PI*random();this.h0r[i]=g*Math.cos(a)*Math.sqrt(p*.5);this.h0i[i]=g*Math.sin(a)*Math.sqrt(p*.5);this.omega[i]=Math.sqrt(9.81*k);power+=this.h0r[i]**2+this.h0i[i]**2;
  }
  const scale=rms*count/Math.sqrt(2*power);for(let i=0;i<count;i++){this.h0r[i]*=scale;this.h0i[i]*=scale;}
 }
 missingSlopeVariance(footprint){
  let variance=0;const n=this.size,cutoff=Math.PI/Math.max(.0001,footprint);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,kx=(x<=n/2?x:x-n)*2*Math.PI/this.length,ky=(y<=n/2?y:y-n)*2*Math.PI/this.length,k=Math.hypot(kx,ky),fade=Math.max(0,Math.min(1,(k-cutoff*.6)/(cutoff*.8)));variance+=2*(this.h0r[i]**2+this.h0i[i]**2)*(kx*kx+ky*ky)*fade/(n*n)**2;}
  return variance;
 }
 transform(real,imag){
  const n=this.size;
  for(let y=0;y<n;y++){this.rowR.set(real.subarray(y*n,y*n+n));this.rowI.set(imag.subarray(y*n,y*n+n));fft(this.rowR,this.rowI,true);real.set(this.rowR,y*n);imag.set(this.rowI,y*n);}
  for(let x=0;x<n;x++){for(let y=0;y<n;y++){this.rowR[y]=real[y*n+x];this.rowI[y]=imag[y*n+x];}fft(this.rowR,this.rowI,true);for(let y=0;y<n;y++){real[y*n+x]=this.rowR[y];imag[y*n+x]=this.rowI[y];}}
 }
 evaluate(time){
  const n=this.size,r=this.real,im=this.imag;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=y*n+x,j=((n-y)%n)*n+(n-x)%n,a=this.omega[i]*time,c=Math.cos(a),s=Math.sin(a);
   r[i]=(this.h0r[i]+this.h0r[j])*c-(this.h0i[i]+this.h0i[j])*s;im[i]=(this.h0r[i]-this.h0r[j])*s+(this.h0i[i]-this.h0i[j])*c;
   // Positive i*k makes crests converge under the inverse FFT convention.
   // Nyquist derivatives are zero to preserve Hermitian symmetry.
   const kx=x===n/2?0:(x<n/2?x:x-n)*2*Math.PI/this.length,kz=y===n/2?0:(y<n/2?y:y-n)*2*Math.PI/this.length,k=Math.hypot(kx,kz),scale=k?1.15/k:0;
   this.dx[i]=-im[i]*kx*scale;this.dxi[i]=r[i]*kx*scale;this.dz[i]=-im[i]*kz*scale;this.dzi[i]=r[i]*kz*scale;
  }
  this.transform(r,im);this.transform(this.dx,this.dxi);this.transform(this.dz,this.dzi);
  const elapsed=this.lastTime===null?0:time-this.lastTime,dt=elapsed>0&&elapsed<=.25?elapsed:0,step=this.length/n;
  if(elapsed<0||elapsed>.25)this.foam.fill(0);
  if(dt){for(let i=0;i<r.length;i++){this.velocityX[i]=(this.dx[i]-this.previousX[i])/dt;this.velocityZ[i]=(this.dz[i]-this.previousZ[i])/dt;}advectFoam(this.foam,this.velocityX,this.velocityZ,n,step,dt,this.advected);}
  else this.advected.set(this.foam);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=y*n+x,o=i*4,left=y*n+(x+n-1)%n,right=y*n+(x+1)%n,down=((y+n-1)%n)*n+x,up=((y+1)%n)*n+x;
   const hx=(r[right]-r[left])/(2*step),hz=(r[up]-r[down])/(2*step),xx=(this.dx[right]-this.dx[left])/(2*step),xz=(this.dx[up]-this.dx[down])/(2*step),zx=(this.dz[right]-this.dz[left])/(2*step),zz=(this.dz[up]-this.dz[down])/(2*step);
   const jacobian=deformationJacobian(xx,xz,zx,zz),den=Math.max(.15,jacobian);
   this.output[o]=r[i];this.output[o+1]=(hx*(1+zz)-hz*zx)/den;this.output[o+2]=(hz*(1+xx)-hx*xz)/den;
   this.foam[i]=Math.min(1,this.advected[i]+Math.max(0,.90-jacobian)*dt*6);this.output[o+3]=this.foam[i];
   this.chop[o]=this.dx[i];this.chop[o+1]=this.dz[i];this.chop[o+2]=jacobian;this.chop[o+3]=0;
  }
  this.previousX.set(this.dx);this.previousZ.set(this.dz);this.lastTime=time;
  return this.output;
 }

}
export function createOceanSpectrum(T){
 const lengths=[768,137,23],bands=lengths.map((l,i)=>new OceanBand(64,l,[.48,.16,.035][i],71+i*997));
 const make=b=>{const t=new T.DataTexture(new Float32Array(b.output.length),64,64,T.RGBAFormat,T.FloatType);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.needsUpdate=true;return t;};
 const current=bands.map(make),next=bands.map(make),chopCurrent=bands.map(make),chopNext=bands.map(make),uniforms={waveMix:{value:0},oceanSlopeVariance:{value:Float32Array.from({length:16},(_,i)=>bands.reduce((sum,b)=>sum+b.missingSlopeVariance(.0625*2**i),0))}};let tick=-1,lastCPUms=0;
 bands.forEach((b,i)=>{uniforms['wave'+i]={value:current[i]};uniforms['waveNext'+i]={value:next[i]};uniforms['chop'+i]={value:chopCurrent[i]};uniforms['chopNext'+i]={value:chopNext[i]};});
 return{uniforms,state(){return{bands:3,size:64,updatesPerSecond:15,textures:12,gpuBaseLevelBytes:12*64*64*16,lastCPUms,foam:'horizontal compression, periodic semi-Lagrangian transport, exponential decay',horizontalRenderingDistanceMetres:2500};},update(time){const started=performance.now(),frame=Math.floor(time*15);if(frame!==tick){bands.forEach((b,i)=>{if(frame===tick+1&&tick>=0){current[i].image.data.set(next[i].image.data);chopCurrent[i].image.data.set(chopNext[i].image.data);}else{current[i].image.data.set(b.evaluate(frame/15));chopCurrent[i].image.data.set(b.chop);}next[i].image.data.set(b.evaluate((frame+1)/15));chopNext[i].image.data.set(b.chop);current[i].needsUpdate=next[i].needsUpdate=chopCurrent[i].needsUpdate=chopNext[i].needsUpdate=true;});tick=frame;lastCPUms=performance.now()-started;}uniforms.waveMix.value=time*15-frame;}};
}

export const deformationJacobian=(xx,xz,zx,zz)=>(1+xx)*(1+zz)-xz*zx;
// Periodic semi-Lagrangian transport. Decay is applied once per simulation step.
export function advectFoam(field,vx,vz,size,step,dt,result=new Float32Array(field.length)){
 const wrap=v=>(v%size+size)%size,decay=Math.exp(-Math.max(0,dt)/3);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,px=wrap(x-vx[i]*dt/step),py=wrap(y-vz[i]*dt/step),a=Math.floor(px),b=Math.floor(py),u=px-a,v=py-b,c=(a+1)%size,d=(b+1)%size;result[i]=((1-v)*(field[b*size+a]*(1-u)+field[b*size+c]*u)+v*(field[d*size+a]*(1-u)+field[d*size+c]*u))*decay;}return result;
}
