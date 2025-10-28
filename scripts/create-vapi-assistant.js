#!/usr/bin/env node
/**
 * Create VAPI Assistant with NowCerts MCP Tools
 *
 * This script creates a VAPI voice AI assistant configured to:
 * 1. Use the ReduceMyInsurance.Net system prompts
 * 2. Connect to the NowCerts MCP server for dynamic tool access
 * 3. Handle insurance quotes naturally over the phone
 *
 * Usage:
 *   VAPI_API_KEY=your_key node create-vapi-assistant.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VAPI_API_KEY = process.env.VAPI_API_KEY || 'ed7f45fa-d541-46e8-81f1-8f1f7b59e233';
const NOWCERTS_MCP_URL = process.env.NOWCERTS_MCP_URL || 'https://mcp.srv992249.hstgr.cloud/sse';
const VAPI_API_URL = 'https://api.vapi.ai';

/**
 * Load and combine system prompts
 */
function loadSystemPrompt() {
  const systemPromptPath = path.join(__dirname, '../prompts/VAPI_SYSTEM_PROMPT.md');
  const agencyContextPath = path.join(__dirname, '../prompts/VAPI_AGENCY_CONTEXT.md');

  const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
  const agencyContext = fs.readFileSync(agencyContextPath, 'utf-8');

  // Combine both prompts
  return `${agencyContext}\n\n---\n\n${systemPrompt}`;
}

/**
 * Create VAPI assistant configuration
 */
function createAssistantConfig(name, systemPrompt) {
  return {
    name: name,
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      systemPrompt: systemPrompt,
      // Note: Based on research, tools should be added at GLOBAL level, not model.tools
      // to ensure proper tool injection
    },
    voice: {
      provider: "11labs",
      voiceId: "rachel", // Professional, friendly female voice
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
      smartFormat: true,
      keywords: [
        "insurance",
        "NowCerts",
        "ReduceMyInsurance",
        "comprehensive",
        "collision",
        "liability"
      ]
    },
    // MCP TOOLS CONFIGURATION (Global Level)
    // This connects to the NowCerts MCP server to dynamically fetch tools
    tools: [
      {
        type: "mcp",
        server: {
          url: NOWCERTS_MCP_URL,
          transport: "sse" // Server-Sent Events protocol
        }
      }
    ],
    firstMessage: "Thanks for calling ReduceMyInsurance.Net! This is Nathan. How can I help you today?",
    voicemailMessage: "You've reached ReduceMyInsurance.Net. Please leave your name and number, and we'll call you right back!",
    endCallMessage: "Thanks for calling! Have a great day!",
    endCallPhrases: [
      "goodbye",
      "bye",
      "thank you bye",
      "that's all",
      "hang up"
    ],
    recordingEnabled: true,
    hipaaEnabled: false,
    clientMessages: [
      "transcript",
      "hang",
      "function-call",
      "speech-update",
      "metadata",
      "conversation-update"
    ],
    serverMessages: [
      "end-of-call-report",
      "status-update",
      "hang",
      "function-call"
    ],
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800, // 30 minutes max
    backgroundSound: "office",
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    modelOutputInMessagesEnabled: true
  };
}

/**
 * Create assistant via VAPI API
 */
async function createAssistant(config) {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create assistant: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * List existing assistants
 */
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

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🤖 Creating VAPI Assistant with NowCerts MCP Integration\n');

    // Check for API key
    if (!VAPI_API_KEY) {
      console.error('❌ Error: VAPI_API_KEY environment variable is required');
      process.exit(1);
    }

    console.log('📄 Loading system prompts...');
    const systemPrompt = loadSystemPrompt();
    console.log(`   ✓ Loaded ${systemPrompt.length} characters\n`);

    console.log('🔧 Creating assistant configuration...');
    const assistantName = 'Nathan - Insurance Quote Assistant';
    const config = createAssistantConfig(assistantName, systemPrompt);
    console.log(`   ✓ Assistant Name: ${assistantName}`);
    console.log(`   ✓ Model: ${config.model.provider}/${config.model.model}`);
    console.log(`   ✓ Voice: ${config.voice.provider}/${config.voice.voiceId}`);
    console.log(`   ✓ MCP Server: ${NOWCERTS_MCP_URL}\n`);

    console.log('📡 Creating assistant via VAPI API...');
    const assistant = await createAssistant(config);
    console.log('   ✓ Assistant created successfully!\n');

    console.log('📋 Assistant Details:');
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Created: ${assistant.createdAt}`);
    console.log(`   URL: https://dashboard.vapi.ai/assistants/${assistant.id}\n`);

    console.log('✅ Setup Complete!\n');
    console.log('Next steps:');
    console.log('1. Visit the VAPI dashboard to test the assistant');
    console.log('2. Configure phone number for inbound calls');
    console.log('3. Test with a sample insurance quote call\n');

    // Save assistant info to file
    const outputPath = path.join(__dirname, 'vapi-assistant.json');
    fs.writeFileSync(outputPath, JSON.stringify(assistant, null, 2));
    console.log(`📁 Assistant details saved to: ${outputPath}\n`);

    return assistant;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createAssistant, listAssistants, createAssistantConfig, loadSystemPrompt };
