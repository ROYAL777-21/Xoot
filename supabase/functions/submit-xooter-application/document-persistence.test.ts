import {describe,expect,it,vi} from 'vitest';
import {persistApplicationDocument} from './document-persistence';
const input={user_id:'owner-a',application_id:'app-a',doc_type:'id',storage_path:'owner-a/id-fresh.pdf'};
const store=(result:unknown)=>{const single=vi.fn().mockResolvedValue(result);const insert=vi.fn(()=>({select:()=>({single})}));return{from:()=>({insert}),insert};};
describe('honest private application document acknowledgment',()=>{
  it('does not acknowledge a rejected database write',async()=>{
    const db=store({data:null,error:{code:'23514'}});await expect(persistApplicationDocument(db,input)).rejects.toThrow('could not be saved');
  });
  it('does not acknowledge a missing or mismatched returned owner record',async()=>{
    for(const data of [null,{...input,id:'doc-a',status:'pending',user_id:'owner-b'},{...input,id:'doc-a',status:'approved'}]){
      await expect(persistApplicationDocument(store({data,error:null}),input)).rejects.toThrow('could not be saved');
    }
  });
  it('rejects cross-owner and traversing file pointers before any database write',async()=>{
    for(const storage_path of ['owner-b/id.pdf','owner-a/../other.pdf','owner-a//id.pdf','owner-a/..']){
      const db=store({});await expect(persistApplicationDocument(db,{...input,storage_path})).rejects.toThrow('storage folder');expect(db.insert).not.toHaveBeenCalled();
    }
  });
  it('acknowledges the real pending row without asserting verification',async()=>{
    const saved={...input,id:'doc-a',status:'pending'},db=store({data:saved,error:null});expect(await persistApplicationDocument(db,input)).toEqual(saved);expect(db.insert).toHaveBeenCalledWith({...input,status:'pending'});
  });
});
