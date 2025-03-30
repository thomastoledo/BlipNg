module.exports = function (config) {
    config.set({
      plugins: [require("karma-firefox-launcher")],
      browsers: [
        "Firefox",
        "FirefoxDeveloper",
        "FirefoxAurora",
        "FirefoxNightly",
      ],
    });
  };