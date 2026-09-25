/**
 * Security rules, tested against the emulator. Nothing here touches the real
 * project — it seeds and mutates documents in a throwaway local Firestore.
 *
 * Written because "Mark received" on the buyer page had never worked for a
 * real buyer and nothing in the client explained it: the button awaits its
 * write, catches, and shows a message. The rule was refusing it, and reading
 * the rule was the only way to find that. So now it is a test.
 *
 * The trap it exists to catch: the whole order flow gets exercised in ONE
 * browser, where the buyer and the artisan are the same anonymous uid, so
 * `ownedByMe(artisanId)` passes and the buyer's write looks allowed. It is
 * only a SECOND identity that tells the truth, which is what this does.
 *
 *   npx firebase emulators:exec --only firestore "node tools/rules.test.mjs"
 */
// Rules test against the LOCAL emulator. Nothing here touches the real project.
const PROJECT='sih2026-cc444'
const BASE=`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url')
// The emulator accepts unsigned tokens; this is how you act as a given uid.
const tok=uid=>`${b64({alg:'none',typ:'JWT'})}.${b64({iss:`https://securetoken.google.com/${PROJECT}`,aud:PROJECT,sub:uid,user_id:uid,auth_time:1,iat:1,exp:9999999999,firebase:{identities:{},sign_in_provider:'anonymous'}})}.`
const OWNER='owner'   // emulator superuser, bypasses rules -- used only to seed

const S=v=>({stringValue:v}), I=v=>({integerValue:String(v)})
async function seed(id, fields){
  const r=await fetch(`${BASE}/orders?documentId=${id}`,{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${OWNER}`},
    body:JSON.stringify({fields})})
  if(!r.ok) throw new Error('seed failed '+r.status+' '+(await r.text()).slice(0,200))
}
async function patch(id, uid, fields){
  const mask=Object.keys(fields).map(k=>`updateMask.fieldPaths=${k}`).join('&')
  const r=await fetch(`${BASE}/orders/${id}?${mask}`,{method:'PATCH',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok(uid)}`},
    body:JSON.stringify({fields})})
  return r.status
}
const ARTISAN='uid_artisan_real', BUYER='uid_buyer_real', STRANGER='uid_stranger'
const base=n=>({id:S(n),productId:S('p_test'),status:S('shipped'),quantity:I(1),
  unitPrice:I(500),total:I(500),createdAt:I(1),updatedAt:I(1),artisanId:S(ARTISAN),buyerName:S('Test Buyer')})

let pass=0,fail=0
const check=(label,got,want)=>{const ok=got===want;ok?pass++:fail++
  console.log(`  ${ok?'PASS':'FAIL'}  ${label}  (HTTP ${got}, expected ${want})`)}

// --- a NEW order, carrying buyerId
await seed('t_new',{...base('t_new'),buyerId:S(BUYER)})
check('buyer marks his own order received',
  await patch('t_new',BUYER,{status:S('delivered'),updatedAt:I(2)}),200)

await seed('t_new2',{...base('t_new2'),buyerId:S(BUYER)})
check('a STRANGER cannot mark it received',
  await patch('t_new2',STRANGER,{status:S('delivered'),updatedAt:I(2)}),403)

await seed('t_new3',{...base('t_new3'),buyerId:S(BUYER)})
check('artisan can still move her own order',
  await patch('t_new3',ARTISAN,{status:S('delivered'),updatedAt:I(2)}),200)

await seed('t_new4',{...base('t_new4'),buyerId:S(BUYER)})
check('buyer cannot REPRICE while marking received',
  await patch('t_new4',BUYER,{status:S('delivered'),updatedAt:I(2),unitPrice:I(1)}),403)

await seed('t_new5',{...base('t_new5'),buyerId:S(BUYER)})
check('buyer cannot skip placed -> delivered',
  await patch('t_new5',BUYER,{status:S('accepted'),updatedAt:I(2)}),403)

// --- an OLD order with no buyerId: must still work, or today's orders break
await seed('t_old',base('t_old'))
check('legacy order with no buyerId still markable',
  await patch('t_old',BUYER,{status:S('delivered'),updatedAt:I(2)}),200)

// --- the note clause must survive
await seed('t_note',{...base('t_note'),buyerId:S(BUYER)})
check('noteLocal write still allowed',
  await patch('t_note',STRANGER,{noteLocal:S('hindi text')}),200)

console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
