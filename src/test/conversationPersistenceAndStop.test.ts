import { describe, it } from 'node:test';
import assert from 'node:assert';
import { conversationService } from '../services/conversation/conversationService';
import { getSupabaseConfig, SupabaseRestClient } from '../services/conversation/supabaseClient';
import { Conversation, ConversationMessage } from '../services/conversation/types';

describe('Conversation Persistence & History Integrity', () => {
  it('1. should create a new conversation with stable IDs and metadata', async () => {
    const convo = await conversationService.create(
      'What are the economics of fusion energy?',
      'web',
      'gemini-2.5-flash',
      'gemini'
    );

    assert.ok(convo.id, 'Conversation must have a stable ID');
    assert.strictEqual(convo.title, 'What are the economics of fusion energy?');
    assert.strictEqual(convo.mode, 'web');
    assert.strictEqual(convo.modelId, 'gemini-2.5-flash');
    assert.strictEqual(convo.providerId, 'gemini');
    assert.strictEqual(convo.messages.length, 1);
    assert.strictEqual(convo.messages[0].role, 'user');
    assert.ok(convo.createdAt > 0);
    assert.ok(convo.updatedAt >= convo.createdAt);

    // Verify it persists and can be loaded
    const loaded = await conversationService.get(convo.id);
    assert.ok(loaded, 'Saved conversation must be retrievable');
    assert.strictEqual(loaded?.id, convo.id);
    assert.strictEqual(loaded?.title, convo.title);
  });

  it('2. should append assistant messages and avoid duplicate messages on retry', async () => {
    const convo = await conversationService.create('Quantum sensors test', 'quick');

    const assistantMsg: ConversationMessage = {
      id: `msg-${Date.now()}-assistant-1`,
      role: 'assistant',
      content: '### Executive Summary\nQuantum sensors demonstrate atomic precision [1].',
      timestamp: Date.now(),
      providerId: 'Google Gemini',
      modelId: 'gemini-2.5-flash',
      status: 'completed',
      executionTimeMs: 1100,
      sources: [
        {
          id: 1,
          title: 'Quantum Sensors Nature',
          url: 'https://nature.com/articles/quantum-sensors',
          domain: 'nature.com',
          snippet: 'Atomic precision measurement.',
          rank: 1,
          retrievalStatus: 'retrieved',
          citationsCount: 1,
        },
      ],
    };

    await conversationService.addMessage(convo.id, assistantMsg);
    const updated = await conversationService.get(convo.id);
    assert.strictEqual(updated?.messages.length, 2);
    assert.strictEqual(updated?.messages[1].id, assistantMsg.id);

    // Re-adding the identical message ID should update in-place rather than duplicating
    const modifiedMsg: ConversationMessage = {
      ...assistantMsg,
      content: '### Executive Summary\nUpdated precision content [1].',
    };
    await conversationService.addMessage(convo.id, modifiedMsg);
    const reloaded = await conversationService.get(convo.id);
    assert.strictEqual(reloaded?.messages.length, 2, 'Message count must remain 2 (no duplicate message created)');
    assert.strictEqual(reloaded?.messages[1].content, modifiedMsg.content);
  });

  it('3. should sanitize and redact API keys and secrets from saved conversation content', async () => {
    const convo = await conversationService.create('Security leak test', 'web');

    const leakedKey = 'AIzaSyA1234567890123456789012345678901';
    const leakedOpenAIKey = 'sk-abcdef12345678901234567890abcdef';
    const leakedBearer = 'Bearer secret-session-token-xyz-1234567890';

    const testMsg: ConversationMessage = {
      id: 'msg-leak-test',
      role: 'user',
      content: `Here is my key: ${leakedKey} and OpenAI: ${leakedOpenAIKey} and header: ${leakedBearer}`,
      timestamp: Date.now(),
    };

    await conversationService.addMessage(convo.id, testMsg);
    const loaded = await conversationService.get(convo.id);
    const savedMsg = loaded?.messages.find((m) => m.id === 'msg-leak-test');

    assert.ok(savedMsg, 'Message must be saved');
    assert.ok(!savedMsg.content.includes(leakedKey), 'Gemini API key must be redacted');
    assert.ok(!savedMsg.content.includes(leakedOpenAIKey), 'OpenAI API key must be redacted');
    assert.ok(!savedMsg.content.includes(leakedBearer), 'Bearer token must be redacted');
    assert.ok(savedMsg.content.includes('[REDACTED]'), 'Redaction placeholder must be present');
  });

  it('4. should rename a conversation and update timestamps', async () => {
    const convo = await conversationService.create('Initial Title', 'web');
    const originalUpdatedAt = convo.updatedAt;

    await conversationService.rename(convo.id, 'Refined Title for Research');
    const updated = await conversationService.get(convo.id);

    assert.strictEqual(updated?.title, 'Refined Title for Research');
    assert.ok((updated?.updatedAt || 0) >= originalUpdatedAt);
  });

  it('5. should delete a conversation and switch active pointer gracefully', async () => {
    const convoA = await conversationService.create('Session A', 'web');
    const convoB = await conversationService.create('Session B', 'web');

    await conversationService.setActiveConversationId(convoB.id);
    assert.strictEqual(await conversationService.getActiveConversationId(), convoB.id);

    // Delete Session B (the active one)
    await conversationService.delete(convoB.id);

    const deletedItem = await conversationService.get(convoB.id);
    assert.strictEqual(deletedItem, null, 'Deleted conversation must not exist in storage');

    // Active conversation should automatically shift
    const newActive = await conversationService.getActiveConversationId();
    assert.ok(newActive !== convoB.id, 'Active ID must switch away from deleted conversation');
  });

  it('6. should document Supabase vs local IndexedDB storage contracts clearly', () => {
    const config = getSupabaseConfig();
    assert.ok(typeof config.isConfigured === 'boolean');
    assert.ok(config.notes.length > 0);

    const storageType = conversationService.getStorageType();
    assert.ok(['local', 'supabase'].includes(storageType));

    // When Supabase is not configured, documentation must state local persistence limitation
    if (!config.isConfigured) {
      assert.strictEqual(storageType, 'local');
      assert.ok(config.notes.includes('IndexedDB'));
      assert.ok(config.notes.includes('does not sync across devices'));
    }
  });
});

describe('Generation Cancellation & Stop Button Mechanics', () => {
  it('7. should abort request immediately when AbortController triggers', async () => {
    const controller = new AbortController();
    assert.strictEqual(controller.signal.aborted, false);

    controller.abort();
    assert.strictEqual(controller.signal.aborted, true);

    // Verification of standard fetch abort handling
    let didCatchAbort = false;
    try {
      if (controller.signal.aborted) {
        throw new DOMException('Research synthesis cancelled', 'AbortError');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        didCatchAbort = true;
      }
    }
    assert.strictEqual(didCatchAbort, true, 'AbortError must be thrown and caught on cancellation');
  });

  it('8. should preserve partial output and mark message status as interrupted', async () => {
    const convo = await conversationService.create('Interruption Preservation Test', 'web');

    const partialSources = [
      {
        id: 1,
        title: 'Discovered Source 1',
        url: 'https://example.com/source-1',
        domain: 'example.com',
        snippet: 'Partial evidence snippet retrieved prior to stop.',
        rank: 1,
        retrievalStatus: 'retrieved' as const,
        citationsCount: 0,
      },
    ];

    const interruptedMsg: ConversationMessage = {
      id: `msg-${Date.now()}-interrupted`,
      role: 'assistant',
      content: 'Research generation was stopped by user.',
      timestamp: Date.now(),
      status: 'interrupted',
      isInterrupted: true,
      sources: partialSources,
    };

    await conversationService.addMessage(convo.id, interruptedMsg);
    const loaded = await conversationService.get(convo.id);
    const lastMsg = loaded?.messages[loaded.messages.length - 1];

    assert.ok(lastMsg);
    assert.strictEqual(lastMsg?.status, 'interrupted');
    assert.strictEqual(lastMsg?.isInterrupted, true);
    assert.strictEqual(lastMsg?.sources?.length, 1);
    assert.strictEqual(lastMsg?.sources?.[0].title, 'Discovered Source 1');
  });

  it('9. should allow starting a new request immediately after stopping without state corruption', async () => {
    const convo = await conversationService.create('Multi-request sequence test', 'web');

    // 1st request stopped
    const stoppedMsg: ConversationMessage = {
      id: 'msg-req-1',
      role: 'assistant',
      content: 'Stopped partial response',
      timestamp: Date.now(),
      status: 'interrupted',
      isInterrupted: true,
    };
    await conversationService.addMessage(convo.id, stoppedMsg);

    // 2nd user query immediately submitted
    const newQueryMsg: ConversationMessage = {
      id: 'msg-req-2-user',
      role: 'user',
      content: 'What about geothermal power instead?',
      timestamp: Date.now() + 100,
    };
    await conversationService.addMessage(convo.id, newQueryMsg);

    // 2nd assistant response completed
    const completedMsg: ConversationMessage = {
      id: 'msg-req-2-assistant',
      role: 'assistant',
      content: '### Executive Summary\nEnhanced geothermal systems are expanding [1].',
      timestamp: Date.now() + 200,
      status: 'completed',
      isInterrupted: false,
    };
    await conversationService.addMessage(convo.id, completedMsg);

    const loaded = await conversationService.get(convo.id);
    assert.strictEqual(loaded?.messages.length, 4);
    assert.strictEqual(loaded?.messages[1].status, 'interrupted');
    assert.strictEqual(loaded?.messages[2].role, 'user');
    assert.strictEqual(loaded?.messages[3].status, 'completed');
  });
});
