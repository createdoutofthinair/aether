export const TYPES=['cockpit','habitat','cargo','reactor','engine','collar','wing','solar','antenna','mount','tank','truss','hangar','delta','ring-drive'];
export function random(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// All axial modules expose planar sockets at +/- length/2. A small insertion
// overlap avoids cracks without relying on decorative mesh bounding boxes.
export const INSERTION=.04;
export function blueprint(seed){
 const r=random('ship-v3:'+seed),pick=a=>a[Math.floor(r()*a.length)],range=(a,b)=>a+(b-a)*r();
 const family=pick(['capsule','courier','hauler','twin-boom','delta','ring-drive']);
 const role=pick(['explorer','freighter','scout']),count=2+Math.floor(r()*7),radius=range(.75,1.25),parts=[];
 const appearance={finish:pick(['silver','dark']),roughness:range(.38,.62),hue:range(.48,.64),metalness:range(.72,.96)};
 const add=(type,length,x,y,z,extra={})=>{const p={id:parts.length,type,length,radius,x,y,z,shape:family==='courier'||family==='hauler'?'box':family==='delta'?'octagonal':'round',engineStyle:pick(['bell','cluster','slotted']),variant:Math.floor(r()*3),detailSeed:Math.floor(r()*0xffffffff),...extra};if(extra.side){const paired=random(seed+':'+type+':'+Math.abs(x)+':'+y+':'+z);p.engineStyle=['bell','cluster','slotted'][Math.floor(paired()*3)];p.variant=Math.floor(paired()*3);p.detailSeed=Math.floor(paired()*0xffffffff);}parts.push(p);return p;};
 const cockpitLength=range(2.1,3.4);let tail=cockpitLength/2;
 const cockpit=add('cockpit',cockpitLength,0,0,0);let previous=cockpit;
 function axial(type,length){const z=tail+length/2-INSERTION,p=add(type,length,0,0,z,{parent:previous.id});tail=z+length/2;previous=p;return p;}
 const hull=[];
 const moduleType=i=>family==='ring-drive'&&i===1?'ring-drive':family==='hauler'?pick(['hangar','cargo','tank']):family==='twin-boom'?pick(['truss','reactor']):pick(['habitat','cargo','reactor','tank','truss']);
 for(let i=0;i<count;i++){const socket=tail-INSERTION/2;add('collar',.18,0,0,socket);hull.push(axial(moduleType(i),range(1.7,3.3)));}
 add('collar',.18,0,0,tail-INSERTION/2);const engine=axial('engine',range(2.1,3.4));
 const attachment=family==='delta'?'delta':pick(['wing','solar','delta']),span=range(2,4.6),stations=r()<.5?[hull.length-1]:[0,hull.length-1];
 for(const index of [...new Set(stations)])for(const side of [-1,1])add(attachment,span,side*(radius-.08),0,hull[index].z,{side,parent:hull[index].id,radius});
 if(family==='twin-boom'||role==='freighter'||r()<.45){const offset=radius*2+range(.45,1.1),podRadius=radius*range(.55,.76),podLength=range(1.9,3.2),station=hull.at(-1),podZ=station.z;
 for(const side of [-1,1]){const inner=radius-.12,outer=offset-podRadius+.12;const mount=add('mount',outer-inner,side*(inner+outer)/2,0,podZ,{side,parent:station.id,radius:.18});if(family==='twin-boom'){const boom=add('habitat',4.5,side*offset,0,podZ,{side,radius:podRadius,parent:mount.id});add('engine',podLength,side*offset,0,podZ+2.25+podLength/2-INSERTION,{side,radius:podRadius,parent:boom.id});}else add('engine',podLength,side*offset,0,podZ,{side,radius:podRadius,parent:mount.id});}}
 const station=hull[Math.floor(r()*hull.length)];add('antenna',range(.8,1.4),0,radius-.12,station.z,{parent:station.id});
 const history=random('service:'+seed),serial=String(Math.floor(history()*90000)+10000),age=.18+history()*.46;
 const repairPart=hull[Math.floor(history()*hull.length)].id;
 const service={age,registry:'AE-'+serial,repairPart,accessSide:history()<.5?-1:1,accent:role==='freighter'?'#ad7447':role==='explorer'?'#537c83':'#646e80'};
 return {version:4,family,seed:String(seed),role,count,radius,appearance,service,parts};
}
