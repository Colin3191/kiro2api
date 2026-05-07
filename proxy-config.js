import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';

export function getProxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy ||
         process.env.HTTP_PROXY || process.env.http_proxy || '';
}

export function initGlobalProxy() {
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
  return proxyUrl;
}

export function createProxyAgent() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}
