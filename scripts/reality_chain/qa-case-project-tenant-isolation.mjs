/**
 * Case Platform tenant isolation test on one disposable PostgreSQL 17 database.
 * Creates exactly sfi_rc_case_project in the GitHub Actions local PG service;
 * never uses production credentials or external hosts.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
const raw=process.env.SFI_RC_TEST_DATABASE_URL;
let base;try{base=new URL(raw);}catch{throw Error('SFI_CASE_ISOLATED_PG_URL_REQUIRED');}
if(base.protocol!=='postgres:'||base.hostname!=='127.0.0.1'||base.port!=='5432'||
   base.pathname!=='/sfi_rc_test'||base.username!=='postgres'||base.password!=='isolated-test-only'||
   base.search||base.hash)throw Error('SFI_CASE_REFUSE_NON_ISOLATED_DB');
const projectUrl=new URL(base);
projectUrl.pathname='/sfi_rc_case_project';
const admin=postgres(base.toString(),{max:1});
let db;
const users={a:'20000000-0000-4000-8000-000000000001',b:'20000000-0000-4000-8000-000000000002',viewer:'20000000-0000-4000-8000-000000000003'};
const tenants={a:'30000000-0000-4000-8000-000000000001',b:'30000000-0000-4000-8000-000000000002'};
const projects={a:'40000000-0000-4000-8000-000000000001',b:'40000000-0000-4000-8000-000000000002'};
const caseId=(n)=>'50000000-0000-4000-8000-'+String(n).padStart(12,'0');
const boundary={id:'isolated:tenant-boundary'};
const temporal={mode:'LONGITUDINAL',basis:'OBSERVED_TIME',cutoff:'2026-10-24T10:00:00Z',timezone:'UTC',start:null,end:null};
const insertCase=async(tx,id,owner,tenant,project)=>
  await tx.unsafe('insert into public.sfi_cases (id,owner_id,tenant_id,project_id,service_profile_id,subject,scope,system_boundary_ref,temporal_window)'+
    ' values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8::jsonb,$9::jsonb) returning id',
    [id,owner,tenant,project,'CUSTOM_RESEARCH','Isolated case','Fixture',boundary,temporal]);
const asUser=async(actor,fn)=>db.begin(async tx=>{
  await tx.unsafe('set local role authenticated');
  await tx.unsafe("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  return fn(tx);
});
try{
  for(const role of ['anon','authenticated','service_role']){
    const found=await admin.unsafe('select 1 from pg_roles where rolname=$1',[role]);
    if(!found.length)await admin.unsafe('create role '+role);
  }
  await admin.unsafe('create database sfi_rc_case_project');
  db=postgres(projectUrl.toString(),{max:3});
  await db.unsafe("create schema auth; create table auth.users(id uuid primary key);"+
    "create function auth.uid() returns uuid language sql stable as $$"+
    "select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;");
  await db.unsafe(readFileSync('supabase/migrations/20260816124000_sfi_case_platform_operational_v1.sql','utf8'));
  await db.unsafe(readFileSync('supabase/migrations/20260902010000_sfi_final_operating_form.sql','utf8'));
  await db.unsafe('grant usage on schema public,auth to authenticated');
  await db.unsafe('grant select,insert,update on public.sfi_cases,public.sfi_projects,public.sfi_tenants,public.sfi_tenant_members to authenticated');
  await db.unsafe('insert into auth.users(id) values ($1::uuid),($2::uuid),($3::uuid)',Object.values(users));
  await db.unsafe("insert into public.sfi_tenants(id,tenant_key,name,created_by) values"+
    "($1::uuid,'case-fixture-a','Fixture A',$2::uuid),($3::uuid,'case-fixture-b','Fixture B',$4::uuid)",
    [tenants.a,users.a,tenants.b,users.b]);
  await db.unsafe("insert into public.sfi_tenant_members(tenant_id,user_id,role,status)"+
    "values ($1::uuid,$2::uuid,'VIEWER','ACTIVE')",[tenants.a,users.viewer]);
  await db.unsafe("insert into public.sfi_projects(id,tenant_id,owner_id,project_key,name) values"+
    "($1::uuid,$2::uuid,$3::uuid,'proj-a','A'),($4::uuid,$5::uuid,$6::uuid,'proj-b','B')",
    [projects.a,tenants.a,users.a,projects.b,tenants.b,users.b]);
  await insertCase(db,caseId(1),users.a,tenants.a,projects.a);
  await insertCase(db,caseId(2),users.b,tenants.b,projects.b);
  // Actual pre-migration vulnerability: a service client can associate a case
  // with another tenant's project using the old single-column FK.
  await insertCase(db,caseId(3),users.a,tenants.a,projects.b);
  const oldBad=await db.unsafe("select count(*)::int as n from public.sfi_cases c join public.sfi_projects p on p.id=c.project_id where c.tenant_id<>p.tenant_id");
  assert.equal(oldBad[0].n,1,'legacy FK was not tenant-bound');
  await db.unsafe(readFileSync('supabase/migrations/20261024145000_sfi_case_project_tenant_integrity.sql','utf8'));
  const constraint=await db.unsafe("select convalidated from pg_constraint where conrelid='public.sfi_cases'::regclass and conname='sfi_cases_project_tenant_fk'");
  assert.equal(constraint.length,1);
  assert.equal(constraint[0].convalidated,false,'legacy rows deliberately remain unvalidated');
  await assert.rejects(insertCase(db,caseId(4),users.a,tenants.a,projects.b), /foreign key|sfi_cases_project_tenant_fk/i);
  await assert.rejects(db.unsafe("alter table public.sfi_cases validate constraint sfi_cases_project_tenant_fk"),/foreign key|sfi_cases_project_tenant_fk/i);
  await db.unsafe('delete from public.sfi_cases where id=$1::uuid',[caseId(3)]);
  await db.unsafe('alter table public.sfi_cases validate constraint sfi_cases_project_tenant_fk');
  const validated=await db.unsafe("select convalidated from pg_constraint where conname='sfi_cases_project_tenant_fk'");
  assert.equal(validated[0].convalidated,true);
  await asUser(users.a,async tx=>{
    const visible=await tx.unsafe("select id::text as id from public.sfi_cases order by id");
    assert.deepEqual(visible.map(x=>x.id),[caseId(1)]);
    const ownedProjects=await tx.unsafe("select id::text as id from public.sfi_projects order by id");
    assert.deepEqual(ownedProjects.map(x=>x.id),[projects.a]);
    await insertCase(tx,caseId(5),users.a,tenants.a,projects.a);
  });
  await asUser(users.viewer,async tx=>{
    const visible=await tx.unsafe("select count(*)::int as n from public.sfi_cases");
    assert.equal(visible[0].n,2,'viewer can read but must not write');
    const attempt=await tx.unsafe("update public.sfi_cases set subject='unauthorized' where id=$1::uuid returning id",[caseId(1)]);
    assert.equal(attempt.length,0);
  });
  await assert.rejects(asUser(users.viewer,tx=>insertCase(tx,caseId(6),users.viewer,tenants.a,projects.a)),/row-level security|permission denied/i);
  await assert.rejects(asUser(users.a,tx=>insertCase(tx,caseId(7),users.a,tenants.b,projects.b)),/row-level security|permission denied/i);
  await assert.rejects(insertCase(db,caseId(8),users.a,tenants.a,projects.b),/foreign key|sfi_cases_project_tenant_fk/i);
  const count=await db.unsafe('select count(*)::int as n from public.sfi_cases');
  assert.equal(count[0].n,3,'one A case, one B case, one new authorized A case');
  console.log('PASS CASE_PLATFORM_REAL_PG17_TENANT_ISOLATION: RLS reader/writer, cross-tenant project FK, legacy NOT VALID review, validation, zero orphaned cases, 2 tenants');
  console.log('LIMITATION: production migration not applied; tests are disposable PG17.');
}catch(error){
  console.error('FAIL CASE_PLATFORM_REAL_PG17_TENANT_ISOLATION',error?.stack??error);process.exitCode=1;
}finally{await Promise.allSettled([db?.end({timeout:3}),admin.end({timeout:3})]);}
