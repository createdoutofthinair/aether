// Metropolis shares the Native Building Lab's curved construction grammar.
import {compileGrammar} from './grammar.js';
export const NATIVE_FAMILIES={petal:'petal-shell',helix:'helix-shell',shell:'crescent-shell',ring:'atrium-shell',canopy:'canopy-shell',spire:'taper',saucer:'spindle',blade:'sail-shell'};
export function nativePrototype(architecture){
 const mass=NATIVE_FAMILIES[architecture.family];if(!mass)return null;
 const bay=architecture.facade.bayWidth;
 return compileGrammar({seed:architecture.seed+':'+architecture.family+':'+architecture.profile,mass,world:architecture.style,facade:architecture.profile?'ribbon':'frame',floors:Math.round(architecture.height/architecture.floorHeight),baysX:Math.round(architecture.width/bay),baysZ:Math.round(architecture.depth/bay),bay,taper:architecture.options.taper,twist:architecture.options.twist});
}
