import { NextResponse } from 'next/server';
import { MCP_CONNECTORS } from '@/lib/mcp-manifest';

export async function GET() {
  return NextResponse.json({
    standard: 'Model Context Protocol (MCP) v1.0',
    vendor: 'OmniConnect Enterprise Knowledge Platform',
    timestamp: new Date().toISOString(),
    connectorsCount: MCP_CONNECTORS.length,
    connectors: MCP_CONNECTORS,
  });
}
