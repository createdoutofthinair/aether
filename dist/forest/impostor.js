import * as T from 'three/webgpu';
import {texture,uv,vec2,vec3,vec4,normalWorld,positionView,float,attribute,mix,uniform,cameraPosition,cameraWorldMatrix,cameraViewMatrix,cameraNear,cameraFar,viewZToPerspectiveDepth} from 'three/tsl';
import {OCT_GRID,octDirection,captureBasis,validateAtlasCoverage} from './octahedral.js';
import {compactReadback} from '../render/readback.js';
import {transitionMask} from './coverage.js';
/** Hemi-octahedral captures of actual geometry.
 * Normal RGB + normalized capture-depth A drive relighting and ray reprojection. */
export async function bakeImpostor(renderer,source,{tile=128,encodeEmission=false,albedoNode=null,onView=()=>{},onYield=null,cancelled=()=>false}={}){
 const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=size.length()*1.06,distance=span*2,near=distance-span,far=distance+span;
 const scene=new T.Scene();scene.add(source);const camera=new T.OrthographicCamera(-span/2,span/2,span/2,-span/2,near,far);
 const params={type:T.UnsignedByteType,minFilter:T.LinearFilter,generateMipmaps:false};
 const color=new T.RenderTarget(tile*OCT_GRID,tile*OCT_GRID,params),normal=new T.RenderTarget(tile*OCT_GRID,tile*OCT_GRID,{...params,type:T.HalfFloatType}),colorTile=new T.RenderTarget(tile,tile,{type:T.UnsignedByteType}),normalTile=new T.RenderTarget(tile,tile,{type:T.HalfFloatType});color.texture.colorSpace=colorTile.texture.colorSpace=T.SRGBColorSpace;renderer.initRenderTarget(color);renderer.initRenderTarget(normal);
 const originals=source.children.map(o=>o.material),albedos=originals.map(m=>{const capture=new T.MeshBasicNodeMaterial({map:m.map,color:m.color,vertexColors:m.vertexColors,side:T.DoubleSide,toneMapped:false}),node=albedoNode?.(m);if(node)capture.colorNode=node;return capture;});
 const normals=originals.map(original=>{const m=new T.MeshBasicNodeMaterial({side:T.DoubleSide,toneMapped:false});m.fragmentNode=vec4(normalWorld.mul(.5).add(.5),encodeEmission?float(original.emissive?.getHex()&&original.emissiveIntensity>0?1:0):positionView.z.negate().sub(near).div(far-near).clamp(.001,.999));return m;});
 const oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new T.Color()),oldAlpha=renderer.getClearAlpha(),oldTone=renderer.toneMapping;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);
 try{for(let row=0;row<OCT_GRID;row++)for(let col=0;col<OCT_GRID;col++){
 if(cancelled())throw Error('Forest preparation cancelled');renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);const direction=octDirection(col,row),basis=captureBasis(direction);camera.up.fromArray(basis.up);camera.position.copy(center).add(new T.Vector3(...direction).multiplyScalar(distance));camera.lookAt(center);
 for(let i=0;i<source.children.length;i++)source.children[i].material=albedos[i];renderer.setRenderTarget(colorTile);await renderer.renderAsync(scene,camera);renderer.copyTextureToTexture(colorTile.texture,color.texture,null,new T.Vector2(col*tile,row*tile));
 for(let i=0;i<source.children.length;i++)source.children[i].material=normals[i];renderer.setRenderTarget(normalTile);await renderer.renderAsync(scene,camera);renderer.copyTextureToTexture(normalTile.texture,normal.texture,null,new T.Vector2(col*tile,row*tile));onView(row*OCT_GRID+col+1);
 if(onYield){renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.toneMapping=oldTone;source.children.forEach((o,i)=>o.material=originals[i]);await onYield();}else await new Promise(resolve=>setTimeout(resolve,0));
 }await renderer.backend.device.queue.onSubmittedWorkDone();const pixels=await renderer.readRenderTargetPixelsAsync(color,0,0,tile*OCT_GRID,tile*OCT_GRID),coverage=validateAtlasCoverage(compactReadback(pixels,tile*OCT_GRID,tile*OCT_GRID),tile);return{color,normal,center,span,tile,coverage,depthMode:encodeEmission?'emission':'depth'};
 }catch(e){color.dispose();normal.dispose();throw e;}finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.toneMapping=oldTone;source.children.forEach((o,i)=>o.material=originals[i]);scene.remove(source);albedos.forEach(m=>m.dispose());normals.forEach(m=>m.dispose());colorTile.dispose();normalTile.dispose();}
}
// GPU view selection + triangular hemi-octahedral interpolation. Each capture
// reprojects the current camera ray through its stored depth before sampling.
export function impostorMaterial(atlas,{sun,debug,parallax=uniform(0),ambient=uniform(.4),diffuse=uniform(.72),emission=uniform(0),reconstructDepth=true}){
 const center=attribute('forestCenter','vec3'),scale=attribute('forestScale','float'),width=attribute('forestWidth','float'),yaw=attribute('forestYaw','float'),tint=attribute('forestTint','float'),sx=scale.mul(width),sy=scale;
 const inverse=v=>vec3(v.x.mul(yaw.cos()).sub(v.z.mul(yaw.sin())).div(sx),v.y.div(sy),v.x.mul(yaw.sin()).add(v.z.mul(yaw.cos())).div(sx));
 const forward=v=>vec3(v.x.mul(sx).mul(yaw.cos()).add(v.z.mul(sx).mul(yaw.sin())),v.y.mul(sy),v.z.mul(sx).mul(yaw.cos()).sub(v.x.mul(sx).mul(yaw.sin())));
 const rightW=cameraWorldMatrix[0].xyz,upW=cameraWorldMatrix[1].xyz;
 const planeOffset=rightW.mul(uv().x.sub(.5).mul(atlas.span).mul(sx)).add(upW.mul(uv().y.sub(.5).mul(atlas.span).mul(sy))),point=inverse(planeOffset),ray=inverse(cameraPosition.sub(center).sub(planeOffset)).normalize(),view=inverse(cameraPosition.sub(center)).normalize();
 const l1=view.x.abs().add(view.y.abs()).add(view.z.abs()).max(.0001),gx=view.x.add(view.z).div(l1).add(1).mul((OCT_GRID-1)/2).clamp(0,OCT_GRID-1),gy=view.x.sub(view.z).div(l1).add(1).mul((OCT_GRID-1)/2).clamp(0,OCT_GRID-1),ix=gx.floor().min(OCT_GRID-2),iy=gy.floor().min(OCT_GRID-2),fx=gx.sub(ix),fy=gy.sub(iy),lower=fx.add(fy).lessThanEqual(1);
 const indices=[lower.select(vec2(ix,iy),vec2(ix.add(1),iy.add(1))),lower.select(vec2(ix.add(1),iy),vec2(ix,iy.add(1))),lower.select(vec2(ix,iy.add(1)),vec2(ix.add(1),iy))],weights=[lower.select(float(1).sub(fx).sub(fy),fx.add(fy).sub(1)),lower.select(fx,float(1).sub(fx)),lower.select(fy,float(1).sub(fy))];
 const atlasUV=(p,index)=>vec2(p.x,float(1).sub(p.y)).clamp(.5/atlas.tile,1-.5/atlas.tile).add(index).div(OCT_GRID);
 const samples=indices.map(index=>{
 const u=index.x.div(OCT_GRID-1),v=index.y.div(OCT_GRID-1),dx=u.add(v).sub(1),dz=u.sub(v),d=vec3(dx,float(1).sub(dx.abs()).sub(dz.abs()),dz).normalize(),horizontal=vec3(d.z,0,d.x.negate()),right=horizontal.length().greaterThan(.0001).select(horizontal.div(horizontal.length().max(.0001)),vec3(1,0,0)),up=d.cross(right),denom=ray.dot(d).max(.05);
 const t0=point.dot(d).div(denom),q=point.sub(ray.mul(t0)),uv0=parallax.greaterThan(.5).select(vec2(q.dot(right),q.dot(up)).div(atlas.span).add(.5),uv()),c0=texture(atlas.color.texture,atlasUV(uv0,index)).level(0),n0=texture(atlas.normal.texture,atlasUV(uv0,index)).level(0),depth=c0.a.greaterThan(.02).select(n0.a.div(c0.a.max(.001)).sub(.5).mul(2*atlas.span).clamp(-atlas.span*.5,atlas.span*.5),float(0)),t=point.dot(d).add(depth.mul(parallax)).div(denom),surface=point.sub(ray.mul(t)),coords=vec2(surface.dot(right),surface.dot(up)).div(atlas.span).add(.5),valid=coords.x.greaterThanEqual(0).and(coords.x.lessThanEqual(1)).and(coords.y.greaterThanEqual(0)).and(coords.y.lessThanEqual(1)).select(1,0),warped=texture(atlas.color.texture,atlasUV(coords,index)).level(0),warpedNormal=texture(atlas.normal.texture,atlasUV(coords,index)).level(0),useWarp=parallax.greaterThan(.5).and(valid.greaterThan(0)).and(warped.a.greaterThan(.01)),baseValid=uv0.x.greaterThanEqual(0).and(uv0.x.lessThanEqual(1)).and(uv0.y.greaterThanEqual(0)).and(uv0.y.lessThanEqual(1)).select(1,0),c=useWarp.select(warped,c0.mul(baseValid)),n=useWarp.select(warpedNormal,n0.mul(baseValid));return{c,n,t:useWarp.select(t,t0)};});
 let color=vec4(0),normal=vec3(0),depth= float(0),glow=float(0);
 for(let i=0;i<3;i++){const s=samples[i],w=weights[i];color=color.add(s.c.mul(w));normal=normal.add(s.n.rgb.mul(w));depth=depth.add(s.t.mul(s.c.a).mul(w));glow=glow.add(s.n.a.mul(atlas.depthMode==='emission'?w:0));}
 // Preserve silhouette coverage while blending radiance. A weighted average
 // otherwise erases leaves that occur in only one neighbouring capture.
 const silhouette=samples[0].c.a.mul(weights[0]).max(samples[1].c.a.mul(weights[1])).max(samples[2].c.a.mul(weights[2])).div(weights[0].max(weights[1]).max(weights[2]));
 const coverage=color.a.max(.001),n=normal.div(coverage).mul(2).sub(1).normalize(),world=vec3(n.x.mul(yaw.cos()).add(n.z.mul(yaw.sin())),n.y,n.z.mul(yaw.cos()).sub(n.x.mul(yaw.sin()))),lit=world.dot(sun).max(0).mul(diffuse).add(ambient),m=new T.SpriteNodeMaterial({alphaTest:.01,alphaToCoverage:true,transparent:false,side:T.DoubleSide,depthWrite:true});
 m.colorNode=mix(color.rgb.div(coverage).mul(lit).mul(tint).add(vec3(1,.69,.38).mul(glow.div(coverage)).mul(emission)),vec3(.85,.3,.7),debug);m.opacityNode=silhouette;m.maskNode=transitionMask();
 // The built-in sprite path owns clip position, fog position and raster depth.
 m.positionNode=center;m.scaleNode=vec2(sx,sy);
 const planeView=cameraViewMatrix.mul(vec4(center.add(planeOffset),1)).z,rayZ=cameraViewMatrix.mul(vec4(forward(ray),0)).z;const reconstructedDepth=viewZToPerspectiveDepth(planeView.sub(depth.div(coverage).mul(parallax).mul(rayZ)),cameraNear,cameraFar).clamp(0,1);
 m.setParallaxDepth=enabled=>{parallax.value=enabled?1:0;m.depthNode=enabled?reconstructedDepth:null;m.needsUpdate=true;};
 if(reconstructDepth)m.setParallaxDepth(parallax.value>.5);return m;
}
