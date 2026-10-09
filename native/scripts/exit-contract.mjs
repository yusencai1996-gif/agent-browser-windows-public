import {result} from './wire.mjs';
// Failure evidence is retained. No retry of native close and no process kill.
export async function persistShutdown({native,metadata,taskFiles,receiptFile,fsOps,servicePid,forcedFailure=null}){
 let proof;try{proof=await native.close();}catch{proof={cleanupPermitted:false,runMustBeRetained:true,reason:'CLOSE_UNKNOWN',hostExit:null,observerExit:null,processKilled:false};}
 const verified=proof.cleanupPermitted===true&&proof.hostExit===0&&proof.observerExit===0&&proof.processKilled===false;
 const receipt={...proof,cleanupPermitted:verified,runMustBeRetained:!verified,servicePid,serviceExitPlanned:verified&&!forcedFailure?0:1,privateCapabilitiesLogged:false,recoveryMetadataRetained:!verified,taskStateRetained:!verified,...(forcedFailure?{outputOutcomeUnknown:true,outputFailure:forcedFailure}:{})};
 await fsOps.writeFile(receiptFile,JSON.stringify(receipt));
 if(verified){for(const file of taskFiles)await fsOps.unlink(file).catch(()=>{});await fsOps.unlink(metadata).catch(()=>{});}
 return receipt;
}
export function stopEnvelope(receipt){return result(receipt.cleanupPermitted===true&&receipt.serviceExitPlanned===0,receipt,receipt.reason||'OUTCOME_UNKNOWN');}
