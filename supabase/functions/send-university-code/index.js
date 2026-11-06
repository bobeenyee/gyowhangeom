// Sends the university email verification code through Gmail.
// Requires the GMAIL_USER and GMAIL_APP_PASSWORD secrets (a Google app password, not the account password).
// It checks the caller's session itself, so deploy it with "Verify JWT" turned off.
import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: '지원하지 않는 요청이에요.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!supabaseUrl || !serviceKey || !gmailUser || !gmailPassword) {
    return reply({ error: '인증 메일 서버 설정이 아직 끝나지 않았어요.' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) return reply({ error: '로그인이 필요해요.' }, 401);
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: authorization },
  });
  if (!userResponse.ok) return reply({ error: '로그인이 필요해요.' }, 401);
  const user = await userResponse.json();

  const { email } = await req.json().catch(() => ({}));
  const codeResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/issue_university_email_code`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: user.id, p_email: email }),
  });
  const codeBody = await codeResponse.json().catch(() => null);
  if (!codeResponse.ok) return reply({ error: codeBody?.message || '인증 코드를 만들지 못했어요.' }, 400);

  // Port 465: Supabase Edge Functions block outbound 25 and 587.
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPassword.replace(/\s/g, '') },
  });
  try {
    await transport.sendMail({
      from: `"교환점." <${gmailUser}>`,
      to: String(email).trim().toLowerCase(),
      subject: `[교환점.] 대학 인증 코드 ${codeBody}`,
      text: `교환점. 대학 인증 코드는 ${codeBody} 입니다.\n10분 안에 앱에 입력해 주세요.\n직접 요청하지 않았다면 이 메일을 무시해 주세요.`,
    });
  } catch (error) {
    console.error('Gmail send failed', error);
    return reply({ error: '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
  }
  return reply({ ok: true });
});
