import {screenCoordinate,attribute,float,sin} from 'three/tsl';
// Stable screen-pixel mask shared by both representations. Outgoing pixels
// occupy the exact complement of the incoming mask; no double-fade holes.
export function transitionMask(){const p=screenCoordinate.xy.floor(),threshold=sin(p.x.mul(12.9898).add(p.y.mul(78.233))).mul(43758.5453).fract(),fade=attribute('forestFade','float'),outgoing=attribute('forestOutgoing','float');return outgoing.greaterThan(.5).select(threshold.greaterThanEqual(float(1).sub(fade)),threshold.lessThan(fade));}
