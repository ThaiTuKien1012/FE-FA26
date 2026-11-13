import type { DemoState } from './demo.repository';
/** RFC 4180 quoted cells, including escaped quotes and embedded newlines. */
function rows(text:string):string[][] {
 const result:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))result.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('Unclosed quoted CSV field.');row.push(cell);if(row.some(x=>x.trim()))result.push(row);return result;
}
export async function importDemoCsv(state:DemoState,scope:number,body:BodyInit|null|undefined){
 if(!(body instanceof FormData))throw new Error('Choose a CSV file.');const file=body.get('file');if(!(file instanceof Blob)||file.size>5*1024*1024)throw new Error('CSV file must be at most 5 MiB.');
 const parsed=rows((await file.text()).replace(/^\uFEFF/,''));
 if(parsed.shift()?.join(',')!=='source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status')throw new Error('CSV header must be source_order_id,occurred_at,sku,quantity,unit_price,unit_cost,status.');
 const errors:DemoState['imports'][number]['errors']=[],groups=new Map<string,{row:string[];line:number}[]>();
 parsed.forEach((row,i)=>{const key=row[0]||`invalid-row-${i}`;groups.set(key,[...(groups.get(key)??[]),{row,line:i+2}]);});
 let validCount=0,acceptedOrderCount=0,rejectedOrderCount=0,duplicateOrderCount=0,conflictOrderCount=0;
 for(const [order,records] of groups){
  const first=records[0].row;const items:DemoState['transactions'][number]['items']=[];let reason='';
  for(const {row} of records){const [source,date,sku,q,price,cost,status]=row,p=state.products.find(x=>x.storeId===scope&&x.sku===sku);if(row.length!==7||!source||!Number.isFinite(Date.parse(date))||!p||!Number.isInteger(Number(q))||Number(q)<=0||!price.trim()||!cost.trim()||!Number.isFinite(Number(price))||Number(price)<0||!Number.isFinite(Number(cost))||Number(cost)<0||!['COMPLETED','CANCELLED','REFUNDED','PARTIAL_REFUND'].includes(status)||date!==first[1]||status!==first[6]){reason='Invalid row values, unknown store SKU, or inconsistent order metadata.';break;}items.push({transactionItemId:state.nextId++,productId:p.id,sku,productName:p.name,quantity:Number(q),unitPrice:Number(price),unitCost:Number(cost)});}
  const existing=state.transactions.find(t=>t.storeId===scope&&t.sourceOrderId===order);
  if(existing){const same=existing.occurredAt===first[1]&&existing.status===first[6]&&JSON.stringify(existing.items.map(({sku,quantity,unitPrice,unitCost})=>({sku,quantity,unitPrice,unitCost})))===JSON.stringify(items.map(({sku,quantity,unitPrice,unitCost})=>({sku,quantity,unitPrice,unitCost})));if(same){duplicateOrderCount++;continue;}conflictOrderCount++;reason='Order ID conflicts with an existing local historical transaction.';}
  if(reason){rejectedOrderCount++;for(const r of records)errors.push({rowNumber:r.line,sourceOrderId:r.row[0]||null,status:'REJECTED',errorDetails:reason});continue;}
  state.transactions.push({transactionId:state.nextId++,storeId:scope,sourceOrderId:order,sourceSystem:'DEMO_CSV',occurredAt:first[1],status:first[6] as 'COMPLETED',f03Eligible:first[6]==='COMPLETED',totalAmount:items.reduce((a,l)=>a+l.quantity*l.unitPrice,0),items});validCount+=records.length;acceptedOrderCount++;
 }
 const batch:DemoState['imports'][number]={importBatchId:state.nextId++,storeId:scope,status:errors.length?'COMPLETED_WITH_ERRORS':'COMPLETED',filename:'name' in file?String(file.name):'transactions.csv',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),totalCount:parsed.length,validCount,rejectedCount:errors.length,totalOrderCount:groups.size,acceptedOrderCount,rejectedOrderCount,duplicateOrderCount,conflictOrderCount,errorSummary:errors.length?'Review rejected demo orders.':null,errors};state.imports.push(batch);return batch;
}
