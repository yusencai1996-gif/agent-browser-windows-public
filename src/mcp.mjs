// MCP stdout is reserved for protocol; transport/result logic is shared with CLI.
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {pathToFileURL} from 'node:url';
import {TOOLS} from './tools.mjs';
import {connectTask} from './tool-client.mjs';
export async function runMcp(grant){
  const client=await connectTask(grant);
  const server=new Server({name:'agent-browser-windows',version:'0.8.1'},{capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:TOOLS}));
  server.setRequestHandler(CallToolRequestSchema,async({params})=>client.call(params.name,params.arguments || {}));
  await server.connect(new StdioServerTransport());
  process.stdin.on('end',()=>{void client.close();void server.close();});
}
// Internal historical WP2 fixture; normal callers use CLI mcp --task.
if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url){const grant=JSON.parse(process.env.ABW_GRANT || '{}');delete process.env.ABW_GRANT;await runMcp(grant);}
