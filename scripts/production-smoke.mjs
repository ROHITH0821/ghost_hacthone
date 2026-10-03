import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.UI_REVIEW_URL??'http://127.0.0.1:3010';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local server required');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 const page=await context.newPage();const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!/Failed to load resource/.test(msg.text()))errors.push(msg.text());});
 await mkdir('/tmp/ghost-ui-review',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/login']){
   const response=await page.goto(base+path,{waitUntil:'networkidle'});
   assert.equal(response.status(),200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} fits ${width}`);
   await page.screenshot({path:`/tmp/ghost-ui-review/production-${path==='/'?'landing':'login'}-${width}.png`,fullPage:true});
  }
 }
 const protectedPath='/dashboard/overview?newAudit=1&url=https%3A%2F%2Fstudio.example';
 const gated=await context.request.get(base+protectedPath,{maxRedirects:0});assert.equal(gated.status(),307);
 const login=new URL(gated.headers().location);assert.equal(login.pathname,'/login');assert.equal(login.searchParams.get('redirect'),protectedPath);
 const qa=await context.request.get(base+'/qa-review-temp',{maxRedirects:0});assert.equal(qa.status(),404,'No fixture route in production');
 const api=await context.request.get(base+'/api/dashboard/overview',{maxRedirects:0});assert.equal(api.status(),401,'Workspace API requires session');
 assert.deepEqual(errors,[]);
 console.log('PASS: production landing/login desktop and mobile, no browser errors, preserved protected redirect, unauthorized API denied, QA route absent.');
}finally{await browser.close();}
