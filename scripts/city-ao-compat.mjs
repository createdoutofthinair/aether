// Three r186 GTAO assumes forward depth for its background test and nearest
// half-resolution sample. Keep the city's reversed-Z precision and adapt only
// those comparisons. Guard exact upstream text so dependency updates fail
// explicitly instead of silently losing the compatibility correction.
export function cityAOCompatibility(source,kind){
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Unexpected r186 '+kind+' source: '+a.slice(0,65));source=source.replace(a,b);};
 replace('const uvNode = uv();','const reversedDepth = builder.renderer.reversedDepthBuffer === true;\n\t\tconst uvNode = uv();');
 if(kind==='gtao'){
  replace('const depth = min( min( g.x, g.y ), min( g.z, g.w ) );','const depth = reversedDepth ? max( max( g.x, g.y ), max( g.z, g.w ) ) : min( min( g.x, g.y ), min( g.z, g.w ) );');
  replace('depth.greaterThanEqual( 1.0 ).discard();','( reversedDepth ? depth.lessThanEqual( 0.0 ) : depth.greaterThanEqual( 1.0 ) ).discard();');
 }else{
  replace('setup( /* builder */ )','setup( builder )');
  replace('depth.greaterThanEqual( 1.0 ).or(','( reversedDepth ? depth.lessThanEqual( 0.0 ) : depth.greaterThanEqual( 1.0 ) ).or(');
  replace("'../../math/SimplexNoise.js'","'three/addons/math/SimplexNoise.js'");
 }
 return '// Generated r186 city reversed-Z compatibility. See scripts/city-ao-compat.mjs.\n'+source;
}
