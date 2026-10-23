import {attribute,parallaxDirection,smoothstep,vec3,mix,float,materialEmissive} from 'three/tsl';
/** A bounded view-dependent room/reveal approximation, shared by inspection,
 * instanced city meshes and captures. It adds no textures or vertex streams. */
export function windowNodes(material){
 if(!['Architectural glazing','Occupied rooms and wayfinding'].includes(material.name))return material;
 const uv=attribute('uv1','vec2'),roomUV=uv.sub(parallaxDirection.xy.mul(.12)),edge=roomUV.x.min(float(1).sub(roomUV.x)).min(roomUV.y.min(float(1).sub(roomUV.y))),inside=smoothstep(0,.13,edge),ceiling=smoothstep(.65,.96,roomUV.y),blind=uv.y.mul(110).sin().smoothstep(.35,.75).mul(smoothstep(.66,.9,uv.y));
 const base=material.colorNode||vec3(material.color.r,material.color.g,material.color.b),room=mix(vec3(.62,.72,.76),vec3(.93,.97,1),inside).mul(float(1).sub(blind.mul(.16))).mul(float(1).sub(ceiling.mul(.1)));
 material.colorNode=base.mul(room);if(material.name==='Occupied rooms and wayfinding')material.emissiveNode=materialEmissive.mul(inside.mul(.6).add(.2)).mul(float(1).sub(blind.mul(.45)));
 return material;
}
