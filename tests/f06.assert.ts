import strictAssert from 'node:assert/strict';

// A failed bare assert.ok can spend minutes resolving TSX source expressions on
// this Windows runner. Keep strict assertions; give failures a message instead.
const assert:typeof strictAssert=new Proxy(strictAssert,{
  get(target,key,receiver){
    if(key==='ok')return (value:unknown,message?:string|Error)=>target.ok(value,message??'Expected condition to hold');
    return Reflect.get(target,key,receiver);
  }
});
export default assert;
