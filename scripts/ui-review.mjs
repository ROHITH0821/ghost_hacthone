// Requires a local development server. All API calls are intercepted; no email,
// audit, purchase, or database mutation is sent. Temporary route removed in finally.
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.UI_REVIEW_URL??'http://127.0.0.1:3010';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local server required');
const routeDir=new URL('../src/app/qa-review-temp/',import.meta.url);
const output=process.env.UI_REVIEW_OUTPUT??'/tmp/ghost-ui-review';
await mkdir(output,{recursive:true});
await mkdir(routeDir); // Fail if an existing route would be overwritten.
let browser;
try{
 await writeFile(new URL('page.tsx',routeDir),`import { Suspense } from 'react'; import UIFixture from '../../../tests/ui-fixture'; export default function Page(){return <Suspense><UIFixture/></Suspense>}`);
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 let failure=false,empty=false;
 const stamp='2026-09-10T10:00:00Z';
 const audit={id:'fixture-audit',url:'https://studio.example',domain:'studio.example',status:'complete',auditType:'deep',score:68,criticalCount:1,highCount:1,shopperCount:3,createdAt:stamp,updatedAt:stamp,pdfUrl:null,progress:100,currentStage:'generating',stageProgress:100,siteId:'fixture-site',hasIntel:true,intelStatus:'complete',scoreDelta:4,clientName:'Example Studio',topLeakTitle:'Explain package inclusions',topLeakSeverity:'high',topLeakPage:'Services'};
 const site={id:'fixture-site',canonicalDomain:'studio.example',displayName:'Example Studio',archivedAt:null,faviconUrl:null,entitlementLabel:'Full Intelligence',planId:'deep_999',latestScore:68,scoreDelta:4,unresolvedCount:1,lastScannedAt:stamp,latestMissionId:audit.id,latestMissionStatus:'complete',hasPdf:false,rescansRemaining:2,rescansExpiresAt:null};
 const fix={id:'fixture-fix',userId:'fixture-user',siteId:site.id,missionId:audit.id,sourceKey:'test',leakId:'leak',fixId:'fix',kind:'fix',title:'Explain package inclusions',severity:'high',category:'Pricing clarity',pageUrl:site.canonicalDomain,shopperQuote:'I cannot compare the package inclusions.',fixContent:'Add [confirmed services] to the package page.',status:'recommended',note:null,implementedAt:null,verifiedAt:null,verifiedByMissionId:null,createdAt:stamp,updatedAt:stamp,siteDomain:site.canonicalDomain};
 const misses=[];let submittedAudit;
 await context.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data={
   '/api/dashboard/overview':{missions:empty?[]:[audit],fixCounts:{recommended:empty?0:1,planned:0,implemented:0,verified:0,dismissed:0},runningQueue:[]},
   '/api/dashboard/audits':{audits:empty?[]:[audit],clients:[]},
   '/api/dashboard/sites/list':{sites:empty?[]:[site]},
   '/api/dashboard/fixes/list':{fixes:empty?[]:[fix],sites:[{id:site.id,domain:site.canonicalDomain}],hasPaidAccess:true},
   '/api/dashboard/clients/list':{clients:[]},'/api/dashboard/clients':{clients:[]},
   '/api/dashboard/branding/bootstrap':{workspaceName:'Example Agency',profile:null},
   '/api/dashboard/comparisons/bootstrap':{initial:{pairs:[],comparison:null,verifiedFixes:[],sites:[]}},
   '/api/dashboard/plan':{purchases:[]},
   '/api/dashboard/audit-options':{options:[{id:'deep',planId:'deep_999',auditType:'deep',title:'Deep audit',description:'Review the full customer journey',available:true,canUse:true,price:0}]},
   '/api/auth/me':{user:null},'/api/site-preview':{imageUrl:null},
  }[path];
  if(path==='/api/auth/send-otp')return route.fulfill({json:{success:true,message:'Fixture code sent'}});
  if(path==='/api/analyze')submittedAudit=route.request().postDataJSON();
  if(route.request().method()!=='GET')return route.fulfill({status:500,json:{error:'Fixture: request failed. Try again.'}});
  if(data===undefined){misses.push(path);return route.fulfill({status:501,json:{error:'Unmapped fixture request'}});}
  await route.fulfill({status:failure?500:200,json:failure?{error:'Fixture service unavailable'}:data});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);let layoutChecks=0;const errors=[];page.on('pageerror',err=>errors.push(err.message));page.on('console',msg=>{if(msg.type()==='error'&&!/Failed to load resource/.test(msg.text()))errors.push(msg.text());});
 for(const width of (process.env.UI_REVIEW_WIDTHS??"1440,1024,768,390").split(",").map(Number)){
  await page.setViewportSize({width,height:900});
  for(const screen of (process.env.UI_REVIEW_SCREENS??'overview,audits,sites,fixes,clients,client-detail,branding,comparisons,plan,settings,report,mission,early-access').split(',')){
   await page.goto(`${base}/qa-review-temp?screen=${screen}`,{waitUntil:'networkidle'});
   await page.locator('main').waitFor();
   await page.getByRole('status',{name:'Loading workspace',exact:true}).waitFor({state:'detached'});
   await page.waitForTimeout(300);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)){await page.screenshot({path:`${output}/overflow-${screen}-${width}.png`,fullPage:true});console.log(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,50)})).slice(0,15)));}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen}: overflow at ${width}`);
   if(screen==='report'){await page.getByText('How this score was calculated',{exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Expanded score fits');await page.getByText('How this score was calculated',{exact:true}).click();}
   assert(!(await page.getByText('Couldn’t load',{exact:false}).count()),`${screen}: fixture failed`);
   if(width===1440||width===390)await page.screenshot({path:`${output}/${screen}-${width}.png`,fullPage:true});
   layoutChecks++;console.log(`Layout OK: ${screen} ${width}`);
  }
 }
 await page.goto(`${base}/qa-review-temp?screen=audits`,{waitUntil:'networkidle'});
 assert(await page.getByRole('link',{name:/view report/i}).count()>0,'Mobile audit report link');
 await page.getByRole('button',{name:/search & filters/i}).click();assert(await page.getByRole('searchbox').count()>0,'Mobile filters expand');
 await page.goto(`${base}/qa-review-temp?screen=sites`,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Archive',exact:true}).click();await page.locator('main').getByRole('alert').waitFor();assert(await page.getByRole('button',{name:'Archive',exact:true}).isVisible(),'Failed archive preserves site');
 await page.goto(`${base}/qa-review-temp?screen=fixes`,{waitUntil:'networkidle'});await page.getByRole('combobox',{name:'Update status',exact:true}).selectOption('planned');await page.locator('main').getByRole('alert').waitFor();assert.equal(await page.getByRole('combobox',{name:'Update status',exact:true}).inputValue(),'recommended','Failed update preserves status');
 await page.goto(`${base}/qa-review-temp?screen=settings`,{waitUntil:'networkidle'});
 const compact=page.getByRole('checkbox').first();await compact.check();await page.reload({waitUntil:'networkidle'});assert(await page.getByRole('checkbox').first().isChecked(),'Preferences persist');
 await page.getByRole('button',{name:/new audit/i}).first().click();
 await page.getByRole('dialog').waitFor();
 for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),'Modal traps focus');}
 await page.screenshot({path:`${output}/audit-dialog-mobile.png`});
 await page.keyboard.press('Escape');assert(await page.getByRole('dialog').count()===0,'Escape closes modal');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'New audit','Closing restores focus');
 await page.getByRole('button',{name:/new audit/i}).first().click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel(/website url/i).fill('studio.example');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Continue',exact:true}).click();await dialog.getByRole('button',{name:/deep audit/i}).waitFor();await dialog.getByRole('button',{name:'Continue',exact:true}).click();await dialog.getByLabel(/primary.*goal/i).fill('More bridal consultations');await dialog.getByRole('button',{name:'Continue',exact:true}).click();await dialog.getByRole('button',{name:/start.*audit/i}).click();await dialog.getByRole('alert').waitFor();assert.equal(submittedAudit.url,'https://studio.example/');assert.equal(submittedAudit.context.primaryGoal,'More bridal consultations');await page.keyboard.press('Escape');
 empty=true;await page.goto(`${base}/qa-review-temp?screen=overview`,{waitUntil:'networkidle'});await page.screenshot({path:`${output}/overview-empty.png`,fullPage:true});
 failure=true;await page.goto(`${base}/qa-review-temp?screen=audits`,{waitUntil:'networkidle'});await page.getByRole('button',{name:/try again/i}).waitFor({timeout:20000});
 failure=false;await page.getByRole('button',{name:/try again/i}).click();await page.getByRole('button',{name:/try again/i}).waitFor({state:'detached'});

 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/login']){await page.goto(`${base}${path}`,{waitUntil:'networkidle'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow at ${width}`);await page.screenshot({path:`${output}/${path==='/'?'landing':'login'}-${width}.png`,fullPage:true});layoutChecks++;}
 }
 await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).waitFor();await page.getByRole('button',{name:'Close navigation'}).click();
 await page.getByLabel('Your website',{exact:true}).fill('studio.example');await page.getByRole('button',{name:'Audit my site'}).click();await page.waitForURL('**/login?**');assert(new URL(page.url()).searchParams.get('redirect').includes('studio.example'),'Website retained through login');
 await page.getByLabel('Email address',{exact:true}).fill('alex@example.test');await page.getByRole('button',{name:/send.*code/i}).click();await page.getByRole('textbox',{name:'Code digit 1',exact:true}).waitFor();await page.getByRole('textbox',{name:'Code digit 1',exact:true}).evaluate(el=>{const clipboardData=new DataTransfer();clipboardData.setData('text','123456');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));});await page.locator('main').getByRole('alert').waitFor();assert(await page.getByRole('textbox',{name:'Code digit 6',exact:true}).isVisible(),'OTP failure remains recoverable');await page.screenshot({path:`${output}/login-otp-320.png`});
 assert.deepEqual(misses,[],'All API calls covered');assert.deepEqual(errors,[],'No browser exceptions');
 console.log(`PASS: ${layoutChecks} responsive layouts; mobile filters/report access; preferences; dialog focus; four-step audit payload; archive/status failure recovery; empty/error states.`);
}finally{await browser?.close();await rm(routeDir,{recursive:true,force:true});}
