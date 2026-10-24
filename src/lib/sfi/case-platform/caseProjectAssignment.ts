/** Resolve project ownership before a Case Platform insert, never after. */
export type CaseProjectSelection={id:string;tenantId:string;status:string};
export function resolveCaseProjectAssignment(
 requestedTenantId:string|null|undefined,
 requestedProjectId:string|null|undefined,
 project:CaseProjectSelection|null,
):{tenantId:string|null;projectId:string|null}{
 const tenantId=requestedTenantId?.trim()||null;
 const projectId=requestedProjectId?.trim()||null;
 if(!projectId)return {tenantId,projectId:null};
 if(!project||project.id!==projectId||!project.tenantId.trim())throw new Error('SFI_PROJECT_NOT_FOUND');
 if(project.status!=='ACTIVE')throw new Error('SFI_PROJECT_NOT_ACTIVE');
 if(tenantId&&tenantId!==project.tenantId)throw new Error('SFI_PROJECT_TENANT_MISMATCH');
 return {tenantId:project.tenantId,projectId};
}
