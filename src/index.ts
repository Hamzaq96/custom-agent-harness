import 'dotenv/config';
import { mkdir, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import { callModel } from './openrouter.ts';
import { runTui } from './tui/index.tsx';
import type { AgentHooks, Message } from './types.ts';
import { runAgent } from './agents.ts';
import { loadSession, saveSession } from './session.ts';
import { tools } from './tools.ts';

async function respond(message: string): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: 'You are a helpful AI coding assistant',
    },
    {
      role: 'user',
      content: message,
    },
  ];

  const assistant = await callModel(messages, []);
  return assistant.content ?? 'No text returned';
}

async function main(): Promise<void> {
  const configuredRoot = resolve(process.cwd(), 'workspace');
  await mkdir(configuredRoot, { recursive: true });
  const workspaceRoot = await realpath(configuredRoot);
  let messages = await loadSession();

  async function respond(message: string, hooks: AgentHooks): Promise<string> {
    const result = await runAgent(
      message,
      { ...hooks, workspaceRoot },
      messages,
      tools,
    );
    messages = result.messages;
    await saveSession(messages);
    return result.answer;
  }

  runTui(respond);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
})
