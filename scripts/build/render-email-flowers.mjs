/** Static, untracked email artwork using HeroArtwork's five-petal Bloom geometry and kit tokens.
 * Writes SVG source and email-compatible PNG from the same geometry, using only Node built-ins.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
const css=readFileSync('src/styles/kit-tokens.css','utf8');
const token=name=>{const hex=css.match(new RegExp(`--xoot-${name}: (#[A-Fa-f0-9]{6});`))?.[1];if(!hex)throw Error(`Missing brand token ${name}`);return hex;};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const blooms=[{x:46,y:54,s:78,p:'lilac',center:'neutral-0'},{x:125,y:50,s:62,p:'petal',center:'honey-mid'},{x:195,y:57,s:82,p:'honey',center:'blush-500'},{x:270,y:47,s:57,p:'mist',center:'neutral-0'}];
const width=320,height=100,scale=2,petal='M -17 -28 A 17 17 0 0 1 17 -28 L 17 -4 Q 17 5 8 5 L -8 5 Q -17 5 -17 -4 Z';
const angles=[0,72,144,216,288];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><!-- Xoot handoff Bloom: src/components/xoot/HeroArtwork.tsx; colours: src/styles/kit-tokens.css -->${blooms.map(b=>`<g transform="translate(${b.x} ${b.y}) scale(${b.s/100})">${angles.map((a,i)=>`<path d="${petal}" transform="rotate(${a})" fill="${token(b.p+'-mid')}" opacity="${i%2?.9:1}"/>`).join('')}<circle r="13" fill="${token(b.center)}"/></g>`).join('')}</svg>\n`;
writeFileSync('public/images/xoot-mail-flowers.svg',svg);
const inside=(x,y)=>{
  if(x< -17||x>17||y< -45||y>5)return false;
  if(y< -28)return x*x+(y+28)**2<=17**2;
  if(y> -4&&Math.abs(x)>8)return (Math.abs(x)-8)**2+(y+4)**2<=9**2;
  return true;
};
const pixels=Buffer.alloc(width*scale*height*scale*4),supersample=3;
const paint=(target,colour,alpha)=>{const out=alpha+target[3]*(1-alpha);for(let c=0;c<3;c++)target[c]=(colour[c]*alpha+target[c]*target[3]*(1-alpha))/out;target[3]=out;};
for(let y=0;y<height*scale;y++)for(let x=0;x<width*scale;x++){
  const sum=[0,0,0,0];
  for(let sy=0;sy<supersample;sy++)for(let sx=0;sx<supersample;sx++){
    const sample=[0,0,0,0],px=(x+(sx+.5)/supersample)/scale,py=(y+(sy+.5)/supersample)/scale;
    for(const b of blooms){const bx=(px-b.x)*100/b.s,by=(py-b.y)*100/b.s;
      angles.forEach((a,i)=>{const r=a*Math.PI/180;if(inside(bx*Math.cos(r)+by*Math.sin(r),-bx*Math.sin(r)+by*Math.cos(r)))paint(sample,rgb(token(b.p+'-mid')),i%2?.9:1);});
      if(bx*bx+by*by<=169)paint(sample,rgb(token(b.center)),1);
    }
    for(let c=0;c<3;c++)sum[c]+=sample[c]*sample[3];sum[3]+=sample[3];
  }
  const at=(y*width*scale+x)*4;for(let c=0;c<3;c++)pixels[at+c]=sum[3]?Math.round(sum[c]/sum[3]):0;
  pixels[at+3]=Math.round(255*sum[3]/supersample**2);
}
const crc32=buffer=>{let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
const chunk=(type,data)=>{const bytes=Buffer.concat([Buffer.from(type),data]),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(bytes));return Buffer.concat([length,bytes,crc]);};
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width*scale);ihdr.writeUInt32BE(height*scale,4);ihdr[8]=8;ihdr[9]=6;
const scanlines=Buffer.alloc((width*scale*4+1)*height*scale);
for(let y=0;y<height*scale;y++)pixels.copy(scanlines,y*(width*scale*4+1)+1,y*width*scale*4,(y+1)*width*scale*4);
writeFileSync('public/images/xoot-mail-flowers.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scanlines,{level:9})),chunk('IEND',Buffer.alloc(0))]));
console.log('Rendered static handoff flowers: 640×200 PNG and matching SVG; no recipient tracking.');
