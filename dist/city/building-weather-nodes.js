import {positionWorld,normalWorldGeometry,vec3,float,mix,mx_noise_float} from 'three/tsl';
/** Metre-scale gravity/orientation deposition complements the periodic detail.
 * This is an appearance model, not mesh-aware water transport or baked GI. */
export function buildingWeatherNodes(material,spec){
 const w=spec.buildingWeather;if(!w)return;
 const p=positionWorld,up=normalWorldGeometry.y.max(0),side=float(1).sub(normalWorldGeometry.y.abs()),low=float(1).sub(p.y.smoothstep(.25,3.5)),
 macro=mx_noise_float(p.mul(vec3(.19,.09,.19)).add(vec3(13.2,4.7,7.1))).mul(.5).add(.5).clamp(),
 streak=mx_noise_float(p.mul(vec3(1.9,.095,1.9))).mul(.5).add(.5).smoothstep(.68,.83).mul(side),
 dirt=low.mul(.5).add(streak.mul(w.rain*.8)).mul(macro).mul(w.dust*.6+.4),
 deposit=up.mul(w.dust*.18).mul(macro),growth=low.mul(side).mul(macro.smoothstep(.48,.73)).mul(w.biology*.28),wet=macro.mul(w.wetness);
 material.colorNode=mix(material.colorNode,vec3(.16,.13,.095),dirt.mul(.55));material.colorNode=mix(material.colorNode,vec3(.38,.33,.24),deposit);material.colorNode=mix(material.colorNode,vec3(.065,.1,.067),growth);material.colorNode=material.colorNode.mul(float(1).sub(wet.mul(.18)));
 material.roughnessNode=material.roughnessNode.add(dirt.mul(.12)).add(deposit.mul(.13)).sub(wet.mul(.18)).clamp(.12,.98);material.metalnessNode=material.metalnessNode.mul(float(1).sub(dirt.mul(.4).add(deposit).add(growth).clamp()));
}
