import type { MetadataRoute } from 'next';
const BASE='https://systemfriction.org';
export default function robots():MetadataRoute.Robots{return{rules:[{userAgent:'*',allow:'/',disallow:['/api/','/root']},{userAgent:['GPTBot','ClaudeBot','PerplexityBot','Google-Extended'],allow:['/','/field','/systems','/archive','/falsification','/optionality','/governance','/authority','/agents','/identity','/models','/genai','/llms.txt','/llms-full.txt','/ai-index.json','/field-schema.json'],disallow:['/api/','/root']}],sitemap:`${BASE}/sitemap.xml`,host:BASE};}
