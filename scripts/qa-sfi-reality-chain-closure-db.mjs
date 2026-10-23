import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const user='00000000-0000-4000-8000-000000000001', tenant='00000000-0000-4000-8000-000000000002', caseId='00000000-0000-4000-8000-000000000003';
try {
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select '${user}'::uuid $$;`);
 for(const name of ['20260816124000_sfi_case_platform_operational_v1.sql','20260816132000_sfi_enterprise_assurance_graph_v1.sql','20260816140000_sfi_case_governed_action_v1.sql','20260909080500_sfi_case_object_atomic_writer_v1.sql','20261023123624_reality_chain_closure_integrity.sql']) {
   await db.exec(readFileSync('supabase/migrations/'+name,'utf8').replace('create extension if not exists pgcrypto;',''));
 }
 await db.query('insert into auth.users values ($1)',[user]);
 await db.query(`insert into sfi_tenants(id,tenant_key,name,created_by) values ($1,'test','Test',$2)`,[tenant,user]);
 await db.query(`insert into sfi_cases(id,owner_id,tenant_id,service_profile_id,subject,scope,system_boundary_ref,temporal_window) values ($1,$2,$3,'CUSTOM_RESEARCH','SYSTEM','Closure fixture','{"id":"test"}','{"cutoff":"2026-10-23"}')`,[caseId,user,tenant]);
 const revision=async()=>Number((await db.query('select closure_revision from sfi_cases where id=$1',[caseId])).rows[0].closure_revision);
 const close=(expected,closure)=>db.query('select sfi_close_case_atomic_v1($1,$2,$3,$4,$5::jsonb)',[caseId,user,'OPEN',expected,JSON.stringify(closure)]);
 await assert.rejects(()=>db.query("update sfi_cases set status='CLOSED' where id=$1",[caseId]),/CLOSURE_ATOMIC_REQUIRED/);
 const before=await revision();
 const object={id:'00000000-0000-4000-8000-000000000004',kind:'RECORD',epistemicRole:'RECORD',canonicalRef:{id:'record',version:'1',hash:'abc'},payload:{statement:'new data'}};
 await db.query('select sfi_record_case_object_atomic_v1($1,$2,$3::jsonb)',[caseId,user,JSON.stringify(object)]);
 assert((await revision())>before,'Object insert and revision must commit together');
 await assert.rejects(()=>close(before,{mode:'ADMINISTRATIVE',reason:'done'}),/TRANSITION_CONFLICT/);
 const current=await revision();
 await assert.rejects(()=>close(current,{mode:'CERTIFIED',inputHash:'fake',gaps:[]}),/REPORT_REQUIRED/);
 await assert.rejects(()=>close(current,{mode:'ADMINISTRATIVE',reason:''}),/REASON_REQUIRED/);
 await close(current,{mode:'ADMINISTRATIVE',reason:'Test concludes without certifying evidence'});
 const state=(await db.query('select status from sfi_cases where id=$1',[caseId])).rows[0];assert.equal(state.status,'CLOSED');
 const audit=(await db.query("select after_state from sfi_case_audit_events where case_id=$1 and action='CASE_STATUS_CHANGED'",[caseId])).rows;
 assert.equal(audit.length,1);assert.equal(audit[0].after_state.closure.mode,'ADMINISTRATIVE');
 await assert.rejects(()=>db.query('select sfi_record_case_object_atomic_v1($1,$2,$3::jsonb)',[caseId,user,JSON.stringify({...object,id:'00000000-0000-4000-8000-000000000005',canonicalRef:{id:'late',hash:'late'}})]),/WRITE_FORBIDDEN/);
 assert.equal((await db.query("select count(*)::int as n from sfi_case_objects where canonical_ref->>'id'='late'")).rows[0].n,0);
 // A direct child insert must obey the same closure lock, even outside the TS writer.
 await assert.rejects(()=>db.query(`insert into sfi_case_objects(case_id,owner_id,tenant_id,object_kind,epistemic_role,canonical_ref,payload) values ($1,$2,$3,'RECORD','RECORD','{"id":"direct","hash":"x"}','{}')`,[caseId,user,tenant]),/WRITE_FORBIDDEN/);
 // Failure rolls back status and audit together; no direct authenticated closure RPC.
 const acl=(await db.query("select has_function_privilege('authenticated','public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb)','execute') as allowed")).rows[0];assert.equal(acl.allowed,false);
 console.log('PASS: PostgreSQL migration, atomic object revision, stale closure rejection, required report, administrative disposition, atomic audit, post-close write rejection, service-only RPC');
} catch(error) {console.error(error.message);process.exitCode=1;} finally {await db.close();}
