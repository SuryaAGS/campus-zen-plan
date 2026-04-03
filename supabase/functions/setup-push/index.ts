import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Convert to base64url format expected by web-push
  const publicKey = `${publicKeyJwk.x}${publicKeyJwk.y}`;
  
  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if VAPID keys already exist
    const { data: existingPublicKey } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vapid_public_key")
      .single();

    if (existingPublicKey) {
      // Return existing public key
      const publicKeyJwk = JSON.parse(existingPublicKey.value);
      // Convert JWK to raw base64url public key for PushManager
      const rawPublicKey = await jwkToRawPublicKey(publicKeyJwk);
      
      return new Response(
        JSON.stringify({ publicKey: rawPublicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new VAPID keys
    const { publicKey, privateKey } = await generateVapidKeys();

    // Store in app_settings
    await supabase.from("app_settings").insert([
      { key: "vapid_public_key", value: publicKey },
      { key: "vapid_private_key", value: privateKey },
    ]);

    const publicKeyJwk = JSON.parse(publicKey);
    const rawPublicKey = await jwkToRawPublicKey(publicKeyJwk);

    return new Response(
      JSON.stringify({ publicKey: rawPublicKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in setup-push:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Convert JWK to raw uncompressed public key (65 bytes: 0x04 + x + y)
async function jwkToRawPublicKey(jwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
