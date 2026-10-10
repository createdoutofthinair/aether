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
  this.h0r=new Float64Array(count);this.h0i=new Float64Array(count);this.omega=new Float64Array(count);this.real=new Float64Array(count);this.imag=new Float64Array(count);this.output=new Float32Array(count*4);this.rowR=new Float64Array(size);this.rowI=new Float64Array(size);
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
 evaluate(time){
  const n=this.size,r=this.real,im=this.imag;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,j=((n-y)%n)*n+(n-x)%n,a=this.omega[i]*time,c=Math.cos(a),s=Math.sin(a);r[i]=(this.h0r[i]+this.h0r[j])*c-(this.h0i[i]+this.h0i[j])*s;im[i]=(this.h0r[i]-this.h0r[j])*s+(this.h0i[i]-this.h0i[j])*c;}
  for(let y=0;y<n;y++){this.rowR.set(r.subarray(y*n,y*n+n));this.rowI.set(im.subarray(y*n,y*n+n));fft(this.rowR,this.rowI,true);r.set(this.rowR,y*n);im.set(this.rowI,y*n);}
  for(let x=0;x<n;x++){for(let y=0;y<n;y++){this.rowR[y]=r[y*n+x];this.rowI[y]=im[y*n+x];}fft(this.rowR,this.rowI,true);for(let y=0;y<n;y++){r[y*n+x]=this.rowR[y];im[y*n+x]=this.rowI[y];}}
  const step=this.length/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,o=i*4,sx=(r[y*n+(x+1)%n]-r[y*n+(x+n-1)%n])/(2*step),sy=(r[((y+1)%n)*n+x]-r[((y+n-1)%n)*n+x])/(2*step);this.output[o]=r[i];this.output[o+1]=sx;this.output[o+2]=sy;this.output[o+3]=Math.max(0,Math.hypot(sx,sy)-.22);}
  return this.output;
 }
}
export function createOceanSpectrum(T){
 const lengths=[768,137,23],bands=lengths.map((l,i)=>new OceanBand(64,l,[.48,.16,.035][i],71+i*997));
 const make=b=>{const t=new T.DataTexture(new Float32Array(b.output.length),64,64,T.RGBAFormat,T.FloatType);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.needsUpdate=true;return t;};
 const current=bands.map(make),next=bands.map(make),uniforms={waveMix:{value:0}};let tick=-1;
 bands.forEach((b,i)=>{uniforms['wave'+i]={value:current[i]};uniforms['waveNext'+i]={value:next[i]};});
 return{uniforms,update(time){const frame=Math.floor(time*15);if(frame!==tick){bands.forEach((b,i)=>{current[i].image.data.set(b.evaluate(frame/15));next[i].image.data.set(b.evaluate((frame+1)/15));current[i].needsUpdate=next[i].needsUpdate=true;});tick=frame;}uniforms.waveMix.value=time*15-frame;}};
}
