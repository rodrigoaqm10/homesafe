import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const lines=readFileSync(new URL('../.env.local',import.meta.url),'utf8').split(/\r?\n/);const env=Object.fromEntries(lines.filter(x=>x.includes('=')&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}));
const url=env.NEXT_PUBLIC_SUPABASE_URL;const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const auth=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key}});console.log(`Supabase Auth connection: HTTP ${auth.status}`);
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const result=await client.from('community_memberships').select('id').limit(1);
console.log(JSON.stringify({membershipsEndpoint:result.status,errorCode:result.error?.code??null,anonymousVisibleRows:result.count??null}));
if(!auth.ok)process.exitCode=1;

