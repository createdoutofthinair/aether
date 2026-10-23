import * as T from '../vendor-gpu/three.webgpu.js';
import {compileArchitecture} from './architecture.js';
import {loftGeometry} from './architecture-model.js';
import {mapCitySurface} from './surface-uv.js';
/** Independent silhouette casters omit thousands of window/reveal triangles.
 * Their transforms and occupied masses are identical to the visible recipe. */
export function buildingShadowModel(plan,materials){
 const root=new T.Group();
 for(const volume of compileArchitecture(plan.architecture).volumes){const g=loftGeometry(volume,20);mapCitySurface(g,materials.zones.ceramic);root.add(new T.Mesh(g,materials.atlas.material));}
 return root;
}
