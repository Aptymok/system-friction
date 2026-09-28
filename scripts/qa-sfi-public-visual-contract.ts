import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
const checks:Array<[string,boolean]>=[];
const check=(name:string,ok:boolean)=>checks.push([name,ok]);

const chrome=read('src/components/public/SfiPublicChrome.tsx');
const globals=read('src/app/globals.css');
const publications=read('src/app/publications/page.tsx');
const publicationCss=read('src/app/publications/publications.css');
const catalog=read('src/app/publications/PublicationsCatalog.tsx');

check('canonical public header exists',chrome.includes('SfiPublicHeader')&&chrome.includes('SFI_PUBLIC_NAV'));
check('canonical public footer exists',chrome.includes('SfiPublicFooter')&&chrome.includes('OBSERVE · CONTRAST · RETURN'));
check('publications reuses canonical public chrome',publications.includes('<SfiPublicHeader active="/publications"/>')&&publications.includes('<SfiPublicFooter/>'));
check('institutional typography tokens are global',globals.includes('--sfi-h1-size')&&globals.includes('--sfi-h2-size')&&globals.includes('--sfi-h3-size')&&globals.includes('--sfi-body-size')&&globals.includes('--sfi-kicker-size'));
check('publications uses global display and narrative families',publicationCss.includes('--display:var(--sfi-display)')&&publicationCss.includes('--narrative:var(--sfi-narrative)'));
check('classification labels remain legible',publicationCss.includes('var(--sfi-kicker-size)')&&publicationCss.includes('var(--sfi-nav-size)'));
check('SFI is the explicit institutional attractor',catalog.includes('INSTITUTIONAL ATTRACTOR')&&publicationCss.includes('width:168px;height:168px'));
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} · ${name}`);
if(failed.length) process.exit(1);
