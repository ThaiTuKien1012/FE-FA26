import { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { authService } from '../../../services/authService';
import { recommendationProductImage } from '../f06.products';

export function F06ProductImage({ id, name, imageUrl, compactFallback=false }: { id:number;name:string;imageUrl?:string;compactFallback?:boolean }) {
  const user=useSyncExternalStore(authService.subscribe,authService.getCurrentUser,authService.getCurrentUser);
  const scope=JSON.stringify([authService.getSessionId(),user?.id,user?.storeId,user?.role]);
  const source=recommendationProductImage(imageUrl),key=JSON.stringify([scope,id,source]);
  const [loaded,setLoaded]=useState<{key:string;url?:string;failed?:boolean}>({key:''});
  useEffect(()=>{
    if(!source)return;
    const controller=new AbortController();let objectUrl:string|undefined;
    void(async()=>{
      try{
        const url=new URL(source,location.origin);
        if(url.origin===location.origin&&url.pathname.startsWith('/api/')){
          if(!url.pathname.startsWith('/api/products/'+id+'/'))return;
          const response=await authService.request(url.pathname+url.search,{signal:controller.signal});
          if(!response.ok)throw Error('Product image unavailable');
          const blob=await response.blob();
          if(!/^image\/(?:png|jpeg|webp|gif|avif)$/.test(blob.type))throw Error('Unsupported product image');
          if(controller.signal.aborted)return;
          objectUrl=URL.createObjectURL(blob);setLoaded({key,url:objectUrl});
        }else if(!controller.signal.aborted)setLoaded({key,url:url.href});
      }catch{if(!controller.signal.aborted)setLoaded({key,failed:true});}
    })();
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[source,key,id]);
  const image=loaded.key===key&&!loaded.failed?loaded.url:undefined;
  return <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-[#E7E2D8] bg-[#F3F5F2]">
    {image?<img src={image} alt={name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={()=>setLoaded({key,failed:true})} />:<span role={compactFallback?'img':undefined} aria-label={'Image unavailable for '+name} className="flex flex-col items-center gap-1 p-2 text-[#809087]"><Package aria-hidden="true" className="h-7 w-7" />{!compactFallback&&<span className="text-[10px]">No image</span>}</span>}
  </div>;
}

export function F06ProductTiles({ ids, names={}, images={}, limit=4,retail=false,expiryPriority }: { ids:number[];names?:Record<number,string>;images?:Record<number,string>;limit?:number;retail?:boolean;expiryPriority?:ReadonlySet<number> }) {
  const name=(id:number)=>names[id]??(retail?'Product name unavailable':'Product #'+id);
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{ids.slice(0,limit).map(id=><figure key={id} className="min-w-0"><F06ProductImage id={id} name={name(id)} imageUrl={images[id]} /><figcaption className="mt-2 line-clamp-2 break-words text-xs font-medium leading-5 text-[#243B30]" title={name(id)}>{name(id)}</figcaption>{expiryPriority?.has(id)&&<span data-expiry-product={id} title={name(id)+' has a confirmed batch that needs selling priority.'} className="mt-1 inline-flex max-w-full items-center gap-1 rounded bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-900"><AlertTriangle aria-hidden="true" className="h-3 w-3 shrink-0"/>Expiry priority</span>}</figure>)}{ids.length>limit&&<p className="col-span-full text-xs text-[#6D7974]">+{ids.length-limit} products in Details{ids.slice(limit).some(id=>expiryPriority?.has(id))?' · Includes products with expiry priority.':''}</p>}</div>;
}
