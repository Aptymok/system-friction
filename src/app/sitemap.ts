import type { MetadataRoute } from 'next';
const BASE='https://systemfriction.org';
export default function sitemap():MetadataRoute.Sitemap{return['','field','systems','archive','falsification','optionality','governance','authority','agents','identity','models','genai'].map((p)=>({url:`${BASE}/${p}`.replace(/\/$/,''),lastModified:new Date(),changeFrequency:'daily' as const,priority:p?0.8:1}));}
