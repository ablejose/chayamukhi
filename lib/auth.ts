const COOKIE_NAME = "chayamukhi_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;
function b64urlEncode(b: Uint8Array){ let s=""; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64urlDecode(str:string){ const pad=(4-(str.length%4))%4; const b=str.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat(pad); const bin=atob(b); const o=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)o[i]=bin.charCodeAt(i); return o; }
async function hmac(secret:string,data:string){ const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(data))); }
function eq(a:string,b:string){ if(a.length!==b.length) return false; let r=0; for(let i=0;i<a.length;i++) r|=a.charCodeAt(i)^b.charCodeAt(i); return r===0; }
export const ADMIN_COOKIE = COOKIE_NAME; export const SESSION_MAX_AGE = MAX_AGE_SEC;
export async function createSessionToken(secret:string){ const p=b64urlEncode(new TextEncoder().encode(JSON.stringify({exp:Date.now()+MAX_AGE_SEC*1000}))); return p+"."+b64urlEncode(await hmac(secret,p)); }
export async function verifySessionToken(token:string|undefined,secret:string){ if(!token||!secret) return false; const [p,s]=token.split("."); if(!p||!s) return false; if(!eq(s,b64urlEncode(await hmac(secret,p)))) return false; try{ const d=JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as {exp?:number}; return typeof d.exp==="number"&&d.exp>Date.now(); }catch{ return false; } }
