import { authService } from '../../services/authService';
import type { SystemRole, UserAccount, UserStatus } from '../../types/users';

export const accountRoleCodes: Record<SystemRole, string> = {
  'System Admin':'SYSTEM_ADMIN', 'Store Admin':'STORE_ADMIN', Merchandiser:'MERCHANDISER', 'End-Customer':'END_CUSTOMER'
};
const roles = Object.fromEntries(Object.entries(accountRoleCodes).map(([label,code])=>[code,label])) as Record<string,SystemRole>;
const statuses: Record<string,UserStatus> = { ACTIVE:'Active', INACTIVE:'Inactive', PENDING_VERIFICATION:'Pending Activation' };
export interface AccountDraft { name:string; email:string; role:SystemRole; storeId:string; status:UserStatus; }
export interface AccountOperation {
  field:'name'|'access'|'status'; method:'PUT'|'PATCH'; path:string; body:Record<string,string|number|null>;
}
export const needsAccountStore = (role:SystemRole) => role==='Store Admin'||role==='Merchandiser';
export const canChangeAccountStatus = (user:UserAccount) => user.emailVerified===true&&user.status!=='Pending Activation';
export const accountDraft = (user?:UserAccount):AccountDraft => ({name:user?.name??'',email:user?.email??'',role:user?.role??'Merchandiser',storeId:user?.storeId==null?'':String(user.storeId),status:user?.status??'Pending Activation'});

export function mapAccount(value:unknown):UserAccount {
  const v=value as Record<string,unknown>|null;
  if(!v||!Number.isInteger(v.userId)||(v.userId as number)<1||(v.userId as number)>2147483647||
     typeof v.email!=='string'||!(v.name===null||typeof v.name==='string')||typeof v.roleCode!=='string'||
     !Object.hasOwn(roles,v.roleCode)||typeof v.status!=='string'||!Object.hasOwn(statuses,v.status)||typeof v.emailVerified!=='boolean'||
     !(v.storeId===null||(Number.isInteger(v.storeId)&&(v.storeId as number)>0&&(v.storeId as number)<=2147483647))) {
    throw new Error('The server returned invalid account information. Refresh accounts before continuing.');
  }
  return {id:String(v.userId),name:(v.name as string|null)??'',email:v.email,role:roles[v.roleCode],storeId:v.storeId as number|null,
    status:statuses[v.status],emailVerified:v.emailVerified,lastActive:v.emailVerified?'Email verified':'Waiting for OTP verification'};
}

function assignment(draft:AccountDraft) {
  if(!Object.hasOwn(accountRoleCodes,draft.role))throw new Error('Choose an available account role.');
  let storeId:number|null=null;
  if(needsAccountStore(draft.role)) {
    if(!/^[1-9]\d*$/.test(draft.storeId)||Number(draft.storeId)>2147483647)throw new Error('Choose an assigned Store for this role.');
    storeId=Number(draft.storeId);
  }
  return {roleCode:accountRoleCodes[draft.role],storeId};
}
function accountName(draft:AccountDraft) {
  const name=draft.name.trim();
  if(!name||name.length>150)throw new Error('Enter a full name of up to 150 characters.');
  return name;
}
export function createAccountPayload(draft:AccountDraft) {
  const name=accountName(draft),email=draft.email.trim();
  if(!email||email.length>254)throw new Error('Enter a valid email address of up to 254 characters.');
  return {name,email,...assignment(draft)};
}
export function accountChanges(current:UserAccount,draft:AccountDraft) {
  return {name:draft.name.trim()!==current.name,access:draft.role!==current.role||
    (draft.storeId.trim()?Number(draft.storeId):null)!==(current.storeId??null),status:draft.status!==current.status};
}
export function planAccountUpdate(current:UserAccount,draft:AccountDraft,actorId:string):AccountOperation[] {
  if(!/^[1-9]\d*$/.test(current.id)||Number(current.id)>2147483647)throw new Error('The account ID is invalid. Refresh accounts.');
  const changed=accountChanges(current,draft);
  const name=changed.name?accountName(draft):current.name;
  const access=changed.access?assignment(draft):{roleCode:accountRoleCodes[current.role],storeId:current.storeId??null};
  if(draft.email!==current.email)throw new Error('The account email cannot be changed here.');
  if(current.id===actorId) {
    if(draft.status!=='Active')throw new Error('You cannot disable your own administrator account.');
    if(draft.role!=='System Admin')throw new Error('You cannot remove your own administrator access.');
  }
  if(changed.status&&(!canChangeAccountStatus(current)||!['Active','Inactive'].includes(draft.status))) {
    throw new Error('This account must complete OTP activation and password setup before its access status can be changed.');
  }
  const path=`/api/users/${current.id}`;
  return [
    ...(changed.name?[{field:'name' as const,method:'PUT' as const,path,body:{name}}]:[]),
    ...(changed.access?[{field:'access' as const,method:'PUT' as const,path:path+'/role',body:access}]:[]),
    ...(changed.status?[{field:'status' as const,method:'PATCH' as const,path:path+'/status',body:{status:draft.status==='Active'?'ACTIVE':'INACTIVE'}}]:[])
  ];
}

export async function accountRequest(path:string,init:RequestInit={}):Promise<unknown> {
  const token=authService.getToken();
  if(!token||authService.getCurrentUser()?.role!=='System Admin')throw new Error('Please sign in as System Admin to manage accounts.');
  const headers=new Headers(init.headers);headers.set('Accept','application/json');headers.set('Authorization',`Bearer ${token}`);
  if(init.body!==undefined&&init.body!==null)headers.set('Content-Type','application/json');
  init.signal?.throwIfAborted();
  let response:Response,body:string;
  try {response=await fetch(path,{...init,headers});body=await response.text();}
  catch {init.signal?.throwIfAborted();throw new Error('Could not connect to the account service. The outcome may be unknown; refresh account details before retrying.');}
  init.signal?.throwIfAborted();
  if(authService.getToken()!==token)throw new Error('Your session changed. Reload account details before continuing.');
  let data:unknown;try {data=JSON.parse(body);}catch { /* Empty error responses use the HTTP fallback. */ }
  if(!response.ok) {
    const envelope=data as {error?:unknown;message?:unknown}|null;
    const detail=[envelope?.error,envelope?.message].find(value=>typeof value==='string'&&value.trim());
    throw new Error(typeof detail==='string'?detail:`The account service returned HTTP ${response.status}. Please try again.`);
  }
  if(data===undefined)throw new Error('The server response could not be verified. Refresh account details before retrying.');
  return data;
}

export async function saveAccountUpdate(current:UserAccount,draft:AccountDraft,actorId:string,onConfirmed:(user:UserAccount)=>void):Promise<UserAccount> {
  const operations=planAccountUpdate(current,draft,actorId);
  let confirmed=current;
  for(const operation of operations) {
    if(operation.field==='status'&&!canChangeAccountStatus(confirmed))throw new Error('Account activation requirements changed. Reload account details before changing access status.');
    const user=mapAccount(await accountRequest(operation.path,{method:operation.method,body:JSON.stringify(operation.body)}));
    if(user.id!==current.id||user.email!==current.email||
       (operation.field==='name'&&user.name!==operation.body.name)||
       (operation.field==='access'&&(accountRoleCodes[user.role]!==operation.body.roleCode||(user.storeId??null)!==operation.body.storeId))||
       (operation.field==='status'&&user.status!==draft.status)) {
      throw new Error('The saved account response could not be verified. Refresh account details before another change.');
    }
    confirmed=user;onConfirmed(user);
  }
  return confirmed;
}
