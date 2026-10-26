import {useCallback,useEffect,useId,useRef,useState} from "react";
import {MapPin} from "lucide-react";
import {Input} from "@/components/ui/input";
import {supabase} from "@/integrations/supabase/client";
import type {MapboxAddressSuggestion} from "@/lib/mapbox-geocoding";

type Props={value:string;onChange:(value:string)=>void;placeholder?:string;inputClassName?:string;label?:string;showIcon?:boolean;disabled?:boolean};
const enabled=import.meta.env.VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED==="true";
const searchable=(value:string)=>value.trim().length>=6 && value.length<=160;
export const ADDRESS_SUGGESTION_DELAY_MS=650;

async function lookup(mode:"suggest"|"confirm",query:string,signal:AbortSignal,selectedId?:string) {
  const {data,error}=await supabase.functions.invoke("search-addresses",{body:{mode,query,selectedId},signal});
  if(error || data?.success!==true || data?.data?.state!=="results" || !Array.isArray(data.data.options))throw new Error("Address lookup unavailable");
  return data.data.options.filter((o:unknown):o is MapboxAddressSuggestion=>Boolean(o && typeof o==="object" &&
    "id" in o && typeof o.id==="string" && o.id.length>0 && o.id.length<=256 &&
    "label" in o && typeof o.label==="string" && o.label.length>=4 && o.label.length<=220 &&
    "featureType" in o && o.featureType==="address")).slice(0,5);
}

export const VerifiedAddressInput=({value,onChange,placeholder,inputClassName,label="Service address",showIcon=true,disabled=false}:Props)=>{
  const [options,setOptions]=useState<MapboxAddressSuggestion[]>([]);
  const [state,setState]=useState<"idle"|"loading"|"results"|"empty"|"error">("idle");
  const [selectedText,setSelectedText]=useState("");
  const [confirming,setConfirming]=useState(false);
  const [active,setActive]=useState(-1);
  const serial=useRef(0),request=useRef<AbortController|null>(null);
  const currentValue=useRef(value),typedValue=useRef<string|null>(null);
  const pendingQuery=useRef<string|null>(null),confirmBusy=useRef(false),blocked=useRef(disabled);
  blocked.current=disabled;
  const listId=useId(),statusId=useId();
  currentValue.current=value;
  useEffect(()=>()=>{serial.current++;request.current?.abort();},[]);

  const findAddress=useCallback(async(query:string)=>{
    if(!enabled || blocked.current || confirmBusy.current || pendingQuery.current===query || !searchable(query) || query!==currentValue.current)return;
    pendingQuery.current=query;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const id=++serial.current;setOptions([]);setActive(-1);setState("loading");
    const timer=window.setTimeout(()=>{if(id===serial.current)setState("error");controller.abort();},10000);
    try{
      const found=await lookup("suggest",query,controller.signal);
      if(id!==serial.current || controller.signal.aborted || query!==currentValue.current)return;
      setOptions(found);setState(found.length?"results":"empty");
    }catch{if(id===serial.current && !controller.signal.aborted)setState("error");}
    finally{window.clearTimeout(timer);if(id===serial.current)pendingQuery.current=null;}
  },[]);

  // Choosing a saved place is an external value change, not a new search.
  useEffect(()=>{
    if(value===typedValue.current || value===selectedText)return;
    serial.current++;request.current?.abort();pendingQuery.current=null;confirmBusy.current=false;
    setOptions([]);setActive(-1);setState("idle");setConfirming(false);
  },[value,selectedText]);

  // Only human editing schedules requests. Saved addresses and selection do not auto-spend.
  useEffect(()=>{
    if(!enabled || value!==typedValue.current || selectedText===value || !searchable(value))return;
    const timer=window.setTimeout(()=>void findAddress(value),ADDRESS_SUGGESTION_DELAY_MS);
    return ()=>window.clearTimeout(timer);
  },[value,selectedText,findAddress]);

  const change=(next:string)=>{
    serial.current++;request.current?.abort();pendingQuery.current=null;confirmBusy.current=false;currentValue.current=next;typedValue.current=next;
    setOptions([]);setActive(-1);setState("idle");setSelectedText("");setConfirming(false);onChange(next);
  };
  const choose=async(option:MapboxAddressSuggestion)=>{
    if(!enabled || blocked.current || confirmBusy.current)return;
    confirmBusy.current=true;pendingQuery.current=null;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const id=++serial.current;setOptions([]);setActive(-1);setConfirming(true);setState("idle");
    const timer=window.setTimeout(()=>{if(id===serial.current){setState("error");setConfirming(false);}controller.abort();},10000);
    try{
      // Temporary suggestions stay only in this component. Persist only a server-capped
      // Permanent confirmation; never trust a selected suburb or browser coordinate as coverage.
      const confirmed=(await lookup("confirm",option.label,controller.signal,option.id)).find(o=>o.id===option.id);
      if(id!==serial.current || controller.signal.aborted)return;
      if(!confirmed)throw new Error("Address confirmation unavailable");
      typedValue.current=null;currentValue.current=confirmed.label;setSelectedText(confirmed.label);onChange(confirmed.label);
    }catch{if(id===serial.current && !controller.signal.aborted)setState("error");}
    finally{window.clearTimeout(timer);if(id===serial.current){confirmBusy.current=false;setConfirming(false);}}
  };

  return <div className="space-y-2">
    <div className="relative">
      {showIcon && <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>}
      <Input aria-label={label} role={enabled?"combobox":undefined} aria-autocomplete={enabled?"list":"none"}
        aria-controls={enabled?listId:undefined} aria-expanded={options.length>0} aria-describedby={enabled?statusId:undefined}
        aria-activedescendant={active>=0 && options[active]?listId+"-"+active:undefined} aria-busy={state==="loading" || confirming}
        value={value} disabled={disabled} onChange={event=>change(event.target.value)} placeholder={placeholder??"Start typing your street address..."}
        autoComplete="street-address" inputMode="text" enterKeyHint="done" maxLength={160}
        className={`h-12 rounded-xl text-base ${showIcon?"pl-10":""} ${inputClassName??""}`}
        onKeyDown={event=>{
          if(event.key==="Escape"){serial.current++;request.current?.abort();pendingQuery.current=null;confirmBusy.current=false;setOptions([]);setActive(-1);setState("idle");setConfirming(false);}
          if((event.key==="ArrowDown" || event.key==="ArrowUp") && options.length){
            event.preventDefault();const direction=event.key==="ArrowDown"?1:-1;
            setActive(old=>old<0?(direction>0?0:options.length-1):(old+direction+options.length)%options.length);
          }
          if(event.key==="Enter" && enabled){
            event.preventDefault();if(active>=0 && options[active])void choose(options[active]);else if(!confirming)void findAddress(value);
          }
        }}/>
    </div>
    {options.length>0 && <ul id={listId} role="listbox" aria-label="South African address suggestions"
      className="max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-md">
      {options.map((option,index)=><li key={option.id} role="presentation"><button id={listId+"-"+index} type="button"
        role="option" aria-selected={active===index} onClick={()=>void choose(option)}
        className="w-full px-3 py-3 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {option.label}</button></li>)}
    </ul>}
    {enabled && <p id={statusId} role="status" className="text-xs text-muted-foreground">
      {confirming?"Confirming your address…":state==="loading"?"Finding addresses…":state==="error"?
        "Address suggestions are unavailable. You can enter your address manually.":state==="empty"?
        "No suggestions found. Check the street number and spelling.":selectedText===value && selectedText?
        "Address selected. Add unit and entrance details if needed.":"Start typing your street address, then choose a suggestion."}
    </p>}
    {enabled && state==="error" && <button type="button" disabled={disabled || !searchable(value) || confirming}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      onClick={()=>void findAddress(value)}>Try address lookup again</button>}
    {(options.length>0 || Boolean(selectedText)) && <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer"
      className="block text-[10px] text-muted-foreground">© Mapbox</a>}
  </div>;
};
