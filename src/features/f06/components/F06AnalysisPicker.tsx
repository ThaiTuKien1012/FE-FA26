import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {RecommendationBrowser,recommendationReadError} from '../f06.browse';
import {readRecommendationSource} from '../f06.source';
import {assertRecommendationSession,recommendationSession} from '../f06.http';
import {F06RankedSource} from './F06RankedSource';
import {miningButton} from '../../f05/f05.display';

/** A replacement is validated before changing the URL. The current library,
 * filters and source remain mounted in the parent until the user confirms a valid run. */
export function F06AnalysisPicker({onSelectRun,onCancel}:{onSelectRun:(id:number)=>void;onCancel:()=>void}){
 const [workflow]=useState(()=>new RecommendationBrowser()),[checking,setChecking]=useState(false),[error,setError]=useState('');
 const state=useSyncExternalStore(workflow.subscribe,workflow.getSnapshot,workflow.getSnapshot),job=useRef<AbortController|null>(null);
 useEffect(()=>{workflow.start();return()=>{job.current?.abort();workflow.stop();};},[workflow]);
 const choose=async(id:number)=>{
  if(checking)return;job.current?.abort();const controller=new AbortController(),session=recommendationSession();job.current=controller;setChecking(true);setError('');
  try{await readRecommendationSource(id,controller.signal);assertRecommendationSession(session);if(!controller.signal.aborted)onSelectRun(id);}
  catch(error){if(!controller.signal.aborted)setError(recommendationReadError(error));}
  finally{if(!controller.signal.aborted)setChecking(false);}
 };
 return <section data-analysis-picker className="space-y-4 rounded-2xl border border-[#E7E2D8] bg-white p-4 sm:p-5"><button type="button" className={miningButton} onClick={onCancel}>Back to Current Analysis</button>{checking?<p role="status" className="text-sm text-[#6D7974]">Checking selected analysis...</p>:<F06RankedSource state={state} workflow={workflow} onSelectRun={id=>void choose(id)}/>} {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}</section>;
}
