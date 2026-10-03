"use client";
// Mounted only by scripts/ui-review.mjs; never a production route.
import { useSearchParams } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { DashboardShell } from '@/components/dashboard/shell/DashboardShell';
import { OverviewPageClient } from '@/components/dashboard/overview/OverviewPageClient';
import { AuditsPageClient } from '@/components/dashboard/audits/AuditsPageClient';
import { SitesPageClient } from '@/components/dashboard/sites/SitesPageClient';
import { FixesPageClient } from '@/components/dashboard/fixes/FixesPageClient';
import EarlyAccessPage from '@/app/early-access/page';
import { ClientDetailPageClient } from '@/components/dashboard/clients/ClientDetailPageClient';
import { ClientsPageClient } from '@/components/dashboard/clients/ClientsPageClient';
import { BrandingPageClient } from '@/components/dashboard/branding/BrandingPageClient';
import { ComparisonsPageClient } from '@/components/dashboard/comparisons/ComparisonsPageClient';
import { PlanPageClient } from '@/components/dashboard/plan/PlanPageClient';
import { SettingsPageClient } from '@/components/dashboard/settings/SettingsPageClient';
import { IntelligenceReportView } from '@/components/results/IntelligenceReportView';
import { MissionDashboard } from '@/components/mission/MissionDashboard';
import type { GhostReport } from '@/lib/types';
export const summary={primaryPlanId:'agency_2999' as const,planBadge:'Agency',entitlementLabel:'Agency workspace',freeScansUsed:1,freeScanAvailable:false,rescansRemaining:2,rescansExpiresAt:null,auditsUsedPeriod:3,auditsLimit:30,periodResetAt:null};
const user={id:'fixture-user',email:'alex@example.test',createdAt:new Date('2026-01-01'),accessStatus:'approved' as const};
const report:GhostReport={id:'fixture-audit',url:'https://studio.example',domain:'studio.example',score:68,scoreBreakdown:{version:'2',value:68,band:'NeedsImprovement',dimensions:[{id:'information',label:'Information clarity',weight:0.2,value:68,contribution:14,checks:[{id:'package',label:'Package inclusions are visible',points:0,passed:false,evidence:'The services page says Contact for quote.'}]}]},scannedAt:'2026-09-10T10:00:00Z',businessUnderstanding:{businessType:'Independent salon',targetAudience:'Customers looking for bridal styling',primaryGoal:'Request a consultation',customerExpectations:['Compare services','Understand package inclusions','Request a quote']},journey:[{id:'flow',label:'Compare bridal services',description:'A simulated visitor reviewed the services page.',hasLeak:true,leakReason:'Package inclusions were not available.'}],leaks:[{id:'leak',title:'Explain what the bridal package includes',severity:'high',whatIsWrong:'The services page only says “Contact for quote”.',whyCustomersLeave:'Visitors may struggle to compare the service with alternatives.',impact:'Observed in one AI simulation; actual conversion impact is unknown.',howToFix:'Publish a short, factual list of package inclusions.',category:'Pricing clarity'}],fixes:[{id:'fix',category:'Price Card',title:'Make your package easier to compare',description:'Replace bracketed details with verified business information before publishing.',content:'Bridal styling package\nIncludes: [confirmed services]\nFrom: [confirmed starting price]\nRequest a consultation',icon:'💰'}]};
const ClientDetail=()=> <ClientDetailPageClient client={{id:'fixture-client',name:'Example Studio',primaryDomain:'studio.example',referenceId:null,archivedAt:null,faviconUrl:'',latestScore:68,criticalCount:1,latestMissionId:'fixture-audit',latestMissionStatus:'complete',lastScannedAt:new Date('2026-09-10'),siteId:'fixture-site',defaults:null,workspaceId:'fixture-workspace'}} audits={[]} fixes={[]}/>;
const pages={'client-detail':ClientDetail,overview:OverviewPageClient,audits:AuditsPageClient,sites:SitesPageClient,fixes:FixesPageClient,clients:ClientsPageClient,branding:BrandingPageClient,comparisons:ComparisonsPageClient,plan:PlanPageClient,settings:SettingsPageClient};
export default function UIFixture(){const params=useSearchParams();const name=params.get('screen')??'overview';const Page=pages[name as keyof typeof pages]??OverviewPageClient;
return <AuthProvider initialUser={user}>{name==='early-access'?<EarlyAccessPage/>:name==='report'?<main id="main-content" className="product-container py-12"><IntelligenceReportView report={report}/></main>:name==='mission'?<MissionDashboard mission={{id:'fixture-audit',url:report.url,domain:report.domain,status:'running',currentStage:'testing',stageProgress:42,personas:[],startedAt:report.scannedAt,progressLog:[{ts:report.scannedAt,stage:'testing',message:'Reviewing the bridal consultation journey'}]}}/>:<DashboardShell user={user} planSummary={summary} comparisonsNavVisible isAgencyUser><Page/></DashboardShell>}</AuthProvider>;
}
