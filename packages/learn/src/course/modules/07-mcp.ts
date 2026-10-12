import type { Module } from '../types';
import { draftLesson } from '../draft';

export const mcp: Module = {
  slug: 'mcp',
  number: 7,
  title: 'MCP',
  summary: 'A standard way for a model host to reach tools and data over a protocol.',
  lessons: [
    draftLesson('host-client-server-jsonrpc', '7.1', 'Host, client, server, and JSON-RPC', 'Host, client, JSON-RPC'),
    draftLesson('stdio-server', '7.2', 'A stdio server with tools'),
    draftLesson('resources-and-prompts', '7.3', 'Resources and prompts'),
    draftLesson('http-transport-and-tokens', '7.4', 'HTTP transport and tokens', 'HTTP transport, tokens'),
    draftLesson('writing-a-client', '7.5', 'Writing a client'),
  ],
};
