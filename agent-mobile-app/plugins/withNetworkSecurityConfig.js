// 让 App 信任本机服务器的自签证书（2026-11-17）
//
// 为什么需要：App 直连 https://106.13.181.13，那是自签证书（CN=106.13.181.13），
// Android 系统信任库没有它，请求直接报
//   SSLHandshakeException: Trust anchor for certification path not found
// 浏览器能点「继续访问」绕过，App 里没有这个交互机会。
//
// 做法：把**公钥证书**（不是私钥）打进 APK 的 raw 资源，用 network security config
// 只为这一个域名加信任锚，其余仍走系统 CA——比「全局信任所有证书」安全得多。
//
// 注意：
//   - `assets/certs/server-ca.pem` 是公钥证书，可以入库；私钥永远不进仓库。
//   - 证书换了要重新构建 App（这是内置信任的固有代价）。
//   - 长期正解是换真证书（域名 + Let's Encrypt），那时删掉这个 plugin 与证书即可。

const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const CERT_REL_PATH = 'assets/certs/server-ca.pem';
/** raw 资源名：Android 只允许小写字母数字下划线，扩展名会被去掉 → @raw/server_ca */
const RAW_FILE_NAME = 'server_ca.pem';
const RAW_RES_ID = 'server_ca';

const DEFAULT_DOMAINS = ['106.13.181.13'];

module.exports = function withNetworkSecurityConfig(config, options = {}) {
  const domains = Array.isArray(options.domains) && options.domains.length > 0
    ? options.domains
    : DEFAULT_DOMAINS;

  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const resDir = path.join(platformRoot, 'app', 'src', 'main', 'res');
      const xmlDir = path.join(resDir, 'xml');
      const rawDir = path.join(resDir, 'raw');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(rawDir, { recursive: true });

      const certSource = path.join(projectRoot, CERT_REL_PATH);
      if (!fs.existsSync(certSource)) {
        throw new Error(`[withNetworkSecurityConfig] 缺证书文件：${CERT_REL_PATH}`);
      }
      fs.copyFileSync(certSource, path.join(rawDir, RAW_FILE_NAME));

      const domainLines = domains
        .map((domain) => `        <domain includeSubdomains="false">${domain}</domain>`)
        .join('\n');

      const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- 由 plugins/withNetworkSecurityConfig.js 生成，不要手改 -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
${domainLines}
        <trust-anchors>
            <certificates src="@raw/${RAW_RES_ID}" />
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
</network-security-config>
`;
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xml, 'utf8');
      return cfg;
    },
  ]);

  return config;
};
