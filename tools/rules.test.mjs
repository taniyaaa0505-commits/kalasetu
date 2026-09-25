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

// --- products moving onto a real uid when she registers her shop.
//     services/account.ts claimDeviceWork depends on exactly this being
//     allowed for local_ rows and refused for somebody else's.
const PBASE=`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
async function seedP(id, artisan){
  const fields={id:S(id),createdAt:I(1),status:S('draft'),lang:S('hi-IN')}
  if(artisan!==null) fields.artisanId=S(artisan)
  const r=await fetch(`${PBASE}/products?documentId=${id}`,{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${OWNER}`},
    body:JSON.stringify({fields})})
  if(!r.ok) throw new Error('seedP failed '+r.status)
}
async function restamp(id, uid, to){
  const r=await fetch(`${PBASE}/products/${id}?updateMask.fieldPaths=artisanId`,{method:'PATCH',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok(uid)}`},
    body:JSON.stringify({fields:{artisanId:S(to)}})})
  return r.status
}
const HER='uid_her_real', SOMEONE='uid_someone_else'
await seedP('p_local','local_abc123')
check('she can claim her own local_ product on registering',
  await restamp('p_local',HER,HER),200)

await seedP('p_theirs',SOMEONE)
check('she CANNOT steal a product owned by a real uid',
  await restamp('p_theirs',HER,HER),403)

// Not a looseness after all, and worth having written down: reading a field
// that is ABSENT errors inside a rule, and an erroring rule denies. So the
// seven artisan-less products in the live project cannot be updated by
// anybody, ever -- not claimed, not corrected. claimDeviceWork never reaches
// them because it only asks for rows stamped with THIS device's local id.
await seedP('p_none',null)
check('a product with no artisan at all is frozen for everyone',
  await restamp('p_none',HER,HER),403)

console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
