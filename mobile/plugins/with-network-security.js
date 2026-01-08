const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNetworkSecurity = (config) => {
  // Create the network security config XML file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const resPath = path.join(projectRoot, 'app/src/main/res/xml');
      const xmlPath = path.join(resPath, 'network_security_config.xml');
      
      // Ensure the directory exists
      if (!fs.existsSync(resPath)) {
        fs.mkdirSync(resPath, { recursive: true });
      }
      
      // Create the network security config file
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">13.232.231.52</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`;
      
      fs.writeFileSync(xmlPath, xmlContent);
      return config;
    },
  ]);

  // Add the reference to the AndroidManifest
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      return config;
    }

    const application = manifest.application[0];
    
    // Add networkSecurityConfig if it doesn't exist
    if (!application.$['android:networkSecurityConfig']) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    return config;
  });

  return config;
};

module.exports = withNetworkSecurity;

