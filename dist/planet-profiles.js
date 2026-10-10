// Shared geological rules. These describe rocky surfaces, not a climate model.
export function geologicalProfile(config={},environment={}){
 if(environment.iceEnabled!==false&&config.temperature< -15)return 'glacial';
 if(config.activity>.65)return 'volcanic';
 if(config.pressure<.05)return 'airless';
 if(environment.waterEnabled===false||config.temperature>45)return 'dry';
 return 'temperate';
}
export const profileRules=Object.freeze({
 temperate:{hydraulic:1,talus:.72,incision:1,ledge:1,broken:1,gravel:1},
 dry:{hydraulic:.18,talus:.66,incision:.4,ledge:1.45,broken:1.1,gravel:1.4},
 volcanic:{hydraulic:.10,talus:.85,incision:.2,ledge:.25,broken:2.4,gravel:.5},
 glacial:{hydraulic:.04,talus:.54,incision:.05,ledge:.15,broken:.5,gravel:.6},
 airless:{hydraulic:0,talus:.90,incision:0,ledge:.3,broken:1.7,gravel:1.2}
});
export function referenceKey(seed=6,config={temperature:18,pressure:1,activity:.45},environment={}){
 return JSON.stringify([seed,config.temperature??18,config.pressure??1,config.activity??.45,environment.waterEnabled!==false,environment.iceEnabled!==false]);
}
