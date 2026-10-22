import {blueprint} from '../ships/blueprint.js';
import {shipModel} from './worker-kit/model.js';
import {batchShip,packShip,shipTransfers,disposeShip} from './worker-kit/ship-assets.js';
self.onmessage=({data})=>{try{const plan=blueprint(data.seed),model=shipModel(plan);model.rotation.set(0,0,0);const ship=batchShip(model),payload=packShip(ship);self.postMessage({id:data.id,payload},shipTransfers(payload));disposeShip(ship);}catch(e){self.postMessage({id:data.id,error:e.message});}};
