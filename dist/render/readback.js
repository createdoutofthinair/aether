/** WebGPU texture copies pad rows to 256 bytes. Three r186 exposes that
 * staging layout (except the final row), so image/coverage consumers must
 * compact it instead of interpreting padding as transparent image pixels. */
export function compactReadback(pixels,width,height,channels=4){
 const row=width*channels,expected=row*height;
 if(pixels.length===expected)return pixels;
 const stride=Math.ceil(row*pixels.BYTES_PER_ELEMENT/256)*256/pixels.BYTES_PER_ELEMENT;
 if(pixels.length<(height-1)*stride+row)throw Error('Incomplete GPU texture readback');
 const output=new pixels.constructor(expected);
 for(let y=0;y<height;y++)output.set(pixels.subarray(y*stride,y*stride+row),y*row);
 return output;
}
