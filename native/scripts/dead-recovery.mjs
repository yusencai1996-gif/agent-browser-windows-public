// Recovery never replays a tool request. Native/Windows checks own all sensitive state.
const failure=code=>Object.assign(new Error(code),{code});
export async function existingOrRecover({status,assess,retire,prepare}){
 try{const live=await status();if(!live?.ok)throw failure('RECOVERY_STATUS_UNKNOWN');return {...live,data:{...live.data,created:false}};}
 catch(error){
  // Exit5 only permits assessment: it may mean busy/access-denied, not death.
  // The independent Windows assessment must prove FILE_NOT_FOUND and death.
  if(error.code!=='IPC_OUTCOME_UNKNOWN_5')throw error;
 }
 return retireConfirmedState({assess,retire,prepare});
}
export async function retireConfirmedState({assess,retire,prepare}){
 const before=await assess();
 if(before?.dead!==true||before.exclusive!==true||!/^([a-f0-9]{64})$/.test(before.snapshot??''))throw failure('DEAD_RECOVERY_UNPROVEN');
 const archived=await retire(before.snapshot);
 if(archived?.retired!==true||archived.snapshot!==before.snapshot)throw failure('DEAD_RECOVERY_INCOMPLETE');
 await prepare();return null;
}
