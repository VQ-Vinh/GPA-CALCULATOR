export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const formData = await request.formData();
    const file = formData.get('document');
    const fileName = formData.get('filename') || 'gpa_data.json';

    const tgFormData = new FormData();
    tgFormData.append('chat_id', env.TG_CHAT_ID);
    tgFormData.append('document', file, fileName);

    const resp = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendDocument`, {
      method: 'POST',
      body: tgFormData,
    });

    return new Response(JSON.stringify(await resp.json()), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
