import test from 'node:test';
import assert from 'node:assert/strict';
const luminance=(hex:string)=>{const channels=hex.replace('#','').match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
const contrast=(a:string,b:string)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};
test('base text, semantic status, and CTA pairs meet WCAG AA normal text contrast',()=>{
 for(const bg of ['#101716','#18221F','#1C2926'])for(const fg of ['#F2F5F0','#A0B1AB','#BBC9C2','#78DEC5','#F2C879','#F69F98','#8ED4A5','#9CBDF0'])assert.ok(contrast(bg,fg)>=4.5,`${fg} on ${bg}`);
 assert.ok(contrast('#78DEC5','#101716')>=4.5);
});
