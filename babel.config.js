module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin must be listed last (required by
    // react-native-reanimated v4, which NativeWind uses for animations).
    plugins: ["react-native-worklets/plugin"],
  };
};
