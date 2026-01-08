const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withBuildProperties = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      
      // Modify root build.gradle to set compileSdkVersion for all subprojects
      const rootBuildGradlePath = path.join(projectRoot, 'build.gradle');
      if (fs.existsSync(rootBuildGradlePath)) {
        let buildGradleContent = fs.readFileSync(rootBuildGradlePath, 'utf8');
        
        // Add subprojects block if it doesn't exist or update it
        if (!buildGradleContent.includes('subprojects {')) {
          // Add subprojects configuration at the end
          buildGradleContent += `
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            android {
                if (!android.hasProperty('compileSdkVersion') || android.compileSdkVersion == null) {
                    compileSdkVersion 34
                }
                if (!android.hasProperty('targetSdkVersion') || android.targetSdkVersion == null) {
                    targetSdkVersion 34
                }
            }
        }
    }
}
`;
        } else {
          // Update existing subprojects block
          buildGradleContent = buildGradleContent.replace(
            /subprojects\s*\{[^}]*\}/,
            `subprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            android {
                if (!android.hasProperty('compileSdkVersion') || android.compileSdkVersion == null) {
                    compileSdkVersion 34
                }
                if (!android.hasProperty('targetSdkVersion') || android.targetSdkVersion == null) {
                    targetSdkVersion 34
                }
            }
        }
    }
}`
          );
        }
        
        fs.writeFileSync(rootBuildGradlePath, buildGradleContent);
      }
      
      return config;
    },
  ]);
};

module.exports = withBuildProperties;

