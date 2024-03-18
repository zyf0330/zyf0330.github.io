"use strict";

const END = { backend: "backend", frontend: "frontend" };

/****************************************************************/
// 自定义配置节 {
/****************************************************************/

// 代理哪些团队，不应用到 host 规则
const enabledSubdomains = [
  '.', // 一级域名
  "*", // 任何团队
  "zyf",
];
const excludeSubdomains = [
  "iris-test",
  "cdn",
]
// 代理哪些端，优先于 enabledProxyApps
const enabledProxyEnds = [
  // END.frontend,
  END.backend,
];
// 代理哪些 app
const enabledProxyApps = {
  [END.backend]: [
    // 'agile',
  ],
  [END.frontend]: [
    "agile",
  ],
};

const fallbackProxy = "SOCKS localhost:11111";
// const fallbackProxy = 'DIRECT'

/****************************************************************/
// 自定义配置节结束 }
/****************************************************************/

const proxyTargetHost = "localhost";
const proxyRootDomain = "pingcode.dev";
const excludeDomains = excludeSubdomains.map((subDomain) => `${subDomain}.${proxyRootDomain}`)

/**
 * paths 正则表达式匹配
 * @type {{[END]: {[app]: {paths: string[], port: number}}}}
 */
const proxyAppsConfig = {
  [END.frontend]: {
    // TODO fill all apps paths
    portal: {
      paths: [
        "^/$",
        "^/account",
        "^/sockjs-node",
        "^/workspace",
        "^/static/portal",
        "^/(?!api/)", // 各 app 的前端页面均需由 portal 处理路由跳转
      ],
      port: 10000,
    },
    charm: { paths: ["^/signup", "^/signin", "^/t/home", "^/t/notice"], port: 9999 },
    agile: { paths: ["^/static/agile"], port: 11000 },
    pipe: { paths: ["^/static/pipe"], port: 12000 },
    testhub: { paths: ["^/static/testhub"], port: 13000 },
    trace: { paths: ["^/static/trace"], port: 14000 },
    wiki: { paths: ["^/static/wiki"], port: 15000 },
    plan: { paths: ["^/static/plan"], port: 16000 },
    teams: { paths: ["^/static/teams"], port: 17000 },
    flow: { paths: ["^/static/flow"], port: 18000 },
    access: { paths: ["^/static/access"], port: 19000 },
    admin: { paths: ["^/static/admin"], port: 10001 },
    desk: { paths: ["^/static/desk"], port: 11100 },
    insight: { paths: ["^/static/insight"], port: 11200 },
  },
  [END.backend]: {
    agile: { paths: ["^/api/agile"], port: 11001 },
    pipe: { paths: ["^/api/pipeline"], port: 12001 },
    testhub: { paths: ["^/api/testhub"], port: 13001 },
    trace: { paths: ["^/api/trace"], port: 14001 },
    wiki: { paths: ["^/api/wiki"], port: 15001 },
    plan: { paths: ["^/api/plan"], port: 16001 },
    teams: { paths: ["^/api/teams"], port: 17001 },
    flow: { paths: ["^/api/flow"], port: 18001 },
    desk: { paths: ["^/api/desk"], port: 11101 },
    insight: { paths: ["^/api/insight"], port: 11201 },
    typhon: { paths: ["^/api/typhon"], port: 10010 },
    access: { paths: ["^/api/access"], port: 19001 },
    ladon: { paths: ["^/api/ladon"], port: 10030 },
    marketplace: { paths: ["^/api/marketplace"], port: 10021 },
    "open/admin": { paths: ["^/api/open/admin"], port: 30001 },
    iris: { subdomain: "iris-test", paths: ['^/api/iris', '^/socket.io/'], port: 8808 },
    atlas: { subdomain: "atlas-test", port: 10012 },
  },
};

/**
 * @type {{host: string, port}[]}
 */
const hostsOfProxyApp = [];

/**
 * @type {{subdomain?: string, path: string, port}[]}
 */
const pathsOfProxyApp = [];
Object.entries(proxyAppsConfig).forEach(([end, appConfigs]) => {
  if (!enabledProxyEnds.includes(end)) {
    return;
  }
  Object.entries(appConfigs).forEach(([app, { subdomain, paths = [], port }]) => {
    if (!(enabledProxyApps[end] || []).includes(app)) {
      return;
    }

    paths.forEach((path) => pathsOfProxyApp.push({ subdomain, path, port }));
    // host && hostsOfProxyApp.push({ host, port });
  });
});


function getTargetProxy(url) {
  let proxy = undefined;

  // for (const { host, port } of hostsOfProxyApp) {
  //   if (RegExp(host).test(url.host)) {
  //     proxy = `PROXY ${proxyTargetHost}:${port}`;
  //   }
  // }

  if (!proxy) {
    if (
      (enabledSubdomains.includes(".") && url.hostname === proxyRootDomain)
      || (enabledSubdomains.includes("*") && url.hostname.endsWith(`.${proxyRootDomain}`))
      || enabledSubdomains.includes(url.hostname.replace(`.${proxyRootDomain}`, ""))
    ) {
      for (const { subdomain, path, port } of pathsOfProxyApp) {
        if (
          (subdomain ? url.hostname === `${subdomain}.${proxyRootDomain}` : true)
          && RegExp(path).test(url.pathname)
        ) {
          proxy = `PROXY ${proxyTargetHost}:${port}`;
        }
      }
    }
  }

  return proxy;
}

// polyfill
function URL(urlStr) {
  const [, protocol, host, hostname, , port, pathname] = urlStr.match(
    "^(\\w+?)://(([\\d\\w-_.]+)(:(\\d+))?)([/\\d\\w-_.]+)?"
  );
  return { protocol, host, hostname, port, pathname: pathname || "/" };
}

function FindProxyForURL(urlStr, host) {
  const url = new URL(urlStr);

  if (!url.hostname.endsWith(proxyRootDomain)) {
    return fallbackProxy;
  }

  if (excludeDomains.includes(url.hostname)) {
    return fallbackProxy;
  }

  if (url.protocol === "https" || url.protocol === "wss") {
    // 请求失败，用于警告
    return undefined;
  }

  const proxy = getTargetProxy(url);

  return proxy || fallbackProxy;
}

// console.log("pathsOfProxyApp", pathsOfProxyApp);
