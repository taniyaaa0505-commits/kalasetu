/**
 * Which listing model is actually willing today, per key.
 *
 * Sends the REAL body — photo, responseSchema, thinkingBudget 0 — because the
 * cheap checks lie: `models.list` happily lists gemini-3.5-flash while every
 * generateContent call to it answers 503, and gemini-3.5-flash-lite only fails
 * once a schema is attached. Run it before a demo and put the fastest model
 * that returns 200 on every key at the front of LISTING_MODELS.
 *
 *   node tools/probe-listing.mjs
 */
import fs from 'node:fs'
const env = fs.readFileSync('.env','utf8')
const KEYS = /^VITE_GEMINI_API_KEY=(.*)$/m.exec(env)[1].trim().split(',').map(s=>s.trim()).filter(Boolean)
const b64 = fs.readFileSync('public/demo-before.jpg').toString('base64')
const SCHEMA={type:'object',properties:{craft:{type:'string'},material:{type:'string'},titleEn:{type:'string'},titleHi:{type:'string'},descriptionEn:{type:'string'},descriptionHi:{type:'string'},keywords:{type:'array',items:{type:'string'}},questions:{type:'array',items:{type:'string'}},handmade:{type:'boolean'},handmadeWhy:{type:'string'}},required:['craft','material','titleEn','titleHi','descriptionEn','descriptionHi','keywords','questions','handmade','handmadeWhy']}
const body={
  systemInstruction:{parts:[{text:'You are helping an Indian artisan list a handmade product for sale online. She spoke to us in Hindi. Always fill in BOTH the English and the Hindi fields.'}]},
  contents:[{role:'user',parts:[{inlineData:{mimeType:'image/jpeg',data:b64}},{text:'The artisan said, in Hindi:\n"""yeh maine haath se banaya hai, mitti ka diya hai"""\n\nWrite the listing.'}]}],
  generationConfig:{responseMimeType:'application/json',responseSchema:SCHEMA,temperature:0.4,thinkingConfig:{thinkingBudget:0}},
}
const MODELS=['gemini-3-flash-preview','gemini-3.6-flash','gemini-3.5-flash','gemini-3.5-flash-lite']
for (let ki=0; ki<KEYS.length; ki++){
  const k=KEYS[ki]
  console.log(`\n######## key ${ki+1}/${KEYS.length} (${k.slice(0,6)}…${k.slice(-4)})`)
  for (const m of MODELS){
    const t0=Date.now()
    try{
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`,
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const raw=await r.text()
      const ms=Date.now()-t0
      if(!r.ok){
        let msg=raw.slice(0,150); try{msg=JSON.parse(raw).error.message}catch{}
        console.log(`  ${m.padEnd(24)} ${r.status} (${ms}ms) ${msg.slice(0,110)}`)
        continue
      }
      const j=JSON.parse(raw)
      const parts=j?.candidates?.[0]?.content?.parts??[]
      const txt=parts.map(p=>p?.text).filter(Boolean).join('').trim()
      if(!txt){ console.log(`  ${m.padEnd(24)} 200 (${ms}ms) EMPTY finishReason=${j?.candidates?.[0]?.finishReason}`); continue }
      let o; try{o=JSON.parse(txt)}catch(e){ console.log(`  ${m.padEnd(24)} 200 (${ms}ms) NON-JSON: ${txt.slice(0,120)}`); continue }
      const miss=SCHEMA.required.filter(f=>o[f]===undefined||o[f]==='')
      console.log(`  ${m.padEnd(24)} 200 (${ms}ms) OK titleEn=${JSON.stringify(o.titleEn||'').slice(0,50)} descLen=${(o.descriptionEn||'').length} missing=[${miss}]`)
    }catch(e){ console.log(`  ${m.padEnd(24)} EXC (${Date.now()-t0}ms) ${e.message}`) }
  }
}
