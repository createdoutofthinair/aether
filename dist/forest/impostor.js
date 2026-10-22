import * as T from 'three/webgpu';
import {texture,uv,vec2,vec3,vec4,normalWorld,positionView,float,attribute,mix,uniform,cameraNear,cameraFar,viewZToPerspectiveDepth} from 'three/tsl';
/** Directional hemispherical captures of actual geometry, not generic tree cards.
 * Normal RGB + normalized capture-depth A support relighting and later parallax. */
export async function bakeImpostor(renderer,source,{tile=128,onView=()=>{},cancelled=()=>false}={}){
 const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=size.length()*1.06,distance=span*2,near=distance-span,far=distance+span;
 const scene=new T.Scene();scene.add(source);const camera=new T.OrthographicCamera(-span/2,span/2,span/2,-span/2,near,far);
 const params={type:T.UnsignedByteType,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true};
 const color=new T.RenderTarget(tile*8,tile*3,params),normal=new T.RenderTarget(tile*8,tile*3,params),colorTile=new T.RenderTarget(tile,tile,{type:T.UnsignedByteType}),normalTile=new T.RenderTarget(tile,tile,{type:T.UnsignedByteType});color.texture.colorSpace=colorTile.texture.colorSpace=T.SRGBColorSpace;renderer.initRenderTarget(color);renderer.initRenderTarget(normal);
 const originals=source.children.map(o=>o.material),albedos=originals.map(m=>new T.MeshBasicNodeMaterial({map:m.map,color:m.color,side:T.DoubleSide,toneMapped:false}));
 const normals=originals.map(()=>{const m=new T.MeshBasicNodeMaterial({side:T.DoubleSide,toneMapped:false});m.fragmentNode=vec4(normalWorld.mul(.5).add(.5),positionView.z.negate().sub(near).div(far-near).clamp(.001,.999));return m;});
 const oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new T.Color()),oldAlpha=renderer.getClearAlpha(),oldTone=renderer.toneMapping;renderer.toneMapping=T.NoToneMapping;renderer.setClearColor(0,0);
 try{for(let row=0;row<3;row++)for(let col=0;col<8;col++){
 if(cancelled())throw Error('Forest preparation cancelled');const elevation=row*Math.PI/4,az=col*Math.PI/4;camera.up.set(row===2?-Math.sin(az):0,row===2?0:1,row===2?-Math.cos(az):0);camera.position.copy(center).add(new T.Vector3(Math.sin(az)*Math.cos(elevation),Math.sin(elevation),Math.cos(az)*Math.cos(elevation)).multiplyScalar(distance));camera.lookAt(center);
 for(let i=0;i<source.children.length;i++)source.children[i].material=albedos[i];renderer.setRenderTarget(colorTile);await renderer.renderAsync(scene,camera);renderer.copyTextureToTexture(colorTile.texture,color.texture,null,new T.Vector2(col*tile,row*tile));
 for(let i=0;i<source.children.length;i++)source.children[i].material=normals[i];renderer.setRenderTarget(normalTile);await renderer.renderAsync(scene,camera);renderer.copyTextureToTexture(normalTile.texture,normal.texture,null,new T.Vector2(col*tile,row*tile));onView(row*8+col+1);await new Promise(resolve=>setTimeout(resolve,0));
 }await renderer.backend.device.queue.onSubmittedWorkDone();return{color,normal,center,span,tile};
 }catch(e){color.dispose();normal.dispose();throw e;}finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.toneMapping=oldTone;source.children.forEach((o,i)=>o.material=originals[i]);scene.remove(source);albedos.forEach(m=>m.dispose());normals.forEach(m=>m.dispose());colorTile.dispose();normalTile.dispose();}
}
export function impostorMaterial(atlas,{sun,debug}){
 const frame=attribute('forestFrame','vec4'),yaw=attribute('forestYaw','float'),tint=attribute('forestTint','float'),padded=uv().mul(1-4/atlas.tile).add(2/atlas.tile),a=vec2(padded.x.add(frame.x).div(8),padded.y.add(frame.z).div(3)),b=vec2(padded.x.add(frame.y).div(8),padded.y.add(frame.z).div(3)),ca=texture(atlas.color.texture,a),cb=texture(atlas.color.texture,b),na=texture(atlas.normal.texture,a),nb=texture(atlas.normal.texture,b);
 const color=mix(ca,cb,frame.w),n=mix(na.rgb,nb.rgb,frame.w).div(color.a.max(.001)).mul(2).sub(1).normalize(),world=vec3(n.x.mul(yaw.cos()).add(n.z.mul(yaw.sin())),n.y,n.z.mul(yaw.cos()).sub(n.x.mul(yaw.sin()))),lit=world.dot(sun).max(0).mul(.72).add(.4);
 const m=new T.MeshBasicNodeMaterial({alphaTest:.01,alphaHash:true,side:T.DoubleSide,depthWrite:true});m.colorNode=mix(color.rgb.div(color.a.max(.001)).mul(lit).mul(tint),vec3(.85,.3,.7),debug);m.opacityNode=color.a.mul(attribute('forestFade','float'));const captureDepth=mix(na.a,nb.a,frame.w).div(color.a.max(.001)),offset=captureDepth.sub(.5).mul(2*atlas.span).mul(attribute('forestScale','float'));m.depthNode=viewZToPerspectiveDepth(positionView.z.sub(offset),cameraNear,cameraFar).clamp(0,1);return m;
}
