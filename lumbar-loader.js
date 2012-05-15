var lumbarLoader = exports.loader = {
  loadPrefix: typeof lumbarLoadPrefix === 'undefined' ? '' : lumbarLoadPrefix,

  isLoaded: function(moduleName) {
    return lumbarLoadedModules[moduleName] === true;
  },
  isLoading: function(moduleName) {
    return !!lumbarLoadedModules[moduleName];
  },

  loadModule: function(moduleName, callback) {
    var loaded = lumbarLoadedModules[moduleName];
    if (loaded) {
      // We have already been loaded or there is something pending. Handle it
      if (loaded === true) {
        callback();
      } else {
        loaded.push(callback);
      }
      return;
    }

    loaded = lumbarLoadedModules[moduleName] = [callback];

    var loadCount = 0,
        expected = 1,
        allInit = false;
    function complete(error) {
      loadCount++;
      if (error || (allInit && loadCount >= expected)) {
        lumbarLoadedModules[moduleName] = !error;
        for (var i = 0, len = loaded.length; i < len; i++) {
          loaded[i](error);
        }
        var moduleInfo = lumbarLoader.modules[moduleName];
        if (moduleInfo && moduleInfo.preload) {
          preloadModules(moduleInfo.preload);
        }
      }
    }

    expected += lumbarLoader.loadCSS(moduleName, complete);
    expected += lumbarLoader.loadJS(moduleName, complete);

    // If everything was done sync then fire away
    allInit = true;
    complete();
  },

  loadInlineCSS: function(content) {
    var style = document.createElement('style');
    style.textContent = content;
    document.body.appendChild(style);
    return style;
  }
};

var lumbarLoadedModules = {},
    lumbarLoadedResources = {},
    fieldAttr = {
      js: 'src',
      css: 'href'
    };
function loadResources(moduleName, field, callback, create) {
  var module = moduleName === 'base' ? lumbarLoader.map.base : lumbarLoader.modules[moduleName], // Special case for the base case
      loaded = [],
      attr = fieldAttr[field];
  field = module[field] || [];

  if (Array.isArray ? !Array.isArray(field) : Object.prototype.toString.call(field) !== '[object Array]') {
    field = [field];
  }
  for (var i = 0, len = field.length; i < len; i++) {
    var object = field[i];
    var href = checkLoadResource(object, attr);
    if (href && !lumbarLoadedResources[href]) {
      var el = create(href, function(err) {
        if (err === 'connection') {
          lumbarLoadedResources[href] = false;
        }
        callback(err);
      });
      lumbarLoadedResources[href] = true;
      if (el && el.nodeType === 1) {
        document.body.appendChild(el);
      }
      loaded.push(el);
    }
  }
  return loaded;
}

function preloadModules(modules) {
  var moduleList = _.clone(modules);
  function preloadModule() {
    if (moduleList.length) {
      var moduleName = moduleList.shift();
      lumbarLoader.loadModule(moduleName, preloadModule, {silent: true});
    }
  }
  preloadModule();
}

var devicePixelRatio = parseFloat(sessionStorage.getItem('dpr') || window.devicePixelRatio || 1);
exports.devicePixelRatio = devicePixelRatio;
function checkLoadResource(object, attr) {
  var href = lumbarLoader.loadPrefix + (object.href || object);
  if ((!object.maxRatio || devicePixelRatio < object.maxRatio) && (!object.minRatio || object.minRatio <= devicePixelRatio)) {
    if (document.querySelector('[' + attr + '="' + href + '"]')) {
      return;
    }

    return href;
  }
}

exports.moduleMap = function(map, loadPrefix) {
  lumbarLoader.map = map;
  lumbarLoader.modules = map.modules;
  lumbarLoader.loadPrefix = loadPrefix || lumbarLoader.loadPrefix;
};
