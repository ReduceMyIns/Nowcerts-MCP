#!/usr/bin/env node
/**
 * List VAPI Assistants
 *
 * This script lists all VAPI assistants in your account
 *
 * Usage:
 *   VAPI_API_KEY=your_key node list-vapi-assistants.js
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY || 'ed7f45fa-d541-46e8-81f1-8f1f7b59e233';
const VAPI_API_URL = 'https://api.vapi.ai';

async function listAssistants() {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list assistants: ${response.status} ${error}`);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('📋 Listing VAPI Assistants...\n');

    const assistants = await listAssistants();

    if (!assistants || assistants.length === 0) {
      console.log('No assistants found.\n');
      return;
    }

    console.log(`Found ${assistants.length} assistant(s):\n`);

    assistants.forEach((assistant, index) => {
      console.log(`${index + 1}. ${assistant.name || 'Unnamed'}`);
      console.log(`   ID: ${assistant.id}`);
      console.log(`   Model: ${assistant.model?.provider}/${assistant.model?.model}`);
      console.log(`   Voice: ${assistant.voice?.provider}/${assistant.voice?.voiceId}`);
      console.log(`   Tools: ${assistant.tools?.length || 0}`);
      console.log(`   Created: ${assistant.createdAt}`);
      console.log(`   URL: https://dashboard.vapi.ai/assistants/${assistant.id}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
