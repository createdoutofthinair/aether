import {CSMShadowNode} from 'three/addons/csm/CSMShadowNode.js';
import {Fn,reference,vec2,float,texture} from 'three/tsl';
// Fixed tent PCF avoids the screen-rotated random kernel crawling over facades.
export const cityShadowFilter=Fn(({depthTexture,shadowCoord,shadow,depthLayer})=>{
 const texel=reference('radius','float',shadow).div(reference('mapSize','vec2',shadow));let sum=float(0);
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){let t=texture(depthTexture,shadowCoord.xy.add(vec2(x,y).mul(texel)));if(depthTexture.isArrayTexture)t=t.depth(depthLayer);sum=sum.add(t.compare(shadowCoord.z).mul((x===0?2:1)*(y===0?2:1)));}return sum.div(16);
});
export class CityCSM extends CSMShadowNode{
 _init(builder){super._init(builder);for(const light of this.lights)light.shadow.filterNode=cityShadowFilter;}
}
export function cityCascadeSplits(cascades,near,far,target){
 for(let i=1;i<=cascades;i++){const t=i/cascades,log=near*(far/near)**t,linear=near+(far-near)*t;target.push((.95*log+.05*linear)/far);}
}
