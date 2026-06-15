import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.370.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.370.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return new Response(
        JSON.stringify({ error: 'filename and contentType are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!,
      credentials: {
        accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      },
    });

    const bucket = Deno.env.get('CLOUDFLARE_R2_BUCKET') || 'storage';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    });

    // URL expires in 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const publicUrl = `${Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')}/${filename}`;

    return new Response(
      JSON.stringify({ signedUrl, publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
