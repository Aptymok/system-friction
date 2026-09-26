'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type PublicationCatalogItem = Readonly<{
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  publishedAt: string;
  cover: string;
  category: string;
}>;

export function PublicationsCatalog({items}:{items:readonly PublicationCatalogItem[]}){
  const [category,setCategory]=useState('ALL');
  const categories=useMemo(
    ()=>['ALL',...Array.from(new Set(items.map((item)=>item.category)))],
    [items],
  );
  const visible=useMemo(
    ()=>category==='ALL'?items:items.filter((item)=>item.category===category),
    [category,items],
  );

  return <section className="pubCatalog" aria-labelledby="publications-catalog-title">
    <header className="pubCatalogHeader">
      <div>
        <span>PUBLIC RECORD</span>
        <h2 id="publications-catalog-title">Published work.</h2>
      </div>
      <label className="pubFilter">
        <span>FILTER</span>
        <select value={category} onChange={(event)=>setCategory(event.target.value)} aria-label="Filter publications by category">
          {categories.map((value)=><option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </header>

    <div className="pubGrid">
      {visible.map((item)=><article className="pubCard" key={item.slug}>
        <Link href={`/publications/${item.slug}`} className="pubCover" aria-label={`Open ${item.title}`}>
          <img src={item.cover} alt="" loading="lazy"/>
        </Link>
        <div className="pubCardBody">
          <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
          <h3><Link href={`/publications/${item.slug}`}>{item.title}</Link></h3>
          <p className="pubCardSubtitle">{item.subtitle}</p>
          <p className="pubCardSummary">{item.summary}</p>
          <Link className="pubRead" href={`/publications/${item.slug}`}>READ PUBLICATION →</Link>
        </div>
      </article>)}
    </div>
  </section>;
}

function formatDate(value:string){
  const date=new Date(value);
  if(!Number.isFinite(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}
