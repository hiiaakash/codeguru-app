const { chromium } = require('playwright');const fs=require('fs');const CH=JSON.parse(fs.readFileSync(__dirname+'/master_chapters.json','utf8'));
const LIST=[["master.pdf","AI/ML + Python Master Book","📘","master-aiml"],["Python_Master_Book_Hinglish.pdf","Python Master Book","🐍","cheat-python"],["SQL_Master_Book_Hinglish.pdf","SQL Master Book","🗄️","cheat-sql"],["Git_Master_Book_Hinglish.pdf","Git Master Book","🌿","cheat-git"],["Docker_Deployment_Master_Book_Hinglish.pdf","Docker & Deployment Master Book","🐳","cheat-docker"],["AI_LLM_Master_Book_Hinglish.pdf","AI & LLM Master Book","🤖","cheat-ai-llm"],["FastAPI_Backend_Master_Book_Hinglish.pdf","FastAPI Backend Master Book","⚡","cheat-fastapi"],["Node_Express_Master_Book_Hinglish.pdf","Node & Express Master Book","🟩","cheat-node"],["JavaScript_Master_Book_Hinglish.pdf","JavaScript Master Book","🟨","cheat-js"],["React_Master_Book_Hinglish.pdf","React Master Book","⚛️","cheat-react"]];
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(800);
let out='';
for(const [f,name,icon,id] of LIST){
 const pk=await p.evaluate(async([f,name,icon,id,CH])=>{const buf=await (await fetch('_tmp/'+f)).arrayBuffer();const pk=await CG_PDF.build(buf,{lang:'hinglish',name,chapters:f==='master.pdf'?CH:undefined,verify:(c)=>CG_TEST.runCode('python',c,'',null)});pk.id=id;pk.role.icon=icon;pk.stages.forEach((s,i)=>{s.id=id+'-'+(i+1)});return pk},[f,name,icon,id,CH]);
 const sum=pk.stages.reduce((a,s)=>{a.l+=s.lessons.length;a.q+=s.quiz.length;a.iq+=s.iq.length;a.pr+=s.practice.length;a.t+=s.teach.length;return a},{l:0,q:0,iq:0,pr:0,t:0});
 console.log(name,'| stages',pk.stages.length,JSON.stringify(sum),'|',pk.stages.map(s=>s.title.slice(0,30)).join(' / ').slice(0,260));
 out+='CG_BOOK('+JSON.stringify(pk)+');\n';
}
fs.writeFileSync('/home/claude/codeguru/www/packs/books.js',out);console.log('errors',errs,'size KB',Math.round(out.length/1024));await b.close()})();
