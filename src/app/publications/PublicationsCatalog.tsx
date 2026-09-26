'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';

export type PublicationCatalogItem = Readonly<{
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  publishedAt: string;
  cover: string;
  category: string;
}>;

type Edge = Readonly<{from:string;to:string;kind:'SEQUENCE'|'THEME'}>;

function stableHash(value:string){
  let hash=2166136261;
  for(let index=0;index<value.length;index+=1){
    hash^=value.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return Math.abs(hash>>>0);
}

function positionFor(item:PublicationCatalogItem,index:number,total:number){
  const seed=stableHash(item.slug);
  const ring=30+(seed%24);
  const angle=((index/Math.max(1,total))*Math.PI*2)+((seed%31)-15)*0.012;
  return {
    x:50+Math.cos(angle)*ring,
    y:50+Math.sin(angle)*(ring*.68),
  };
}

export function PublicationsCatalog({items}:{items:readonly PublicationCatalogItem[]}){
  const [category,setCategory]=useState('ALL');
  const [selectedSlug,setSelectedSlug]=useState(items[0]?.slug??'');
  const categories=useMemo(
    ()=>['ALL',...Array.from(new Set(items.map((item)=>item.category)))],
    [items],
  );
  const visible=useMemo(
    ()=>category==='ALL'?items:items.filter((item)=>item.category===category),
    [category,items],
  );
  const selected=items.find((item)=>item.slug===selectedSlug)??visible[0]??items[0];

  const positions=useMemo(()=>new Map(visible.map((item,index)=>[
    item.slug,
    positionFor(item,index,visible.length),
  ])),[visible]);

  const edges=useMemo(()=>{
    const next:Edge[]=[];
    for(let index=0;index<visible.length-1;index+=1){
      next.push({from:visible[index].slug,to:visible[index+1].slug,kind:'SEQUENCE'});
    }
    const byCategory=new Map<string,PublicationCatalogItem[]>();
    visible.forEach((item)=>{
      const group=byCategory.get(item.category)??[];
      group.push(item);
      byCategory.set(item.category,group);
    });
    byCategory.forEach((group)=>{
      for(let index=0;index<group.length-1;index+=1){
        next.push({from:group[index].slug,to:group[index+1].slug,kind:'THEME'});
      }
    });
    return next;
  },[visible]);

  const related=selected?items.filter((item)=>
    item.slug!==selected.slug && item.category===selected.category
  ).slice(0,4):[];

  return <section className="pubCatalog pubRegistry" aria-labelledby="publications-catalog-title">
    <header className="pubCatalogHeader">
      <div>
        <span>REGISTRY GRAPH / PUBLIC RECORD</span>
        <h2 id="publications-catalog-title">Institutional memory, connected.</h2>
        <p className="pubRegistryIntro">Nodes are publications. Lines encode editorial sequence or shared classification only; they do not assert causality.</p>
      </div>
      <label className="pubFilter">
        <span>FILTER GRAPH</span>
        <select value={category} onChange={(event)=>setCategory(event.target.value)} aria-label="Filter registry graph by publication category">
          {categories.map((value)=><option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </header>

    <div className="pubRegistryWorkspace">
      <div className="pubGraph" role="group" aria-label="Publication registry graph">
        <svg className="pubGraphEdges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge,index)=>{
            const from=positions.get(edge.from);
            const to=positions.get(edge.to);
            if(!from||!to) return null;
            return <line key={`${edge.kind}-${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-kind={edge.kind}/>;
          })}
        </svg>
        <div className="pubGraphCore" aria-hidden="true"><span>SFI</span><small>REGISTRY</small></div>
        {visible.map((item,index)=>{
          const position=positions.get(item.slug)??{x:50,y:50};
          const active=item.slug===selected?.slug;
          return <button
            type="button"
            key={item.slug}
            className="pubGraphNode"
            data-active={active?'true':undefined}
            style={{'--node-x':`${position.x}%`,'--node-y':`${position.y}%`,'--node-depth':String((index%5)+1)} as CSSProperties}
            onClick={()=>setSelectedSlug(item.slug)}
            aria-pressed={active}
            aria-label={`Inspect ${item.title}`}
          >
            <img src={item.cover} alt="" loading="lazy"/>
            <span>{item.category}</span>
            <strong>{item.title}</strong>
          </button>;
        })}
      </div>

      {selected?<aside className="pubRegistryInspector" aria-live="polite">
        <span>PUBLICATION NODE</span>
        <img src={selected.cover} alt=""/>
        <time dateTime={selected.publishedAt}>{formatDate(selected.publishedAt)}</time>
        <small>{selected.category}</small>
        <h3>{selected.title}</h3>
        <p className="pubCardSubtitle">{selected.subtitle}</p>
        <p>{selected.summary}</p>
        <div className="pubNodeRelations">
          <b>RELATIONS</b>
          <span>SEQUENCE · chronological adjacency</span>
          <span>THEME · shared editorial classification</span>
          {related.map((item)=><button key={item.slug} type="button" onClick={()=>setSelectedSlug(item.slug)}>{item.title}</button>)}
        </div>
        <Link className="pubRead" href={`/publications/${selected.slug}`}>OPEN INFORMATION HUB →</Link>
      </aside>:null}
    </div>

    <div className="pubRegistryIndex" aria-label="Registry index">
      {visible.map((item)=><article className="pubRegistryIndexItem" key={item.slug}>
        <button type="button" onClick={()=>setSelectedSlug(item.slug)}>{item.category}</button>
        <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
        <Link href={`/publications/${item.slug}`}>{item.title}</Link>
      </article>)}
    </div>
  </section>;
}

function formatDate(value:string){
  const date=new Date(value);
  if(!Number.isFinite(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}
