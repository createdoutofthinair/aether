import {generatePlanetData} from './planet-data.js?v=terrain-17';
import {configureWorld,configureEnvironment} from './world.js?v=terrain-17';
import {authoredHeight} from './terrain.js?v=terrain-17';
import * as T from './vendor/three.module.js';
self.onmessage=({data:{id,config,environment}})=>{try{configureWorld(config);configureEnvironment(environment);const result=generatePlanetData(config,environment,n=>authoredHeight(new T.Vector3(n.x,n.y,n.z)));self.postMessage({id,result},[result.residual.buffer,result.masks.buffer]);}catch(error){self.postMessage({id,error:String(error)});}};
