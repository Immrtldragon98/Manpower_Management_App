const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
export function randomSalt(){return hex(crypto.getRandomValues(new Uint8Array(16)).buffer)}
export async function hashPin(pin:string,salt:string){const key=await crypto.subtle.importKey("raw",enc.encode(pin),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:120000},key,256))}
export async function sign(value:string,secret:string){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,enc.encode(value)))}
export async function workerToken(id:number,secret:string){const expires=Date.now()+12*60*60*1000;const value=`${id}.${expires}`;return `${value}.${await sign(value,secret)}`}
export async function verifyWorkerToken(token:string|undefined,secret:string){if(!token)return null;const [id,expires,sig]=token.split(".");if(!id||!expires||!sig||Number(expires)<Date.now())return null;const expected=await sign(`${id}.${expires}`,secret);if(expected!==sig)return null;return Number(id)}
export function cookieValue(request:Request,name:string){const raw=request.headers.get("cookie")||"";return raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)}
export async function adminToken(secret:string){const expires=Date.now()+8*60*60*1000;const value=`admin.${expires}`;return `${value}.${await sign(value,secret)}`}
export async function verifyAdminToken(token:string|undefined,secret:string){if(!token)return false;const [role,expires,sig]=token.split(".");if(role!=="admin"||!expires||!sig||Number(expires)<Date.now())return false;return await sign(`${role}.${expires}`,secret)===sig}
