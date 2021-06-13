
        
        define = window.define;
        define("{{applicationName}}/src/main", ["exports", "{{applicationName}}/src/resolver", "ember-load-initializers", "{{applicationName}}/config/environment"], function (_exports, _resolver, _emberLoadInitializers, _environment) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var App = Ember.Application.extend({
    modulePrefix: _environment.default.modulePrefix,
    podModulePrefix: _environment.default.podModulePrefix,
    Resolver: _resolver.default
  });
  (0, _emberLoadInitializers.default)(App, "".concat(_environment.default.modulePrefix, "/src/init"));
  (0, _emberLoadInitializers.default)(App, _environment.default.modulePrefix);
  var _default = App;
  _exports.default = _default;
});
define("{{applicationName}}/src/resolver", ["exports", "ember-resolver/resolvers/fallback", "ember-resolver/ember-config", "{{applicationName}}/config/environment"], function (_exports, _fallback, _emberConfig, _environment) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var moduleConfig = (0, _emberConfig.default)(_environment.default.modulePrefix);
  /*
   * If your application has custom types and collections, modify moduleConfig here
   * to add support for them.
   */

  moduleConfig.types = Object.assign({}, moduleConfig.types, {
    // NOTE: needed fast fastboot!
    ajax: {
      definitiveCollection: 'main'
    },
    mixin: {
      definitiveCollection: 'main'
    }
  });

  var _default = _fallback.default.extend({
    config: moduleConfig
  });

  _exports.default = _default;
});
define("{{applicationName}}/src/router", ["exports", "mber-documentation", "{{applicationName}}/config/environment"], function (_exports, _mberDocumentation, _environment) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var Router = Ember.Router.extend({
    location: _environment.default.locationType,
    rootURL: _environment.default.rootURL
  });
  Router.map(function () {
    this.route('index', {
      path: '/'
    });

    if (_environment.default.documentation && _environment.default.documentation.enabled) {
      _mberDocumentation.default.apply(this, [_environment.default]);
    }

    this.route('not-found', {
      path: '/*path'
    });
  });
  var _default = Router;
  _exports.default = _default;
});
define("{{applicationName}}/src/data/models/application/adapter", ["exports", "ember-data", "ember-inflector", "{{applicationName}}/config/environment"], function (_exports, _emberData, _emberInflector, _environment) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var RESTAdapter = _emberData.default.RESTAdapter,
      InvalidError = _emberData.default.InvalidError,
      errorsHashToArray = _emberData.default.errorsHashToArray;

  var _default = RESTAdapter.extend({
    // session: service(),
    host: _environment.default.APP.API_HOST,
    pathForType: function pathForType(type) {
      return (0, _emberInflector.pluralize)(Ember.String.dasherize(type));
    },
    // headers: computed('session.{authenticationToken,currentUser.@each}', function() {
    //   if (this.session.authenticationToken) {
    //     return { Authorization: `Bearer ${this.session.authenticationToken}` };
    //   }
    // }),
    coalesceFindRequests: true,
    handleResponse: function handleResponse(status, headers, payload) {
      if (this.isInvalid(status, headers, payload)) {
        var errors = errorsHashToArray(payload.errors);
        return new InvalidError(errors);
      }

      return this._super.apply(this, arguments);
    }
  });

  _exports.default = _default;
});
define("{{applicationName}}/src/data/models/application/serializer", ["exports", "ember-data"], function (_exports, _emberData) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var RESTSerializer = _emberData.default.RESTSerializer,
      EmbeddedRecordsMixin = _emberData.default.EmbeddedRecordsMixin;

  var _default = RESTSerializer.extend(EmbeddedRecordsMixin, {
    keyForAttribute: function keyForAttribute(attr) {
      return Ember.String.underscore(attr);
    },
    keyForRelationship: function keyForRelationship(key, typeClass, method) {
      if (method === 'serialize') {
        return Ember.String.underscore(key);
      }

      return "".concat(Ember.String.underscore(key), "_id");
    }
  });

  _exports.default = _default;
});
define("{{applicationName}}/src/ui/components/welcome-page/component", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  var _default = Ember.Component.extend({
    emberVersion: Ember.computed(function () {
      var _Ember$VERSION$split = Ember.VERSION.split("."),
          _Ember$VERSION$split2 = _slicedToArray(_Ember$VERSION$split, 2),
          major = _Ember$VERSION$split2[0],
          minor = _Ember$VERSION$split2[1];

      return "".concat(major, ".").concat(minor, ".0");
    })
  });

  _exports.default = _default;
});
define("{{applicationName}}/src/ui/components/welcome-page/template", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\"],[11,\"id\",\"ember-welcome-page-id-selector\"],[12,\"data-ember-version\",[28,[[21,\"emberVersion\"]]]],[9],[0,\"\\n  \"],[7,\"div\"],[11,\"class\",\"columns\"],[9],[0,\"\\n    \"],[7,\"div\"],[11,\"class\",\"tomster\"],[9],[0,\"\\n      \"],[7,\"img\"],[11,\"src\",\"/images/construction.png\"],[11,\"alt\",\"Under construction\"],[9],[10],[0,\"\\n    \"],[10],[0,\"\\n    \"],[7,\"div\"],[11,\"class\",\"welcome\"],[9],[0,\"\\n      \"],[7,\"h2\"],[11,\"id\",\"title\"],[9],[0,\"Congratulations, you made it!\"],[10],[0,\"\\n\\n      \"],[7,\"p\"],[9],[0,\"You’ve officially spun up your very first Ember app :-)\"],[10],[0,\"\\n      \"],[7,\"p\"],[9],[0,\"You’ve got one more decision to make: what do you want to do next? We’d suggest one of the following to help you get going:\"],[10],[0,\"\\n      \"],[7,\"ol\"],[9],[0,\"\\n        \"],[7,\"li\"],[9],[7,\"a\"],[12,\"href\",[28,[\"https://guides.emberjs.com/v\",[21,\"emberVersion\"],\"/getting-started/quick-start/\"]]],[9],[0,\"Quick Start\"],[10],[0,\" - a quick introduction to how Ember works. Learn about defining your first route, writing a UI component and deploying your application.\"],[10],[0,\"\\n        \"],[7,\"li\"],[9],[7,\"a\"],[12,\"href\",[28,[\"https://guides.emberjs.com/v\",[21,\"emberVersion\"],\"/tutorial/ember-cli/\"]]],[9],[0,\"Ember Guides\"],[10],[0,\" - this is our more thorough, hands-on intro to Ember. Your crash course in Ember philosophy, background and some in-depth discussion of how things work (and why they work the way they do).\"],[10],[0,\"\\n      \"],[10],[0,\"\\n      \"],[7,\"p\"],[9],[0,\"If you run into problems, you can check \"],[7,\"a\"],[11,\"href\",\"http://stackoverflow.com/questions/tagged/ember.js\"],[9],[0,\"Stack Overflow\"],[10],[0,\" or \"],[7,\"a\"],[11,\"href\",\"http://discuss.emberjs.com/\"],[9],[0,\"our forums\"],[10],[0,\"  for ideas and answers—someone’s probably been through the same thing and already posted an answer.  If not, you can post your \"],[7,\"strong\"],[9],[0,\"own\"],[10],[0,\" question. People love to help new Ember developers get started, and our \"],[7,\"a\"],[11,\"href\",\"https://emberjs.com/community/\"],[9],[0,\"Ember Community\"],[10],[0,\" is incredibly supportive.\"],[10],[0,\"\\n    \"],[10],[0,\"\\n  \"],[10],[0,\"\\n    \"],[7,\"p\"],[11,\"class\",\"postscript\"],[9],[0,\"To remove this welcome message, remove the \"],[7,\"code\"],[9],[0,\"{{welcome-page}}\"],[10],[0,\" component from your \"],[7,\"code\"],[9],[0,\"application.hbs\"],[10],[0,\" file.\"],[7,\"br\"],[9],[10],[0,\"You'll see this page update soon after!\"],[10],[0,\"\\n\"],[10],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/src/ui/components/welcome-page/template"}});
  })
define("{{applicationName}}/src/ui/routes/application/head", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"title\"],[9],[1,[23,[\"headData\",\"title\"]],false],[10],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/src/ui/routes/application/head"}});
  })
define("{{applicationName}}/src/ui/routes/application/route", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  var _default = Ember.Route.extend({});

  _exports.default = _default;
});
define("{{applicationName}}/src/ui/routes/application/template", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[21,\"head-layout\"],false],[0,\"\\n\\n\"],[7,\"div\"],[9],[0,\"\\n  \"],[1,[21,\"outlet\"],false],[0,\"\\n\"],[10],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/src/ui/routes/application/template"}});
  })
define("{{applicationName}}/src/ui/routes/index/route", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  var _default = Ember.Route.extend({});

  _exports.default = _default;
});
define("{{applicationName}}/src/ui/routes/index/template", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[21,\"welcome-page\"],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/src/ui/routes/index/template"}});
  })
define("{{applicationName}}/src/ui/routes/not-found/route", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  var _default = Ember.Route.extend({});

  _exports.default = _default;
});
define("{{applicationName}}/src/ui/routes/not-found/template", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h1\"],[9],[0,\"Route not found. This template is:\"],[10],[0,\"\\n\"],[7,\"code\"],[9],[0,\"src/ui/routes/not-found/template.hbs\"],[10],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/src/ui/routes/not-found/template"}});
  })
        define('{{applicationName}}/config/environment', ['exports'], function (exports) {
          'use strict';

          exports.__esModule = true;

          if (window.location && (window.location.pathname === '/tests')) {
            var ENV = Object.assign({ modulePrefix: '{{applicationName}}',
  environment: 'memserver',
  rootURL: '/',
  locationType: 'auto',
  documentation: { path: '/styleguide', enabled: true },
  'ember-resolver': { features: { EMBER_RESOLVER_MODULE_UNIFICATION: true } },
  excludeEmberData: false,
  fastboot:
   { hostWhitelist: [ 'localhost:1234', 'localhost:3000', '^localhost:\\d+$' ] },
  'ember-devtools': { global: true, enabled: true },
  memserver: { minify: false, enabled: true },
  EmberENV:
   { FEATURES:
      { 'ember-module-unification': true,
        EMBER_MODULE_UNIFICATION: true },
     EXTEND_PROTOTYPES: { Date: false } },
  APP:
   { API_HOST: 'http://localhost:3000',
     autoboot: false,
     name: '{{applicationName}}',
     version: '0.0.0+578db4ce' } }, {
              locationType: 'none',
            });
            ENV.APP = Object.assign(ENV.APP, {
              autoboot: false,
              rootElement: '#ember-testing'
            });

            exports.default = ENV;
          } else {
            exports.default = { modulePrefix: '{{applicationName}}',
  environment: 'memserver',
  rootURL: '/',
  locationType: 'auto',
  documentation: { path: '/styleguide', enabled: true },
  'ember-resolver': { features: { EMBER_RESOLVER_MODULE_UNIFICATION: true } },
  excludeEmberData: false,
  fastboot:
   { hostWhitelist: [ 'localhost:1234', 'localhost:3000', '^localhost:\\d+$' ] },
  'ember-devtools': { global: true, enabled: true },
  memserver: { minify: false, enabled: true },
  EmberENV:
   { FEATURES:
      { 'ember-module-unification': true,
        EMBER_MODULE_UNIFICATION: true },
     EXTEND_PROTOTYPES: { Date: false } },
  APP:
   { API_HOST: 'http://localhost:3000',
     autoboot: false,
     name: '{{applicationName}}',
     version: '0.0.0+578db4ce' } };
          }

          if (typeof FastBoot !== 'undefined') {
            return FastBoot.config("{{applicationName}}");
          }
        });

        if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['{{applicationName}}/src/main', '{{applicationName}}/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('{{applicationName}}/src/main')['default'].create(require('{{applicationName}}/config/environment').default);
        }

        define("mber-head/components/head-layout", ["exports", "mber-head/templates/components/head-layout"], function (_exports, _headLayout) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    tagName: '',
    layout: _headLayout.default,

    /**
     * If true, this will tear down any existing head on init of this component.
     * This is useful if there is a head built with fastboot - it will then be torn down when this is initialized in the browser.
     * If you do not want this behavior, you can set this to false.
     * @public
     */
    shouldTearDownOnInit: true,
    headElement: Ember.computed(function () {
      return Ember.getOwner(this).lookup('service:-document').head;
    }),
    init: function init() {
      this._super.apply(this, arguments);

      if (this.get('shouldTearDownOnInit')) {
        this._tearDownHead();
      }
    },

    /**
     * Tear down any previous head, if there was one.
     * @private
     */
    _tearDownHead: function _tearDownHead() {
      if (this._isFastboot()) {
        return;
      } // clear fast booted head (if any)


      var startMeta = document.querySelector('meta[name="ember-cli-head-start"]');
      var endMeta = document.querySelector('meta[name="ember-cli-head-end"]');

      if (startMeta && endMeta) {
        var el = startMeta.nextSibling;

        while (el && el !== endMeta) {
          document.head.removeChild(el);
          el = startMeta.nextSibling;
        }

        document.head.removeChild(startMeta);
        document.head.removeChild(endMeta);
      }
    },
    _isFastboot: function _isFastboot() {
      return typeof FastBoot !== 'undefined';
    }
  });

  _exports.default = _default;
});
define("mber-head/services/head-data", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  var _default = Ember.Service.extend({});

  _exports.default = _default;
});
define("mber-head/templates/components/head-layout", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"in-element\",[[23,[\"headElement\"]]],[[\"guid\",\"nextSibling\"],[\"%cursor:0%\",null]],{\"statements\":[[0,\"  \"],[7,\"meta\"],[11,\"name\",\"ember-cli-head-start\"],[11,\"content\",\"\"],[9],[10],[1,[21,\"head-content\"],false],[7,\"meta\"],[11,\"name\",\"ember-cli-head-end\"],[11,\"content\",\"\"],[9],[10],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"mber-head/templates/components/head-layout"}});
  })
define("{{applicationName}}/components/head-content", ["exports", "{{applicationName}}/src/ui/routes/application/head"], function (_exports, _head) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var headLayoutInModuleUnification = Object.keys(requirejs.entries).find(function (entry) {
    return entry.endsWith('/src/ui/routes/application/head');
  });

  var _default = Ember.Component.extend({
    tagName: '',
    headData: Ember.inject.service(),
    layout: headLayoutInModuleUnification ? require(headLayoutInModuleUnification).default : _head.default
  });

  _exports.default = _default;
});
define("{{applicationName}}/components/head-layout", ["exports", "mber-head/components/head-layout"], function (_exports, _headLayout) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  _exports.default = _headLayout.default;
});
define("{{applicationName}}/instance-initializers/head-browser", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var _default = {
    name: 'head-browser',
    initialize: function initialize() {// do nothing!
      // this functionality has been moved into addon/components/head-layout.js
      // This is only here in order to not break existing addons relying on this, e.g. ember-page-title.
    }
  };
  _exports.default = _default;
});
define("{{applicationName}}/services/head-data", ["exports", "mber-head/services/head-data"], function (_exports, _headData) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  _exports.default = _headData.default;
});
define("{{applicationName}}/templates/head", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[2,\" mber-head/templates/head.hbs \"],[0,\"\\n\"],[2,\" If you see this your application's `head.hbs` has gone missing. \"],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"{{applicationName}}/templates/head"}});
  })

define("{{applicationName}}/instance-initializers/ember-devtools", ["exports", "{{applicationName}}/config/environment"], function (_exports, _environment) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  /* global window */
  var _default = {
    initialize: function initialize(appInstance) {
      var devToolsConfig = _environment.default['ember-devtools'] || {};
      var enabled = devToolsConfig.enabled;

      if (enabled === undefined) {
        enabled = /(development|test)/.test(_environment.default.environment);
      }

      if (!enabled) return;
      var service = 'service:ember-devtools';
      var devTools = appInstance.lookup ? appInstance.lookup(service) // backwards compatibility < 2.1
      : appInstance.container.lookup(service);

      if (devToolsConfig.global === true) {
        devTools.globalize();
      } else if (devToolsConfig.global) {
        window[devToolsConfig.global] = devTools;
      }
    }
  };
  _exports.default = _default;
});
define("{{applicationName}}/services/ember-devtools", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  /* global DS */
  var _Ember = Ember,
      Service = _Ember.Service;

  var _default = Service.extend({
    renderedComponents: {},
    init: function init() {
      this.global = this.global || window;
      this.console = this.console || window.console;

      if (Ember.getOwner) {
        // for ember > 2.3
        Object.defineProperty(this, 'owner', {
          get: function get() {
            return Ember.getOwner(this);
          }
        });
      }

      Object.defineProperty(this, 'store', {
        get: function get() {
          return this.lookup('service:store') || this.lookup('store:main'); // for ember-data < 2
        }
      });
    },
    consoleLog: function consoleLog() {
      var _this$console;

      (_this$console = this.console).log.apply(_this$console, arguments);
    },
    app: function app() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'main';
      return this.lookup("application:".concat(name));
    },
    route: function route(name) {
      name = name || this.currentRouteName();
      return this.lookup("route:".concat(name));
    },
    controller: function controller(name) {
      name = name || this.currentRouteName();
      return this.lookup("controller:".concat(name));
    },
    model: function model(name) {
      var controller = this.controller(name);
      return controller && controller.get('model');
    },
    service: function service(name) {
      return this.lookup("service:".concat(name));
    },
    router: function router() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'main';
      return this.lookup("router:".concat(name)).get('router');
    },
    routes: function routes() {
      return Object.keys(this.router().recognizer.names);
    },
    currentRouteName: function currentRouteName() {
      return this.controller('application').get('currentRouteName');
    },
    currentPath: function currentPath() {
      return this.controller('application').get('currentPath');
    },
    log: function log(promise, property, getEach) {
      var _this = this;

      return promise.then(function (value) {
        _this.global.$E = value;

        if (property) {
          value = value[getEach ? 'getEach' : 'get'].call(value, property);
        }

        _this.consoleLog(value);
      }, function (err) {
        _this.console.error(err);
      });
    },
    lookup: function lookup(name) {
      return this.owner.lookup(name);
    },
    resolveRegistration: function resolveRegistration(name) {
      return this.owner.resolveRegistration // ember < 2.3.1
      ? this.owner.resolveRegistration(name) // previous ember versions
      : this.owner.lookupFactory(name);
    },
    ownerNameFor: function ownerNameFor(object) {
      var cache = // ember 2.3.1
      Ember.get(this.owner, '__container__.cache') // previous ember versions
      || Ember.get(this.owner, '_defaultContainer.cache') || this.owner.cache;
      var keys = Object.keys(cache);

      for (var i = 0; i < keys.length; i++) {
        if (cache[keys[i]] === object) return keys[i];
      }
    },
    inspect: Ember.inspect,
    logResolver: function logResolver() {
      var bool = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      Ember.ENV.LOG_MODULE_RESOLVER = bool;
    },
    logAll: function logAll() {
      var bool = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      var app = this.app();
      app.LOG_ACTIVE_GENERATION = bool;
      app.LOG_VIEW_LOOKUPS = bool;
      app.LOG_TRANSITIONS = bool;
      app.LOG_TRANSITIONS_INTERNAL = bool;
      this.logResolver(bool);
    },
    logRenders: function logRenders() {
      var self = this;
      Ember.subscribe('render', {
        before: function before(name, start, payload) {
          return start;
        },
        after: function after(name, end, payload, start) {
          var id = payload.containerKey;
          if (!id) return;
          var duration = Math.round(end - start);
          var color = self.colorForRender(duration);
          var logId = "renderedComponents.".concat(id);
          var ocurrences = self.get(logId);

          if (!ocurrences) {
            self.set(logId, []);
          }

          self.get(logId).push(duration);
          console.log('%c rendered ' + id + ' in ' + duration + 'ms', 'color: ' + color);
        }
      });
    },
    colorForRender: function colorForRender(duration) {
      var ok = '#000000';
      var warning = '#F1B178';
      var serious = '#E86868';
      if (duration < 300) return ok;
      if (duration < 600) return warning;
      return serious;
    },
    environment: function environment() {
      Ember.deprecate('environment() has been deprecated, please use config() instead');
    },
    config: function config() {
      return this.resolveRegistration('config:environment');
    },
    getOwner: function getOwner() {
      return this.owner;
    },
    globalize: function globalize() {
      var _this2 = this;

      var props = ['app', 'getOwner', 'store', 'typeMaps', 'route', 'controller', 'model', 'service', 'routes', 'view', 'currentRouteName', 'currentPath', 'log', 'lookup', 'resolveRegistration', 'ownerNameFor', 'inspect', 'logResolver', 'logAll', 'environment', 'config']; // don't stomp on pre-existing global vars

      var skipGlobalize = this.constructor.skipGlobalize;

      if (skipGlobalize === null) {
        skipGlobalize = this.constructor.skipGlobalize = props.filter(function (prop) {
          return !Ember.isNone(_this2.global[prop]);
        });
      }

      var self = this;
      props.map(function (name) {
        if (skipGlobalize.indexOf(name) !== -1) return;
        var prop = _this2[name];

        if (typeof prop === 'function') {
          prop = function prop() {
            // arguments variable is wrong if we use an arrow function here
            return self[name].apply(self, arguments);
          };
        }

        _this2.global[name] = prop;
      });
    }
  }).reopenClass({
    skipGlobalize: null
  });

  _exports.default = _default;
});
      