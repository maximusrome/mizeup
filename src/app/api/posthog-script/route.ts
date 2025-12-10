import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({}, { status: 401 })

  // Get the base URL for the ingest endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mizeup.com'

  // Strategy v7.0 - Use rrweb directly, bypass PostHog client entirely
  // 
  // This approach:
  // 1. Loads only rrweb recorder via @require (no PostHog client)
  // 2. Captures DOM events directly with rrweb.record()
  // 3. Batches events and sends to our backend via GM_xmlhttpRequest
  // 4. Our backend forwards to PostHog (server-side, no CSP issues)
  //
  const script = `// ==UserScript==
// @name MizeUp Session Recording
// @namespace https://mizeup.com
// @version 7.0
// @description Records sessions via rrweb direct - sends to MizeUp backend
// @match *://*.therapynotes.com/*
// @run-at document-start
// @grant GM_xmlhttpRequest
// @grant GM_getValue
// @grant GM_setValue
// @grant unsafeWindow
// @connect www.mizeup.com
// @connect mizeup.com
// @connect localhost
// @connect *
// @require https://us-assets.i.posthog.com/static/recorder.js
// ==/UserScript==

(function() {
  'use strict';
  
  console.log('[MizeUp] Script v7.0 starting - Direct rrweb recording');
  
  if (window.__mizeupRecorder) {
    console.log('[MizeUp] Already initialized');
    return;
  }
  window.__mizeupRecorder = true;
  
  // Configuration
  var CONFIG = {
    userId: '${user.id}',
    userEmail: '${user.email || ''}',
    ingestUrl: '${baseUrl}/api/recordings/ingest',
    batchSize: 50,          // Send every 50 events
    batchInterval: 5000,    // Or every 5 seconds
    maxRetries: 3
  };
  
  // Generate unique session and window IDs
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Get or create session ID (persists across page loads within session)
  var sessionId = GM_getValue('mizeup_session_id', null);
  var sessionStart = GM_getValue('mizeup_session_start', 0);
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  if (!sessionId || (Date.now() - sessionStart) > SESSION_TIMEOUT) {
    sessionId = generateId();
    GM_setValue('mizeup_session_id', sessionId);
    GM_setValue('mizeup_session_start', Date.now());
    console.log('[MizeUp] New session:', sessionId);
  } else {
    console.log('[MizeUp] Continuing session:', sessionId);
  }
  
  var windowId = generateId();
  console.log('[MizeUp] Window ID:', windowId);
  
  // Event buffer
  var eventBuffer = [];
  var isSending = false;
  var retryCount = 0;
  
  // Send events to backend
  function sendEvents(events, callback) {
    if (events.length === 0) {
      if (callback) callback(true);
      return;
    }
    
    console.log('[MizeUp] Sending', events.length, 'events to backend...');
    
    GM_xmlhttpRequest({
      method: 'POST',
      url: CONFIG.ingestUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        events: events,
        sessionId: sessionId,
        windowId: windowId,
        userId: CONFIG.userId,
        url: window.location.href,
        timestamp: Date.now()
      }),
      onload: function(response) {
        if (response.status >= 200 && response.status < 300) {
          console.log('[MizeUp] ✅ Sent', events.length, 'events successfully');
          retryCount = 0;
          if (callback) callback(true);
        } else {
          console.error('[MizeUp] ❌ Failed to send events:', response.status, response.responseText);
          retryCount++;
          if (callback) callback(false);
        }
      },
      onerror: function(error) {
        console.error('[MizeUp] ❌ Network error sending events:', error);
        retryCount++;
        if (callback) callback(false);
      }
    });
  }
  
  // Flush buffer
  function flushBuffer() {
    if (isSending || eventBuffer.length === 0) return;
    
    isSending = true;
    var eventsToSend = eventBuffer.slice();
    eventBuffer = [];
    
    sendEvents(eventsToSend, function(success) {
      isSending = false;
      if (!success && retryCount < CONFIG.maxRetries) {
        // Put events back in buffer for retry
        eventBuffer = eventsToSend.concat(eventBuffer);
      }
    });
  }
  
  // Initialize recording when DOM is ready
  function initRecording() {
    console.log('[MizeUp] Checking rrweb availability...');
    console.log('[MizeUp] typeof rrweb:', typeof rrweb);
    
    if (typeof rrweb === 'undefined') {
      console.error('[MizeUp] rrweb not loaded!');
      return;
    }
    
    console.log('[MizeUp] rrweb.record:', typeof rrweb.record);
    
    if (typeof rrweb.record !== 'function') {
      console.error('[MizeUp] rrweb.record is not a function!');
      return;
    }
    
    console.log('[MizeUp] Starting rrweb recording...');
    
    try {
      var stopFn = rrweb.record({
        emit: function(event) {
          // Add event to buffer
          eventBuffer.push(event);
          
          // Flush if buffer is full
          if (eventBuffer.length >= CONFIG.batchSize) {
            flushBuffer();
          }
        },
        // Privacy settings - mask sensitive data
        maskAllInputs: true,
        maskTextSelector: '.sensitive, [data-sensitive]',
        blockSelector: '.no-record, [data-no-record]',
        // Performance settings
        sampling: {
          mousemove: true,
          mouseInteraction: true,
          scroll: 150,    // Throttle scroll events
          media: 800,     // Throttle media events
          input: 'last'   // Only record last input value
        },
        // Record canvas
        recordCanvas: false,
        // Collect fonts
        collectFonts: false
      });
      
      console.log('[MizeUp] ✅ rrweb recording started!');
      
      // Expose stop function for debugging
      if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.__mizeupStop = stopFn;
        unsafeWindow.__mizeupFlush = flushBuffer;
      }
      
      // Set up periodic flush
      setInterval(flushBuffer, CONFIG.batchInterval);
      
      // Flush on page unload
      window.addEventListener('beforeunload', function() {
        // Update session timestamp
        GM_setValue('mizeup_session_start', Date.now());
        // Synchronous flush attempt
        if (eventBuffer.length > 0) {
          flushBuffer();
        }
      });
      
      // Flush on visibility change (user switches tabs)
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          flushBuffer();
        }
      });
      
    } catch (e) {
      console.error('[MizeUp] Failed to start recording:', e);
    }
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Small delay to ensure rrweb is fully initialized
      setTimeout(initRecording, 100);
    });
  } else {
    setTimeout(initRecording, 100);
  }
})();`

  return new NextResponse(script, { headers: { 'Content-Type': 'application/javascript' } })
}
