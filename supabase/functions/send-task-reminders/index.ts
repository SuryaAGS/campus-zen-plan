import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get VAPID keys
    const { data: vapidPublicData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vapid_public_key")
      .single();

    const { data: vapidPrivateData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vapid_private_key")
      .single();

    if (!vapidPublicData || !vapidPrivateData) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Call setup-push first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = JSON.parse(vapidPublicData.value);
    const vapidPrivateKey = JSON.parse(vapidPrivateData.value);

    // Get today and tomorrow dates
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Get all incomplete tasks due today or tomorrow
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title, date, time, priority, alarm_enabled")
      .eq("completed", false);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No tasks due today or tomorrow", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowMs = now.getTime();
    const ONE_MIN = 60 * 1000;

    const tasksByUser: Record<string, {
      dueToday: typeof tasks;
      dueTomorrow: typeof tasks;
      dueNow: typeof tasks;
      dueTwoMin: typeof tasks;
      dueFiveMin: typeof tasks;
    }> = {};

    for (const task of tasks) {
      if (!tasksByUser[task.user_id]) {
        tasksByUser[task.user_id] = { dueToday: [], dueTomorrow: [], dueNow: [], dueTwoMin: [], dueFiveMin: [] };
      }

      if (task.time && task.date === todayStr) {
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        if (!isNaN(taskDateTime.getTime())) {
          const diff = taskDateTime.getTime() - nowMs;
          if (diff >= -ONE_MIN && diff <= ONE_MIN) {
            tasksByUser[task.user_id].dueNow.push(task);
            continue;
          }
          if (diff > 1 * ONE_MIN && diff <= 3 * ONE_MIN) {
            tasksByUser[task.user_id].dueTwoMin.push(task);
            continue;
          }
          if (diff > 4 * ONE_MIN && diff <= 6 * ONE_MIN) {
            tasksByUser[task.user_id].dueFiveMin.push(task);
            continue;
          }
        }
      }

      if (task.date === todayStr) {
        tasksByUser[task.user_id].dueToday.push(task);
      } else {
        tasksByUser[task.user_id].dueTomorrow.push(task);
      }
    }

    // Get push subscriptions for users with tasks
    const userIds = Object.keys(tasksByUser);
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const userTasks = tasksByUser[sub.user_id];
      if (!userTasks) continue;

      const notifications: { title: string; body: string }[] = [];

      // 5-minute warning
      if (userTasks.dueFiveMin.length > 0) {
        for (const task of userTasks.dueFiveMin) {
          notifications.push({
            title: "⏳ 5 Minutes Left",
            body: `"${task.title}" starts at ${task.time} — 5 minutes!`,
          });
        }
      }

      // 2-minute warning
      if (userTasks.dueTwoMin.length > 0) {
        for (const task of userTasks.dueTwoMin) {
          notifications.push({
            title: "⚡ 2 Minutes Left",
            body: `"${task.title}" starts at ${task.time} — 2 minutes!`,
          });
        }
      }

      // Exact time notifications
      if (userTasks.dueNow.length > 0) {
        for (const task of userTasks.dueNow) {
          notifications.push({
            title: "⏰ Task Due Now",
            body: `"${task.title}" is due NOW!`,
          });
        }
      }

      // Date-based notifications
      if (userTasks.dueToday.length > 0) {
        notifications.push({
          title: "⚠️ Tasks Due Today",
          body: userTasks.dueToday.length === 1
            ? `"${userTasks.dueToday[0].title}" is due today!`
            : `${userTasks.dueToday.length} tasks are due today!`,
        });
      }

      if (userTasks.dueTomorrow.length > 0) {
        notifications.push({
          title: "📅 Tasks Due Tomorrow",
          body: userTasks.dueTomorrow.length === 1
            ? `"${userTasks.dueTomorrow[0].title}" is due tomorrow`
            : `${userTasks.dueTomorrow.length} tasks are due tomorrow`,
        });
      }

      for (const notif of notifications) {
        try {
          await sendPushNotification(
            sub,
            { ...notif, icon: "/pwa-192x192.png" },
            vapidPublicKey,
            vapidPrivateKey,
            supabaseUrl
          );
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${sub.endpoint}:`, err);
          errors.push(sub.endpoint);

          if (err.message?.includes("410") || err.message?.includes("expired")) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Notifications sent", sent: sentCount, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-task-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Web Push implementation using Web Crypto API
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string },
  vapidPublicKey: JsonWebKey,
  vapidPrivateKey: JsonWebKey,
  audience: string
) {
  const endpoint = new URL(subscription.endpoint);
  
  // Create VAPID JWT
  const vapidJwt = await createVapidJwt(vapidPrivateKey, endpoint.origin, audience);
  
  // Import keys for encryption
  const p256dhKey = await importPublicKey(subscription.p256dh);
  const authSecret = base64UrlDecode(subscription.auth);
  
  // Generate encryption keys
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: p256dhKey },
    localKeyPair.privateKey,
    256
  );
  
  // Get local public key in raw format
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);
  
  // Get subscriber public key in raw format
  const subscriberPublicKeyRaw = await crypto.subtle.exportKey("raw", p256dhKey);
  const subscriberPublicKeyBytes = new Uint8Array(subscriberPublicKeyRaw);
  
  // Derive encryption key using HKDF
  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    authSecret,
    concatUint8Arrays(
      new TextEncoder().encode("WebPush: info\0"),
      subscriberPublicKeyBytes,
      localPublicKeyBytes
    ),
    32
  );
  
  // Create content encryption key
  const contentEncryptionKey = await hkdf(prk, new Uint8Array(0), new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(prk, new Uint8Array(0), new TextEncoder().encode("Content-Encoding: nonce\0"), 12);
  
  // Encrypt payload
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2])); // Add padding delimiter
  
  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    encryptionKey,
    paddedPayload
  );
  
  // Build encrypted body with header
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  
  const encryptedBody = concatUint8Arrays(
    new Uint8Array([0, 0, 0, 0]), // Salt placeholder (we use empty salt with HKDF)
    recordSize,
    new Uint8Array([localPublicKeyBytes.length]),
    localPublicKeyBytes,
    new Uint8Array(encrypted)
  );
  
  // Generate random salt for the header
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const finalBody = concatUint8Arrays(
    salt,
    recordSize,
    new Uint8Array([localPublicKeyBytes.length]),
    localPublicKeyBytes,
    new Uint8Array(encrypted)
  );
  
  // Get raw VAPID public key
  const vapidPublicKeyImported = await crypto.subtle.importKey(
    "jwk",
    vapidPublicKey,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const vapidPublicKeyRaw = await crypto.subtle.exportKey("raw", vapidPublicKeyImported);
  const vapidPublicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(vapidPublicKeyRaw)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  // Send the push message
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": `vapid t=${vapidJwt}, k=${vapidPublicKeyBase64}`,
    },
    body: finalBody,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed: ${response.status} ${text}`);
  }
  
  await response.text(); // Consume body
}

async function createVapidJwt(privateKey: JsonWebKey, audience: string, subject: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: `mailto:noreply@${new URL(subject).hostname}`,
  };
  
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert from DER to raw format if needed
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  return `${unsignedToken}.${sigB64}`;
}

async function importPublicKey(base64: string): Promise<CryptoKey> {
  const bytes = base64UrlDecode(base64);
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(derived);
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
