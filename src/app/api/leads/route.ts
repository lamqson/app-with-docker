type LeadPayload = {
  company?: string;
  email?: string;
  message?: string;
  name?: string;
  source?: string;
};

export async function POST(request: Request) {
  let body: LeadPayload;

  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  const name = body.name?.trim();

  if (!email || !name) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 });
  }

  console.log('[lead]', {
    company: body.company?.trim() || null,
    email,
    message: body.message?.trim() || null,
    name,
    source: body.source?.trim() || 'website',
    submittedAt: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}
