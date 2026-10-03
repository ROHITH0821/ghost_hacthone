import test from 'node:test';
import assert from 'node:assert/strict';
import { anthropic } from '../src/lib/ghost-engine/client';
import { runAudit } from '../src/lib/ghost-engine/pipeline';
import { rankCompetitors } from '../src/lib/competitor-intelligence/rank';
import { scoreThemesFromPages } from '../src/lib/competitor-intelligence/score-themes';
import { THEME_GROUPS } from '../src/lib/competitor-intelligence/theme-groups';
import { pack, flow, journey, report } from './fixtures';

process.env.ANTHROPIC_API_KEY='test-not-a-real-key';

test('full audit composes distinct stages, owner context and supported fixes through mocked transport',async()=>{
 const client=anthropic();const original=client.messages.parse;
 const requests:Array<{system:string;messages:unknown}>=[];
 const outputs=[{flows:[flow]},journey,report,{leak_rank:91,addresses:'Pricing clarity',fix_type:'faq',title:'Package FAQ',rationale:'Explain inclusions',usage_hint:'Add to Services after confirming brackets',variants:['What is included? [Confirm package inclusions]']}];
 Object.defineProperty(client.messages,'parse',{configurable:true,value:async(request:typeof requests[number])=>{requests.push(request);return {parsed_output:outputs.shift()};}});
 try {
  const result=await runAudit(pack,{}, {ownerContext:{primaryGoal:'Explain package inclusions'}});
  assert.equal(result.fixes[0].leak_rank,1);assert.equal(result.fixes.length,1);
  assert.equal(result.report.revenue_estimate.monthly_high,0);
  assert.equal(requests.length,4);
  assert.ok(requests.every(r=>!r.system.includes('Explain package inclusions')));
  assert.ok(requests.every(r=>JSON.stringify(r.messages).includes('Explain package inclusions')));
  assert.match(requests[1].system,/not an executed browser session/);
 } finally {Object.defineProperty(client.messages,'parse',{value:original,configurable:true});}
});

test('explicitly rejected competitors never re-enter the chosen set',async()=>{
 const client=anthropic(),original=client.messages.parse;
 Object.defineProperty(client.messages,'parse',{configurable:true,value:async()=>({parsed_output:{ranked:[{url:'https://directory.example',relevanceScore:5,reject:true,rejectReason:'Directory'}]}})});
 try {assert.deepEqual(await rankCompetitors({ownerDomain:'studio.example',contextPack:pack,candidates:[{url:'https://directory.example',source:'search',name:'Directory'}]}),[]);}
 finally {Object.defineProperty(client.messages,'parse',{value:original,configurable:true});}
});

test('theme evidence rejects invented quotes and source URLs',async()=>{
 const client=anthropic(),original=client.messages.parse;
 const theme=THEME_GROUPS[0].id;
 Object.defineProperty(client.messages,'parse',{configurable:true,value:async()=>({parsed_output:{siteName:'Studio',themes:[{themeId:theme,status:'observed',score:99,quote:'500 five-star reviews',sourceUrl:'https://fake.example'}]}})});
 try {
  const scores=await scoreThemesFromPages({siteUrl:'https://studio.example',siteName:'Studio',pages:[{url:'https://studio.example',title:'Home',metaDescription:'',textExcerpt:'Bridal makeup packages. Contact for quote.'}]});
  assert.equal(scores.themes[0].score,null);assert.equal(scores.themes[0].status,'not_observed');assert.equal(scores.themes[0].quote,null);
 } finally {Object.defineProperty(client.messages,'parse',{value:original,configurable:true});}
});
