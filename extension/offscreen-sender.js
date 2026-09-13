// Offscreen documents cannot call getManifest. Only the existing SW identity
// reply supplies the exact generated entry; this is not an arbitrary URL input.
export function identityWorkerUrl(value,extensionId,getUrl){return value?.extId===extensionId&&typeof value.workerEntry==='string'&&/^background(?:\.[0-9a-f]{24})?\.js$/.test(value.workerEntry)?getUrl(value.workerEntry):null;}
export function trustedWorkerSender(sender,extensionId,url){return !!url&&sender?.id===extensionId&&!sender.tab&&(!sender.url||sender.url===url);}
