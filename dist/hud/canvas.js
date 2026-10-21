// Canvas is reserved for decorative scene motion and the spherical contact display.
export function createCanvases(space,radar){
 const bg=space.getContext('2d'),ctx=radar.getContext('2d');let w=0,h=0,dpr=1,seed=177;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const stars=Array.from({length:160},()=>({x:random(),y:random(),z:.25+random()*.75}));
 const observer=new ResizeObserver(()=>{w=space.clientWidth;h=space.clientHeight;dpr=Math.min(devicePixelRatio||1,2);space.width=w*dpr;space.height=h*dpr;});observer.observe(space);
 function scene(t,reduced,showStars){bg.setTransform(dpr,0,0,dpr,0,0);bg.clearRect(0,0,w,h);if(!showStars)return;bg.fillStyle='#d1f2ff';for(const p of stars){const x=(p.x*w+(reduced?0:t*p.z*1.5))%w;const y=p.y*h;bg.globalAlpha=p.z*.4;bg.fillRect(x,y,p.z*1.2,p.z*1.2);}bg.globalAlpha=1;}
 function globe(t,state,color,reduced){
  const W=radar.width,H=radar.height,cx=W/2,cy=H*.46,r=H*.36;ctx.clearRect(0,0,W,H);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;const rotation=reduced?.4:t*.045;
  function point(x,y,z){const a=x*Math.cos(rotation)+z*Math.sin(rotation),b=-x*Math.sin(rotation)+z*Math.cos(rotation);return [cx+a*r,cy+(y*.88-b*.37)*r,b*.88+y*.37];}
  function line(points){ctx.beginPath();points.forEach((p,i)=>{const q=point(...p);if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);});ctx.stroke();}
  ctx.globalAlpha=.42;for(let j=-3;j<=3;j++){const lat=j*Math.PI/8;line(Array.from({length:81},(_,i)=>{const a=i/80*Math.PI*2;return [Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)];}));}
  for(let j=0;j<12;j++){const lon=j*Math.PI/6;line(Array.from({length:61},(_,i)=>{const a=-Math.PI/2+i/60*Math.PI;return [Math.cos(a)*Math.cos(lon),Math.sin(a),Math.cos(a)*Math.sin(lon)];}));}
  ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.22;ctx.beginPath();ctx.ellipse(cx,cy,r*1.16,r*.34,-.12,0,Math.PI*2);ctx.stroke();
  if(!reduced){ctx.globalAlpha=.18;const a=t*.55;line([[0,0,0],[Math.cos(a),0,Math.sin(a)]]);}
  ctx.globalAlpha=.9;const positions=[[.4,-.3,.25],[-.22,.22,.6],[.65,.12,-.15]];positions.forEach((p,i)=>{const q=point(...p);ctx.strokeStyle=i===2?'#ffc27c':color;ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[0],cy);ctx.globalAlpha=.28;ctx.stroke();ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(q[0],q[1]-4);ctx.lineTo(q[0]+4,q[1]);ctx.lineTo(q[0],q[1]+4);ctx.lineTo(q[0]-4,q[1]);ctx.closePath();ctx.stroke();});
  ctx.strokeStyle=color;ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx-5,cy+5);ctx.lineTo(cx+5,cy+5);ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
 }
 return {draw(t,state,color,reduced,showStars=true){scene(t,reduced,showStars);globe(t,state,color,reduced);},dispose(){observer.disconnect();}};
}
