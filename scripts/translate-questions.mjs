#!/usr/bin/env node
import fs from "node:fs/promises";
const INPUT="questions.json", OUTPUT="questions.json";
const MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const API="https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent";
const BATCH_SIZE=Number(process.env.TRANSLATION_BATCH_SIZE||20);
const CONCURRENCY=Number(process.env.TRANSLATION_CONCURRENCY||2);
const MAX_RETRIES=5;
if(!process.env.GEMINI_API_KEY){console.error("GEMINI_API_KEY is required.");process.exit(1);}
function en(v){return v&&typeof v==="object"&&!Array.isArray(v)?(v.en??Object.values(v)[0]??""):(v??"");}
function clean(q){return{category:en(q.category),topic:en(q.topic),difficulty:en(q.difficulty),question:en(q.question),options:(Array.isArray(q.options)?q.options:[]).map(en),answer:Number(q.answer),explanation:en(q.explanation),fixedOrder:Boolean(q.fixedOrder),subcategory:en(q.subcategory)};}
function prompt(batch){return[
"You are a professional medical and nursing translator.",
"Translate these nursing exam questions from English into Modern Standard Arabic and natural professional Hindi.",
"Return ONLY valid JSON: an array with exactly one output object for each input object, same order.",
"Translate EVERY text field: category, topic, difficulty, question, every option, explanation, and subcategory.",
"Keep English unchanged under en.",
"Never reorder options. Preserve the numeric answer index exactly.",
"Translate empty strings as empty strings.",
"Preserve medical abbreviations and clinical terminology such as ECG, MI, CPR, ABCs, GCS, CT, MRI, INR, IV, BP, TB and CN where appropriate.",
"Keep drug names, syndromes, scores and technical terms accurate.",
"Use professional clinical wording.",
"Output schema for each item:",
JSON.stringify({category:{en:"",ar:"",hi:""},topic:{en:"",ar:"",hi:""},difficulty:{en:"",ar:"",hi:""},question:{en:"",ar:"",hi:""},options:{en:[""],ar:[""],hi:[""]},answer:0,explanation:{en:"",ar:"",hi:""},fixedOrder:false,subcategory:{en:"",ar:"",hi:""}}),
"Input:",
JSON.stringify(batch)
].join("\\n");}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(batch){
 const body={contents:[{role:"user",parts:[{text:prompt(batch)}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}};
 for(let a=0;a<=MAX_RETRIES;a++)try{
  const res=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify(body)});
  const raw=await res.text(); if(!res.ok)throw new Error("HTTP "+res.status+": "+raw.slice(0,1000));
  const data=JSON.parse(raw), text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
  if(!text)throw new Error("Gemini returned no text."); return JSON.parse(text);
 }catch(e){if(a===MAX_RETRIES)throw e;const d=Math.min(30000,1500*2**a);console.warn("Retrying in "+d+" ms: "+e.message);await sleep(d);}
}
function validate(src,out){
 if(!Array.isArray(out)||out.length!==src.length)throw new Error("Translation batch length mismatch.");
 out.forEach((x,i)=>{
  const o=src[i];
  if(Number(x.answer)!==Number(o.answer))throw new Error("Answer changed at item "+i);
  if(!x.question?.en||!x.question?.ar||!x.question?.hi)throw new Error("Question translation missing at item "+i);
  for(const l of ["en","ar","hi"])if(!Array.isArray(x.options?.[l])||x.options[l].length!==o.options.length)throw new Error("Option mismatch at item "+i);
  for(const f of ["category","topic","difficulty","subcategory"]){
   if(!x[f]||typeof x[f]!=="object")throw new Error("Missing "+f+" at item "+i);
   if(o[f]==="" ? (x[f].en!==""||x[f].ar!==""||x[f].hi!=="") : (!x[f].ar||!x[f].hi))throw new Error("Bad "+f+" translation at item "+i);
  }
  if(o.explanation!==""&&(!x.explanation?.ar||!x.explanation?.hi))throw new Error("Explanation translation missing at item "+i);
 });
}
async function main(){
 const raw=JSON.parse(await fs.readFile(INPUT,"utf8")); if(!Array.isArray(raw))throw new Error("questions.json must be an array.");
 const src=raw.map(clean), out=new Array(src.length); let next=0;
 async function worker(id){while(true){const start=next;next+=BATCH_SIZE;if(start>=src.length)return;const batch=src.slice(start,start+BATCH_SIZE);console.log("Worker "+id+": "+(start+1)+"-"+(start+batch.length)+"/"+src.length);const tr=await call(batch);validate(batch,tr);tr.forEach((q,i)=>out[start+i]=q);}}
 await Promise.all(Array.from({length:Math.max(1,CONCURRENCY)},(_,i)=>worker(i+1)));
 if(out.some(x=>!x))throw new Error("Some questions were not translated.");
 await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+"\\n","utf8"); console.log("Completed "+out.length+" questions.");
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
