// Double-precision numeric vectors. No rendering objects or GPU dependencies.
export class Vector3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 clone(){return new Vector3(this.x,this.y,this.z);}
 dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
 lengthSq(){return this.dot(this);}
 length(){return Math.sqrt(this.lengthSq());}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
 normalize(){return this.multiplyScalar(1/(this.length()||1));}
 addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
 cross(v){return this.crossVectors(this,v);}
 crossVectors(a,b){const ax=a.x,ay=a.y,az=a.z,bx=b.x,by=b.y,bz=b.z;return this.set(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx);}
 toArray(){return[this.x,this.y,this.z];}
}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function smoothstep(x,a,b){if(x<=a)return 0;if(x>=b)return 1;const t=(x-a)/(b-a);return t*t*(3-2*t);}
export function numericVector(v){if(!v||![v.x,v.y,v.z].every(Number.isFinite))throw new TypeError('Expected finite metre/direction coordinates');return new Vector3(v.x,v.y,v.z);}
