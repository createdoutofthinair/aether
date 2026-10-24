import {buildingWeatherNodes} from './building-weather-nodes.js';
import {attribute,texture,vec2,vec3,vec4,float,mix,normalMap,positionLocal,positionWorld,positionGeometry,cameraViewMatrix,parallaxDirection,output} from 'three/tsl';
/** Repeat inside one semantic cell. Derivatives are taken BEFORE fract, so
 * tile boundaries cannot choose blurry mips; guards isolate adjacent finishes. */
export function citySurfaceNodes(material,{preview}={}){
 const spec=material.userData.citySurface;if(!spec)return material;
 const columns=spec.atlasColumns||4,rows=spec.atlasRows||2,guard=spec.atlasGuard??.125;
 const uv=(spec.world?positionWorld.xz:attribute('uv','vec2')).div(spec.tileMeters),data=spec.world?vec4(spec.zone||0,0,0,spec.variation??.025):attribute('uv1','vec4'),zone=data.x.round(),slot=vec2(zone.mod(columns),zone.div(columns).floor()),scale=vec2((1-guard*2)/columns,(1-guard*2)/rows),dx=uv.dFdx().mul(scale),dy=uv.dFdy().mul(scale);
 // Height is packed in ORM alpha: .5 + metres * 40. A bounded two-sample
 // parallax offset adds millimetre relief without inventing silhouette depth.
 // Explicit pre-wrap gradients keep both height lookups and finish mips stable.
 const atlasAt=p=>slot.add(guard).div(vec2(columns,rows)).add(p.fract().mul(scale));
 let shadedUV=uv;
 if(spec.relief&&!spec.world){const direction=parallaxDirection.xy.div(parallaxDirection.z.abs().max(.35)),heightAt=p=>texture(material.roughnessMap,atlasAt(p)).grad(dx,dy).a.sub(.5).div(40*spec.tileMeters),first=heightAt(uv),refined=heightAt(uv.sub(direction.mul(first).mul(spec.relief)));shadedUV=uv.sub(direction.mul(first.add(refined).mul(.5*spec.relief)));}
 const atlasUV=atlasAt(shadedUV);
 const sample=t=>texture(t,atlasUV).grad(dx,dy),albedo=sample(material.map),orm=sample(material.roughnessMap),bump=sample(material.normalMap);
 const panel=uv.floor().dot(vec2(12.9898,78.233)).sin().mul(43758.5453).fract(),runoff=uv.x.mul(9.7).sin().mul(uv.x.mul(3.1).sin()).smoothstep(.58,.93),base=spec.world?float(0):float(1).sub(positionLocal.y.max(0).div(2).clamp()),dirt=data.y.mul(.55).add(base.mul(.35)).add(runoff.mul(.1)).mul(spec.wear).mul(panel.mul(.4).add(.6)).clamp();
 const roadSize=spec.road?attribute('streetSize','vec2'):vec2(0),cross=positionGeometry.x.mul(roadSize.x),edge=cross.abs().div(roadSize.x.max(.001).mul(.5)).smoothstep(.78,.99).mul(roadSize.x.greaterThan(0)),tracks=cross.mul(Math.PI/3.6).sin().abs().smoothstep(.87,.99).mul(roadSize.x.greaterThan(0));
 material.colorNode=mix(albedo.rgb.mul(panel.sub(.5).mul(data.w).add(1)),vec3(...spec.dirt),dirt.mul(.24)).mul(vec3(material.color.r,material.color.g,material.color.b));
 if(spec.road)material.colorNode=mix(material.colorNode.mul(float(1).sub(tracks.mul(.055))),vec3(...spec.dirt),edge.mul(spec.wear*.22));
 material.roughnessNode=orm.g.add(data.z).add(dirt.mul(.12)).add(edge.mul(.07)).sub(tracks.mul(.07)).clamp(.22,.98);material.metalnessNode=orm.b.mul(float(1).sub(dirt));material.aoNode=orm.r;material.normalNode=spec.world?vec3(bump.r.mul(2).sub(1),bump.b.mul(2).sub(1),bump.g.mul(2).sub(1)).normalize().transformDirection(cameraViewMatrix):normalMap(bump,vec2(1));
 buildingWeatherNodes(material,spec);
 if(preview){let view=albedo.rgb;for(const [id,node]of [[2,bump.rgb],[3,vec3(orm.g)],[4,vec3(orm.b)],[5,vec3(orm.a.sub(.5).mul(5).add(.5))],[6,vec3(orm.r)]])view=mix(view,node,preview.equal(id));material.outputNode=mix(output,vec4(view,1),preview.greaterThan(0));}
 return material;
}
