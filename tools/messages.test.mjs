// A buyer writing to her is an event, and the home screen had no subscription
// to it. Counts were computed inside the PRODUCTS subscription, so they only
// refreshed when a product changed — which a new message does not do. She was
// told nothing until something else redrew the screen, and the thing that
// usually did was the same buyer giving up and placing an order.
import { readFileSync } from 'node:fs'

const home = readFileSync('src/screens/Home.tsx', 'utf8')
const chat = readFileSync('src/screens/Chat.tsx', 'utf8')
const svc  = readFileSync('src/services/messages.ts', 'utf8')
const types = readFileSync('src/types.ts', 'utf8')

let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// ---- messages are routed the way orders are ------------------------------
check(/artisanId\?: string/.test(types.slice(types.indexOf('export interface Message'),
                                             types.indexOf('export type OrderStatus'))),
  'a message knows whose work it is about')
check(/artisanId: artisan/.test(svc),
  'and sendMessage stamps it from the product, like placeOrder does')
check(/export function subscribeMyMessages/.test(svc) &&
      /field: 'artisanId', equals: artisan/.test(svc),
  'so her messages can be watched server-side, not by reading the whole shop')

// ---- the home screen actually listens -------------------------------------
check(/subscribeMyMessages\(me, onMessages\)/.test(home),
  'the home screen subscribes to messages live')
// The counting must NOT sit inside the products subscription any more.
const prodSub = home.slice(home.indexOf('subscribeMyProducts'),
                           home.indexOf('subscribeMyMessages'))
check(!/listMessages/.test(prodSub),
  'and no longer counts them inside the products subscription')

// ---- it is announced, like an order --------------------------------------
check(/speak\(t\('newMessageCame'\)/.test(home),
  'a new buyer message is said out loud, because she will not read a badge')
check(/saidMsg\.current === null/.test(home),
  'but never for the backlog already there when she opens the app')

// ---- and the banner clears -----------------------------------------------
// A notification that never goes away is one she stops seeing, and then the
// message that mattered arrives underneath it.
check(/m\.createdAt > lastSeen\(m\.productId\)/.test(home),
  'the banner counts only what she has not opened')
check(/markSeen\(id, latest\.createdAt\)/.test(chat),
  'and opening the conversation is what clears it')
check(/onClick=\{\(\) => nav\('\/messages'\)\}/.test(home),
  'and pressing it goes to the list, exactly as the order banner does')

// ---- a tile of its own, beside orders -------------------------------------
// Messages used to be reachable only from a badge on one product card, which
// meant she had to already know which product a stranger had written about.
const list = readFileSync('src/screens/Messages.tsx', 'utf8')
const app  = readFileSync('src/App.tsx', 'utf8')
check(/label=\{t\('messages'\)\} onClick=\{\(\) => nav\('\/messages'\)\}/.test(home),
  'the home screen has a Messages tile')
check(/grid-cols-3/.test(home),
  'sitting beside "learn how to sell" and orders, not below them')
check(/path="\/messages"/.test(app), 'and the route exists')
check(/subscribeMyMessages/.test(list) && /one entry per conversation/.test(list),
  'the list is one row per conversation, live, like Orders')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
