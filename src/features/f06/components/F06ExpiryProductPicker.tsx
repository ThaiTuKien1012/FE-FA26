import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { authService } from '../../../services/authService';
import { recommendationProductImage } from '../f06.products';
import type { ExpiryProductOption } from '../f06.expiry';
import { F06ProductImage } from './F06ProductImage';
import { miningButton } from '../../f05/f05.display';

const session=()=>{const user=authService.getCurrentUser();return JSON.stringify([authService.getSessionId()||authService.getToken(),user?.id,user?.role,user?.storeId]);};
export async function readExpiryProducts(search:string,page:number,signal:AbortSignal){
  const key=session(),role=authService.getCurrentUser()?.role;
  const store=authService.getCurrentUser()?.storeId;
  if(!authService.getToken()||(role!=='Store Admin'&&role!=='Merchandiser')||!Number.isSafeInteger(store)||!store||store<1)throw Error('Catalog access unavailable');
  const params=new URLSearchParams({search,page:String(page),pageSize:'20',sortBy:'name',sortDirection:'asc'});
  const response=await authService.request('/api/products?'+params,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Product search unavailable');
  const value=await response.json();signal.throwIfAborted();
  if(session()!==key||!Array.isArray(value?.content)||value.content.length>20||value.page!==page||!Number.isSafeInteger(value.totalPages)||value.totalPages<0)throw Error('Product search could not be verified');
  const items:ExpiryProductOption[]=value.content.map((product:Record<string,unknown>)=>{
    if(!product||!Number.isSafeInteger(product.id)||(product.id as number)<1||(product.id as number)>2147483647||typeof product.name!=='string'||!product.name.trim())throw Error('Invalid product search');
    return{id:product.id as number,name:product.name,sku:typeof product.sku==='string'?product.sku:undefined,imageUrl:recommendationProductImage(product.imageUrl)??undefined};
  });
  return{items,hasMore:page+1<value.totalPages};
}
/** F02's selector is SKU-first and has no media/cancellable reads; this small F06 projection
 * uses the same authorized server catalog search without changing F02 or its permissions. */
export function F06ExpiryProductPicker({value,onChange}:{value:ExpiryProductOption|null;onChange:(product:ExpiryProductOption|null)=>void}){
  const id=useId(),root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),controller=useRef<AbortController|null>(null),generation=useRef(0);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[items,setItems]=useState<ExpiryProductOption[]>([]),[next,setNext]=useState(0),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(-1),[revision,setRevision]=useState(0);
  const close=()=>{generation.current++;controller.current?.abort();setOpen(false);setBusy(false);setActive(-1);};
  const load=async(page:number,version:number)=>{
    controller.current?.abort();const job=new AbortController();controller.current=job;setBusy(true);setError('');
    try{const result=await readExpiryProducts(query.trim(),page,job.signal);if(version!==generation.current)return;setItems(current=>page===0?result.items:[...new Map([...current,...result.items].map(product=>[product.id,product])).values()]);setNext(page+1);setMore(result.hasMore);}
    catch{if(!job.signal.aborted&&version===generation.current)setError('Could not load products. Try again.');}
    finally{if(!job.signal.aborted&&version===generation.current)setBusy(false);}
  };
  useEffect(()=>{if(!open)return;const version=++generation.current;controller.current?.abort();setItems([]);setActive(-1);setBusy(true);setError('');const timer=setTimeout(()=>void load(0,version),300);return()=>{clearTimeout(timer);controller.current?.abort();};},[open,query,revision]);
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('pointerdown',outside);controller.current?.abort();};},[]);
  useEffect(()=>{if(active>=0)document.getElementById(id+'-'+active)?.scrollIntoView({block:'nearest'});},[active,id]);
  const choose=(product:ExpiryProductOption)=>{onChange(product);close();input.current?.focus();};
  return <div ref={root} className="relative min-w-0" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();input.current?.focus();}}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))close();}}>
    <label htmlFor={id} className="mb-1 block text-xs font-semibold">Product</label><div className="flex items-center gap-2"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#6D7974]"/><input ref={input} id={id} role="combobox" aria-label="Search products" aria-expanded={open} aria-controls={id+'-list'} aria-autocomplete="list" aria-activedescendant={open&&active>=0?id+'-'+active:undefined} autoComplete="off" placeholder="Search products..." value={open?query:value?.name??''} className="h-10 w-full rounded-lg border border-[#E7E2D8] bg-white pl-9 pr-8 text-sm focus:border-[#356B54] focus:outline-none focus:ring-2 focus:ring-[#EDF5F0]" onClick={()=>{if(!open){setQuery('');setOpen(true);}}} onChange={event=>{generation.current++;controller.current?.abort();setQuery(event.target.value);setOpen(true);}} onKeyDown={event=>{
      if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();}
      else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){setQuery('');setOpen(true);}else setActive(current=>event.key==='ArrowDown'?Math.min(current+1,items.length-1):current<=0?items.length-1:current-1);}
      else if(event.key==='Enter'){event.preventDefault();if(open&&items[active])choose(items[active]);else if(!open){setQuery('');setOpen(true);}}
    }}/>{busy&&open?<Loader2 aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin"/>:<ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#6D7974]"/>}</div>{value&&<button type="button" className={miningButton} aria-label="Clear product filter" onClick={()=>{onChange(null);close();input.current?.focus();}}><X aria-hidden="true" className="h-4 w-4"/></button>}</div>
    {open&&<div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#E7E2D8] bg-white p-1 shadow-lg"><ul id={id+'-list'} role="listbox" aria-label="Products" aria-busy={busy}>{items.map((product,index)=><li key={product.id} id={id+'-'+index} role="option" aria-selected={value?.id===product.id} className={'flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm '+(active===index?'bg-[#EDF5F0]':'hover:bg-[#FAF8F5]')} onPointerDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>choose(product)}><div className="w-10 shrink-0"><F06ProductImage id={product.id} name={product.name} imageUrl={product.imageUrl}/></div><div className="min-w-0"><strong className="block break-words font-medium">{product.name}</strong>{product.sku&&<small className="block break-words text-[#6D7974]">{product.sku}</small>}</div></li>)}</ul>{busy?<p role="status" className="p-3 text-sm">Loading products...</p>:error?<p role="alert" className="p-3 text-sm text-red-800">{error} <button type="button" className="underline" onClick={()=>setRevision(value=>value+1)}>Retry products</button></p>:!items.length?<p className="p-3 text-sm text-[#6D7974]">No matching products</p>:null}{more&&!error&&<button type="button" className={miningButton+' mt-1 w-full justify-center'} disabled={busy} onClick={()=>{input.current?.focus({preventScroll:true});void load(next,generation.current);}}>Load more products</button>}</div>}
  </div>;
}
