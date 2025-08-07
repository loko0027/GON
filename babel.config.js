// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [], // Deixe o array de plugins vazio se você não tem outros plugins de Babel
  };
};