import { Globe2, ScanLine, Wrench } from "lucide-react";
export function ProgramSteps() {
  return <section id="program" className="section-pad product-section"><div className="product-container">
    <div className="grid gap-5 md:grid-cols-2 md:items-end"><div><p className="eyebrow mb-4">From website to action</p><h2 className="display-lg font-medium">Know what to fix.<br />And where to start.</h2></div><p className="max-w-md text-muted-light md:justify-self-end">Built for the person improving the website. Clear findings, concrete recommendations, and a way to track what changed.</p></div>
    <div className="mt-12 grid gap-8 md:grid-cols-3">{[
      {icon:Globe2,title:'Start with your site',body:'Add your public website and the goal that matters: more enquiries, easier booking, or a clearer path to purchase.'},
      {icon:ScanLine,title:'See it through customer eyes',body:'Ghost reads accessible pages and simulates relevant customer journeys, looking for unclear pricing, missing trust signals, and friction.'},
      {icon:Wrench,title:'Turn findings into improvements',body:'Review the evidence, use the suggested copy, and track your fixes. An eligible re-scan helps you compare changes.'}
    ].map(({icon:Icon,title,body},i)=><article key={title} className="border-t border-border pt-6"><div className="mb-6 flex items-center justify-between"><Icon className="h-5 w-5 text-violet" /><span className="font-mono text-xs text-muted">0{i+1}</span></div><h3 className="font-heading text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-light">{body}</p></article>)}</div>
  </div></section>;
}
