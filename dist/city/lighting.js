// Shared, renderer-neutral art direction for the city and diagnostic bench.
// Direct light carries the form; the sky and environment provide bounded fill.
export const CITY_LIGHTING={
 golden:{label:'Golden hour · long shadows',sun:0xffd4a0,intensity:4.2,ambient:.65,environment:.4,exposure:1,sky:0x477c9b,horizon:0xbcc4ba,ground:0x545c50,direction:[.78,.3,.44],fog:.000045,imp:[.24,.94,0],rooms:.35,ao:.62},
 day:{label:'Clear daylight · architectural',sun:0xfff1d9,intensity:3.8,ambient:.7,environment:.4,exposure:1,sky:0x5b96b6,horizon:0xc6d4d5,ground:0x657267,direction:[-.45,.67,.59],fog:.000035,imp:[.3,.88,0],rooms:.12,ao:.55},
 overcast:{label:'Overcast · soft mineral light',sun:0xe2edf1,intensity:1.3,ambient:.8,environment:.48,exposure:1.05,sky:0x829ba7,horizon:0xc0cbcb,ground:0x647067,direction:[.35,.82,.35],fog:.000085,imp:[.5,.4,0],rooms:.25,ao:.75},
 raking:{label:'Low sun · reveal surface depth',sun:0xffd9ae,intensity:4,ambient:.45,environment:.28,exposure:1,sky:0x547f9b,horizon:0xb8bcaf,ground:0x4d594e,direction:[-.88,.19,.44],fog:.000035,imp:[.19,1,0],rooms:.3,ao:.6},
 blue:{label:'Blue hour · warm interiors',sun:0xf9bd91,intensity:1.1,ambient:.45,environment:.4,exposure:1.15,sky:0x1b3458,horizon:0x788896,ground:0x343f46,direction:[-.7,.16,.5],fog:.000075,imp:[.24,.4,.55],rooms:2,ao:.5},
 night:{label:'Moonlit city · inhabited',sun:0xb3d0f1,intensity:.7,ambient:.18,environment:.2,exposure:1.25,sky:0x071327,horizon:0x233749,ground:0x1d292f,direction:[-.4,.6,.55],fog:.000085,imp:[.13,.3,1.15],rooms:3,ao:.45}
};
export function cityLighting(id='golden'){return CITY_LIGHTING[id]||CITY_LIGHTING.golden;}
export const SHADOW_QUALITY={fast:{label:'Fast · 2 cascades / 1024',cascades:2,mapSize:1024,casters:384},balanced:{label:'Balanced · 3 cascades / 1536',cascades:3,mapSize:1536,casters:1024},high:{label:'High · 3 cascades / 2048',cascades:3,mapSize:2048,casters:2048}};
