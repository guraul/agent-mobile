// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // react-hooks v7 `immutability` misfires on react-native-reanimated
    // shared-value writes inside event handlers (official Reanimated pattern).
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
