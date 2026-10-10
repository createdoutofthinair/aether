// Per-channel rank Gaussianization and inverse-CDF lookup for contrast-preserving
// stochastic blending. All returned inverse values are in linear color space.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
function erf(x){const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+.3275911*x);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));}
export const normalCDF=x=>.5*(1+erf(x/Math.SQRT2));
export function normalQuantile(p){let a=-4,b=4;for(let i=0;i<22;i++){const m=(a+b)/2;if(normalCDF(m)<p)a=m;else b=m;}return(a+b)/2;}
export function gaussianize(pixels){
 const count=pixels.length/4,encoded=new Uint8Array(pixels.length),inverse=new Float32Array(256*4),hist=Array.from({length:3},()=>new Uint32Array(256)),mapping=Array.from({length:3},()=>new Uint8Array(256));
 for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)hist[c][pixels[i+c]]++;
 for(let c=0;c<3;c++){
  let cumulative=0;const cdf=new Float64Array(256);for(let v=0;v<256;v++){const midpoint=(cumulative+hist[c][v]*.5)/count;mapping[c][v]=Math.round(clamp(.5+normalQuantile(clamp(midpoint,.00135,.99865))/6)*255);cumulative+=hist[c][v];cdf[v]=cumulative/count;}
  for(let g=0;g<256;g++){const p=normalCDF((g/255-.5)*6);let v=0;while(v<255&&cdf[v]<p)v++;inverse[g*4+c]=linear(v/255);}
 }
 for(let i=0;i<pixels.length;i+=4){for(let c=0;c<3;c++)encoded[i+c]=mapping[c][pixels[i+c]];encoded[i+3]=255;}
 for(let i=0;i<256;i++)inverse[i*4+3]=1;
 return{encoded,inverse};
}
