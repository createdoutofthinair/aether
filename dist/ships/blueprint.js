export const TYPES=['cockpit','habitat','cargo','reactor','engine','collar','wing','solar','antenna','mount'];
export function random(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// All axial modules expose planar sockets at +/- length/2. A small insertion
// overlap avoids cracks without relying on decorative mesh bounding boxes.
export const INSERTION=.04;
export function blueprint(seed){
 const r=random('ship-v2:'+seed),pick=a=>a[Math.floor(r()*a.length)],range=(a,b)=>a+(b-a)*r();
 const role=pick(['explorer','freighter','scout']),count=2+Math.floor(r()*7),radius=range(.75,1.25),parts=[];
 const appearance={finish:pick(['silver','dark']),roughness:range(.22,.55),hue:range(.48,.64),metalness:range(.72,.96)};
 const add=(type,length,x,y,z,extra={})=>{const p={id:parts.length,type,length,radius,x,y,z,variant:Math.floor(r()*3),detailSeed:Math.floor(r()*0xffffffff),...extra};parts.push(p);return p;};
 const cockpitLength=range(2.1,3.4);let tail=cockpitLength/2;
 const cockpit=add('cockpit',cockpitLength,0,0,0);let previous=cockpit;
 function axial(type,length){const z=tail+length/2-INSERTION,p=add(type,length,0,0,z,{parent:previous.id});tail=z+length/2;previous=p;return p;}
 const hull=[];
 for(let i=0;i<count;i++){const socket=tail-INSERTION/2;add('collar',.18,0,0,socket);hull.push(axial(role==='freighter'?pick(['cargo','cargo','reactor']):pick(['habitat','cargo','reactor']),range(1.7,3.3)));}
 add('collar',.18,0,0,tail-INSERTION/2);const engine=axial('engine',range(2.1,3.4));
 const attachment=pick(['wing','solar']),span=range(2,4.6),stations=r()<.5?[hull.length-1]:[0,hull.length-1];
 for(const index of [...new Set(stations)])for(const side of [-1,1])add(attachment,span,side*(radius-.08),0,hull[index].z,{side,parent:hull[index].id,radius});
 if(role==='freighter'||r()<.45){const offset=radius*2+range(.45,1.1),podRadius=radius*range(.55,.76),podLength=range(1.9,3.2),station=hull.at(-1),podZ=station.z;
 for(const side of [-1,1]){const inner=radius-.12,outer=offset-podRadius+.12;const mount=add('mount',outer-inner,side*(inner+outer)/2,0,podZ,{side,parent:station.id,radius:.18});add('engine',podLength,side*offset,0,podZ,{side,radius:podRadius,parent:mount.id});}}
 const station=hull[Math.floor(r()*hull.length)];add('antenna',range(.8,1.4),0,radius-.12,station.z,{parent:station.id});
 return {version:2,seed:String(seed),role,count,radius,appearance,parts};
}
