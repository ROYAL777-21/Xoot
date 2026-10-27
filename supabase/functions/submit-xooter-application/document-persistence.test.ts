import {afterAll,describe,expect,it,vi} from "vitest";
import {webcrypto} from "node:crypto";
import {Blob} from "node:buffer";
import {inspectDocumentBytes,MAX_DOCUMENT_BYTES,persistApplicationDocument} from "./document-persistence";

const input={user_id:"owner-a",application_id:"app-a",doc_type:"id",storage_path:"owner-a/id-fresh.pdf"};
const pdf=new TextEncoder().encode("%PDF-1.7\nSynthetic inert document fixture\n%%EOF");
const saved={...input,id:"doc-a",status:"pending",safety_status:"quarantined"};
const object={id:"object-a",updated_at:"2026-10-26T00:00:00Z",metadata:{size:pdf.length,mimetype:"application/pdf"}};
function fixture() {
  const inspect=vi.fn().mockResolvedValue({data:object,error:null});
  const register=vi.fn().mockResolvedValue({data:saved,error:null});
  const download=vi.fn().mockResolvedValue({data:new Blob([pdf]),error:null});
  const rpc=vi.fn((name:string,args:unknown)=>name==="inspect_quarantined_kyc_object"?inspect(args):register(args));
  return {rpc,inspect,register,download,storage:{from:()=>({download})}};
}
vi.stubGlobal("crypto",webcrypto);
afterAll(()=>vi.unstubAllGlobals());
describe("private document quarantine",()=>{
  it("binds the stored receipt to the actual bytes, owner and object revision",async()=>{
    const db=fixture();expect(await persistApplicationDocument(db,input)).toEqual(saved);
    const expected=Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256",pdf))).map(b=>b.toString(16).padStart(2,"0")).join("");
    expect(db.inspect).toHaveBeenCalledWith({p_user_id:input.user_id,p_application_id:input.application_id,p_storage_path:input.storage_path});
    expect(db.register).toHaveBeenCalledWith(expect.objectContaining({p_user_id:input.user_id,p_application_id:input.application_id,p_object_id:object.id,p_object_updated_at:object.updated_at,p_sha256:expected,p_byte_length:pdf.length}));
  });
  it("rejects foreign and traversing pointers before any read",async()=>{
    for(const storage_path of ["other/id.pdf","owner-a/../other.pdf","owner-a//id.pdf","owner-a/.."]){
      const db=fixture();await expect(persistApplicationDocument(db,{...input,storage_path})).rejects.toThrow("storage folder");expect(db.rpc).not.toHaveBeenCalled();expect(db.download).not.toHaveBeenCalled();
    }
  });
  it("does not download missing, over-limit or unapproved-type objects",async()=>{
    for(const data of [null,{...object,metadata:{size:MAX_DOCUMENT_BYTES+1,mimetype:"application/pdf"}},{...object,metadata:{size:0,mimetype:"application/pdf"}},{...object,metadata:{size:pdf.length,mimetype:"text/html"}}]){
      const db=fixture();db.inspect.mockResolvedValue({data,error:null});await expect(persistApplicationDocument(db,input)).rejects.toThrow("inspection");expect(db.download).not.toHaveBeenCalled();expect(db.register).not.toHaveBeenCalled();
    }
  });
  it("rejects missing or replaced download bytes before registration",async()=>{
    for(const result of [{data:null,error:{message:"not found"}},{data:new Blob(["changed"]),error:null}]){
      const db=fixture();db.download.mockResolvedValue(result);await expect(persistApplicationDocument(db,input)).rejects.toThrow("changed or unavailable");expect(db.register).not.toHaveBeenCalled();
    }
  });
  it("rejects MIME and extension spoofing without asserting a clean scan",async()=>{
    await expect(inspectDocumentBytes(new TextEncoder().encode("<script>synthetic</script>"),"application/pdf","id.pdf")).rejects.toThrow("contents");
    await expect(inspectDocumentBytes(pdf,"application/pdf","id.jpg")).rejects.toThrow("extension");
    await expect(inspectDocumentBytes(new Uint8Array(),"application/pdf","id.pdf")).rejects.toThrow("size");
    await expect(inspectDocumentBytes(new Uint8Array(MAX_DOCUMENT_BYTES+1),"image/png","id.png")).rejects.toThrow("size");
  });
  it("rejects unknown document categories",async()=>{
    const db=fixture();await expect(persistApplicationDocument(db,{...input,doc_type:"background_pass"})).rejects.toThrow("document type");expect(db.rpc).not.toHaveBeenCalled();
  });
  it("acknowledges an exact current receipt on retry without downloading or hashing again",async()=>{
    const db=fixture();db.inspect.mockResolvedValue({data:{document:saved},error:null});
    expect(await persistApplicationDocument(db,input)).toEqual(saved);expect(db.download).not.toHaveBeenCalled();expect(db.register).not.toHaveBeenCalled();
  });
  it("rejects a mismatched retry receipt without downloading it",async()=>{
    const db=fixture();db.inspect.mockResolvedValue({data:{document:{...saved,doc_type:'selfie'}},error:null});
    await expect(persistApplicationDocument(db,input)).rejects.toThrow('quarantine could not be confirmed');expect(db.download).not.toHaveBeenCalled();
  });
  it("requires the atomic RPC to acknowledge a matching pending quarantine receipt",async()=>{
    for(const result of [{data:null,error:{code:"40001"}},{data:null,error:null},{data:{...saved,user_id:"other"},error:null},{data:{...saved,safety_status:"clean"},error:null},{data:{...saved,status:"approved"},error:null}]){
      const db=fixture();db.register.mockResolvedValue(result);await expect(persistApplicationDocument(db,input)).rejects.toThrow("quarantine could not be confirmed");
    }
  });
  it("fingerprints all allowed types without claiming authenticity or antivirus clearance",async()=>{
    const cases:[string,string,number[]][]=[["image/jpeg","image.jpg",[255,216,255,0]],["image/png","image.png",[137,80,78,71,13,10,26,10]],["image/webp","image.webp",[82,73,70,70,4,0,0,0,87,69,66,80]]];
    for(const [type,path,signature] of cases) {
      const result=await inspectDocumentBytes(new Uint8Array(signature),type,path);
      expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);expect(result).not.toHaveProperty("clean");expect(result).not.toHaveProperty("verified");
    }
  });
});
