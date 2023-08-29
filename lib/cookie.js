const { ProxyAgent } = require('undici');
const { Cookie, CookieJar, canonicalDomain } = require('tough-cookie');
const { CookieAgent, CookieClient } = require('http-cookie-agent/undici');

const convertSameSite = sameSite => {
  switch (sameSite) {
    case 'strict':
      return 'strict';
    case 'lax':
      return 'lax';
    case 'no_restriction':
    case 'unspecified':
    default:
      return 'none';
  }
};

const convertCookie = cookie => cookie instanceof Cookie ? cookie : new Cookie({
  key: cookie.name,
  value: cookie.value,
  expires: typeof cookie.expirationDate === 'number' ? new Date(cookie.expirationDate * 1000) : 'Infinity',
  domain: canonicalDomain(cookie.domain),
  path: cookie.path,
  secure: cookie.secure,
  httpOnly: cookie.httpOnly,
  sameSite: convertSameSite(cookie.sameSite),
  hostOnly: cookie.hostOnly,
});

const addCookies = exports.addCookies = (jar, cookies) => {
  if (!cookies || !Array.isArray(cookies)) {
    throw new Error('cookies must be an array');
  }
  for (const cookie of cookies) {
    jar.setCookieSync(convertCookie(cookie), 'https://www.youtube.com');
  }
};

exports.addCookiesFromString = (jar, cookies) => {
  if (!cookies || typeof cookies !== 'string') {
    throw new Error('cookies must be a string');
  }
  return addCookies(jar, cookies.split(';').map(Cookie.parse));
};

const createAgent = exports.createAgent = (cookies = []) => {
  const jar = new CookieJar();
  addCookies(jar, cookies);
  return { jar, dispatcher: new CookieAgent({ cookies: { jar } }) };
};

exports.createProxyAgent = (options, cookies = []) => {
  if (!cookies) cookies = [];
  if (typeof options === 'string') options = { uri: options };
  if (options.factory) throw new Error('Cannot use factory with createProxyAgent');
  const jar = new CookieJar();
  addCookies(jar, cookies);
  const proxyOptions = Object.assign({
    factory: (origin, opts) => {
      const o = Object.assign({ cookies: { jar } }, opts);
      return new CookieClient(origin, o);
    },
  }, options);
  return { jar, dispatcher: new ProxyAgent(proxyOptions) };
};

exports.defaultAgent = createAgent();