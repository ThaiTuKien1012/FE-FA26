import {useEffect,useRef,useState} from 'react';
import {Store,Upload,ImagePlus} from 'lucide-react';
import {storesApi,validateStoreImage,type ImageKind,type StoreView} from './storeManagement.api';
import {ErrorNotice,StoreDialog,errorMessage,primary,secondary} from './StoreManagementShared';

export function useSavedStoreImage(record:StoreView|null,kind:ImageKind){
 const url=record?(kind==='icon'?record.iconUrl:record.bannerUrl):null,key=JSON.stringify([record?.storeId,record?.status,kind,url]);
 const [revision,setRevision]=useState(0),[state,setState]=useState({key:'',src:'',error:'',loading:false});
 useEffect(()=>{
  const controller=new AbortController();let objectUrl='';
  setState({key,src:record?.status==='ACTIVE'&&url?url:'',loading:!!url,error:''});
  if(record&&url&&record.status!=='ACTIVE')void storesApi.readImage(record.storeId,kind,controller.signal).then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setState({key,src:objectUrl,error:'',loading:true});}).catch(()=>{if(!controller.signal.aborted)setState({key,src:'',error:'Image preview unavailable.',loading:false});});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[key,revision]);
 const current=state.key===key?state:{key,src:'',error:'',loading:!!url};
 return {...current,exists:!!url,revision,retry:()=>setRevision(n=>n+1),loaded:()=>setState(value=>value.key===key?{...value,loading:false}:value),failed:()=>setState(value=>value.key===key?{...value,loading:false,error:'Image preview unavailable.'}:value)};
}
export type SavedStoreImage=ReturnType<typeof useSavedStoreImage>;
export function StoreImagePreview({image,kind,identity=false,dark=false}:{image:SavedStoreImage;kind:ImageKind;identity?:boolean;dark?:boolean}){
 return <div className={'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl '+(identity?'h-16 w-16 bg-white/10':'bg-[#F6F7F4] '+(kind==='icon'?'h-24 w-24':'h-32 w-full sm:h-40'))}>
  {image.src&&!image.error&&<img key={image.revision} src={image.src} alt={identity?'Store icon':'Saved store '+kind} className={'h-full w-full object-contain '+(identity?'p-1':'')} onLoad={image.loaded} onError={image.failed}/>}
  {(!image.src||!!image.error)&&<div className={'px-2 text-center text-xs '+(identity&&dark?'text-[#EDF5EF]':'text-[#6D7974]')}>{identity?<Store aria-label={image.error?'Store icon preview unavailable':'Store icon placeholder'} className="h-7 w-7"/>:image.error?<span>Image preview unavailable</span>:image.loading?<span role="status">Loading image…</span>:kind==='icon'?<Store aria-label="No icon uploaded" className="mx-auto h-7 w-7 text-[#89988E]"/>:<span className="flex items-center justify-center gap-2"><ImagePlus aria-hidden="true" className="h-5 w-5"/>No banner uploaded</span>}</div>}
  {image.src&&image.loading&&!image.error&&!identity&&<span role="status" className="absolute bottom-1 rounded bg-white/90 px-2 py-1 text-xs text-[#53665B]">Loading image…</span>}
 </div>;
}
export function StoreBrandImage({record,kind,image,editable,busy,locked=false,mutationError,onUpload,onRemove}:{record:StoreView;kind:ImageKind;image:SavedStoreImage;editable:boolean;busy:boolean;locked?:boolean;mutationError?:string;onUpload:(file:File)=>Promise<boolean>;onRemove:()=>Promise<boolean>}){
 const input=useRef<HTMLInputElement>(null),selection=useRef(0),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[checking,setChecking]=useState(false),[remove,setRemove]=useState(false);
 useEffect(()=>()=>{selection.current++;},[]);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 const title=kind==='icon'?'Store icon':'Store banner';
 const choose=async(selectionFile?:File)=>{
  if(!selectionFile)return;const version=++selection.current;setFile(null);setError('');setChecking(true);
  try{await validateStoreImage(selectionFile,kind);if(version===selection.current)setFile(selectionFile);}catch(err){if(version===selection.current)setError(errorMessage(err));}finally{if(version===selection.current)setChecking(false);}
 };
 const controls=editable&&<div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={busy||locked||checking} onClick={()=>input.current?.click()}><Upload aria-hidden="true" className="h-4 w-4"/>{file?'Choose another ':image.exists?'Replace ':'Upload '}{kind}</button>{image.exists&&<button type="button" className={secondary} disabled={busy||locked||checking} onClick={()=>setRemove(true)}>Remove {kind}</button>}<input ref={input} type="file" tabIndex={-1} className="hidden" aria-label={'Choose '+kind+' file'} accept="image/png,image/jpeg" disabled={busy||locked||checking} onChange={event=>{const selected=event.target.files?.[0];event.target.value='';void choose(selected);}}/></div>;
 const saved=<StoreImagePreview image={image} kind={kind}/>;
 return <section aria-label={title} className="space-y-3">
  {kind==='icon'?<div className="flex flex-wrap items-center gap-4">{saved}<div className="min-w-32 flex-1"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-[#6D7974]">{image.error?'Saved icon preview unavailable.':image.exists?'Your store’s profile image.':'No icon uploaded'}</p></div>{controls}</div>:<><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-[#6D7974]">A wide image for your store profile.</p></div>{controls}</div>{saved}</>}
  {image.error&&<ErrorNotice message={image.error} retry={image.retry}/>}
  {editable&&<p className="text-xs text-[#6D7974]">PNG or JPEG · {kind==='icon'?1:5} MiB maximum · up to 4000 × 4000 px</p>}
  {checking&&<p role="status" className="text-xs text-[#6D7974]">Checking image…</p>}
  {file&&<div className="space-y-3 rounded-xl border border-[#CBDCCE] bg-[#F4F8F5] p-3"><p className="text-xs font-semibold text-[#356B54]">Unsaved {kind} preview</p>{preview&&<img src={preview} alt={'Unsaved '+kind+' preview'} className={'rounded-lg bg-white object-contain '+(kind==='icon'?'h-24 w-24':'h-32 w-full')}/>}<p className="break-all text-xs text-[#6D7974]">{file.name}</p><div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={busy||locked} onClick={async()=>{if(await onUpload(file))setFile(null);}}>Upload {kind}</button><button type="button" className={secondary} disabled={busy} onClick={()=>setFile(null)}>Discard preview</button></div></div>}
  {error&&<ErrorNotice message={error}/>}
  {remove&&<StoreDialog title={'Remove store '+kind+'?'} busy={busy} onClose={()=>setRemove(false)}><div className="space-y-4 overflow-y-auto p-5"><p className="text-sm">Remove the saved {kind} from {record.name}? You can upload a new image later.</p>{mutationError&&<ErrorNotice message={mutationError}/>}<div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondary} disabled={busy} onClick={()=>setRemove(false)}>Cancel</button><button type="button" className={primary} disabled={busy||locked} onClick={async()=>{if(await onRemove()){setRemove(false);setFile(null);}}}>Remove {kind}</button></div></div></StoreDialog>}
 </section>;
}
