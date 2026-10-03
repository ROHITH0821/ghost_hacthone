import test from 'node:test';
import assert from 'node:assert/strict';
const luminance=(hex:string)=>{const channels=hex.replace('#','').match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
const contrast=(a:string,b:string)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};
// Ghost White + Ember: paper / mist / fog / ember-soft surfaces against every text-bearing token in globals.css.
test('base text, semantic status, and CTA pairs meet WCAG AA normal text contrast',()=>{
 for(const bg of ['#FFFFFF','#F6F6F3','#EEEFEB','#FFE9E1'])for(const fg of ['#0A0A0C','#55585F','#65686F','#16171B','#C2340E','#0B7342','#A14A08','#3347B8'])assert.ok(contrast(bg,fg)>=4.5,`${fg} on ${bg}`);
 assert.ok(contrast('#FFFFFF','#0A0A0C')>=4.5,'primary CTA: paper on ink');
 assert.ok(contrast('#B6B8BE','#0A0A0C')>=4.5,'inverted band muted text');
});
