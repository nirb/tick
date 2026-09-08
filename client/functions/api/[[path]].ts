interface Env {
  [key: string]: any;
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}): Promise<Response> => {
  const url = new URL(context.request.url);
  const targetUrl = new URL(url.pathname + url.search, 'https://tick-api.bejeranos.workers.dev');

  const headers = new Headers(context.request.headers);
  headers.set('host', 'tick-api.bejeranos.workers.dev');

  const requestInit: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    requestInit.body = context.request.body;
    // @ts-ignore
    requestInit.duplex = 'half';
  }

  const proxyRequest = new Request(targetUrl.toString(), requestInit);
  const response = await fetch(proxyRequest);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};
