const fs = require('fs');
const path = require('path');
const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');

const INIT_GRADLE = `// BodyTrack: evita falhas quando oss.sonatype.org retorna 504 (React Native adiciona esse repo).
gradle.beforeProject { project ->
  project.repositories.whenObjectAdded { repo ->
    if (repo.metaClass.hasProperty(repo, 'url') && repo.url?.toString()?.contains('oss.sonatype.org')) {
      project.repositories.remove(repo)
    }
  }
}

gradle.projectsEvaluated {
  rootProject.allprojects { project ->
    def stale = []
    project.repositories.each { repo ->
      if (repo.metaClass.hasProperty(repo, 'url') && repo.url?.toString()?.contains('oss.sonatype.org')) {
        stale << repo
      }
    }
    stale.each { project.repositories.remove(it) }
  }
}
`;

function withAndroidLocalBuild(config) {
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const set = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else props.push({ type: 'property', key, value });
    };

    set('android.enableLongPaths', 'true');
    set(
      'org.gradle.jvmargs',
      '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dorg.gradle.internal.http.connectionTimeout=120000 -Dorg.gradle.internal.http.socketTimeout=120000'
    );
    set('org.gradle.parallel', 'true');
    set('org.gradle.caching', 'true');
    set(
      'android.extraMavenRepos',
      JSON.stringify([
        { url: 'https://www.jitpack.io' },
        { url: 'https://repo1.maven.org/maven2' },
      ])
    );

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const initDir = path.join(androidRoot, 'gradle');
      fs.mkdirSync(initDir, { recursive: true });
      fs.writeFileSync(path.join(initDir, 'bodytrack-init.gradle'), INIT_GRADLE);

      const settingsPath = path.join(androidRoot, 'settings.gradle');
      let settings = fs.readFileSync(settingsPath, 'utf8');
      if (settings.includes('bodytrack-init.gradle')) {
        settings = settings.replace(/\napply from: new File\(settingsDir, "gradle\/bodytrack-init.gradle"\)\n?/, '\n');
        fs.writeFileSync(settingsPath, settings);
      }

      const buildGradlePath = path.join(androidRoot, 'build.gradle');
      let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
      const buildMarker = 'gradle/bodytrack-init.gradle';
      if (!buildGradle.includes(buildMarker)) {
        buildGradle = buildGradle.replace(
          'apply plugin: "com.facebook.react.rootproject"\n',
          'apply plugin: "com.facebook.react.rootproject"\n\napply from: new File(rootDir, "gradle/bodytrack-init.gradle")\n'
        );
        fs.writeFileSync(buildGradlePath, buildGradle);
      }

      const wrapperPath = path.join(androidRoot, 'gradle/wrapper/gradle-wrapper.properties');
      if (fs.existsSync(wrapperPath)) {
        let wrapper = fs.readFileSync(wrapperPath, 'utf8');
        wrapper = wrapper.replace(/networkTimeout=\d+/, 'networkTimeout=120000');
        if (!wrapper.includes('networkTimeout=')) {
          wrapper += '\nnetworkTimeout=120000\n';
        }
        fs.writeFileSync(wrapperPath, wrapper);
      }

      const localPropsPath = path.join(androidRoot, 'local.properties');
      if (!fs.existsSync(localPropsPath)) {
        const sdk =
          process.env.ANDROID_HOME ||
          process.env.ANDROID_SDK_ROOT ||
          path.join(process.env.LOCALAPPDATA || process.env.HOME || '', 'Android', 'Sdk');
        const escaped = sdk.replace(/\\/g, '\\\\');
        fs.writeFileSync(localPropsPath, `sdk.dir=${escaped}\n`);
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidLocalBuild;
