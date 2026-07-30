// ─────────────────────────────────────────────────────────────
// 달빛여관 AI 역극 중계 서버 (Cloudflare Worker)
//
// 이 코드는 Cloudflare Workers에 붙여넣는 코드입니다.
// 사이트에 올리는 파일이 아니에요!
//
// 역할: 사이트 → 이 서버 → Anthropic API
//       API 키를 이 서버 안에만 숨겨두고 사이트에는 노출하지 않습니다.
//
// 설정 방법은 같은 폴더의 "AI역극-설정방법.md" 파일을 보세요.
// ─────────────────────────────────────────────────────────────

// 우리 사이트에서만 호출할 수 있게 허용 목록
const ALLOWED_ORIGINS = [
  "https://xn--2j1b67omb.site",
  "http://localhost:8080", // 로컬 테스트용 (필요 없으면 지워도 됨)
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // 브라우저의 사전 확인 요청(CORS preflight) 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: corsHeaders(origin) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "잘못된 요청" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // 사이트에서 보낸 내용 중 필요한 것만 골라서 전달 (모델은 서버에서 고정)
    const payload = {
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "disabled" }, // 역극 채팅은 빠른 응답이 중요
      system: body.system || "",
      messages: Array.isArray(body.messages) ? body.messages.slice(-20) : [],
    };

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY, // Cloudflare 설정에 저장된 비밀 키
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.text();
    return new Response(data, {
      status: apiRes.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
