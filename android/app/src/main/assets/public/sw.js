/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "readme.txt",
    "revision": "4970cec952cdc1a43345776f07f5e989"
  }, {
    "url": "index.html",
    "revision": "6777bff64a99ef64d7bfa869b07234b7"
  }, {
    "url": "icon.svg",
    "revision": "671d4e5398edad35e616c7a00ec456a6"
  }, {
    "url": "app-icon.svg",
    "revision": "671d4e5398edad35e616c7a00ec456a6"
  }, {
    "url": "assets/web-pcWty6hn.js",
    "revision": null
  }, {
    "url": "assets/web-DJckIFH6.js",
    "revision": null
  }, {
    "url": "assets/web-DFblqbAv.js",
    "revision": null
  }, {
    "url": "assets/web-D5OKFMAw.js",
    "revision": null
  }, {
    "url": "assets/web-Cf-_NF8q.js",
    "revision": null
  }, {
    "url": "assets/web-BiWEK3gS.js",
    "revision": null
  }, {
    "url": "assets/pwa-toast.entry-CW6660ED.js",
    "revision": null
  }, {
    "url": "assets/pwa-camera.entry-RqFW7koU.js",
    "revision": null
  }, {
    "url": "assets/pwa-camera-modal.entry-Db4kxcyN.js",
    "revision": null
  }, {
    "url": "assets/pwa-camera-modal-instance.entry-ysgV7Qoq.js",
    "revision": null
  }, {
    "url": "assets/pwa-action-sheet.entry-C28JyOvL.js",
    "revision": null
  }, {
    "url": "assets/purify.es-BA-bta5a.js",
    "revision": null
  }, {
    "url": "assets/index.es-JqHPv2L5.js",
    "revision": null
  }, {
    "url": "assets/index-DxuaCTgq.js",
    "revision": null
  }, {
    "url": "assets/index-D-vHr7oA.css",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-QH1iLAAe.js",
    "revision": null
  }, {
    "url": "icon.svg",
    "revision": "671d4e5398edad35e616c7a00ec456a6"
  }, {
    "url": "readme.txt",
    "revision": "4970cec952cdc1a43345776f07f5e989"
  }, {
    "url": "manifest.webmanifest",
    "revision": "580dd44e5fe8a59b46eb9d0c4d51ebe0"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
