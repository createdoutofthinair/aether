export function tyreSupport(radius,halfWidth,axle,normal){
 const axial=Math.min(1,Math.abs(axle.x*normal.x+axle.y*normal.y+axle.z*normal.z));
 return radius*Math.sqrt(Math.max(0,1-axial*axial))+halfWidth*axial;
}
export function wheelClearance(center,up,axle,radius,halfWidth,sample){
 const {point,normal}=sample(center);
 const signed=(center.x-point.x)*normal.x+(center.y-point.y)*normal.y+(center.z-point.z)*normal.z;
 const projection=up.x*normal.x+up.y*normal.y+up.z*normal.z;
 return(tyreSupport(radius,halfWidth,axle,normal)+.015-signed)/Math.max(.2,projection);
}
