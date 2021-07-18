var MEMSERVER = (function () {
        'use strict';

        var models = {  };

        var fixtures = {  };

        function initializer(Models) {}

        function server(Models) {
        }

        var global$1 = (typeof global !== "undefined" ? global :
                    typeof self !== "undefined" ? self :
                    typeof window !== "undefined" ? window : {});

        // shim for using process in browser
        // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

        function defaultSetTimout() {
            throw new Error('setTimeout has not been defined');
        }
        function defaultClearTimeout () {
            throw new Error('clearTimeout has not been defined');
        }
        var cachedSetTimeout = defaultSetTimout;
        var cachedClearTimeout = defaultClearTimeout;
        if (typeof global$1.setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        }
        if (typeof global$1.clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        }

        function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
                //normal enviroments in sane situations
                return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                cachedSetTimeout = setTimeout;
                return setTimeout(fun, 0);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedSetTimeout(fun, 0);
            } catch(e){
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                    return cachedSetTimeout.call(null, fun, 0);
                } catch(e){
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                    return cachedSetTimeout.call(this, fun, 0);
                }
            }


        }
        function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
                //normal enviroments in sane situations
                return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                cachedClearTimeout = clearTimeout;
                return clearTimeout(marker);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedClearTimeout(marker);
            } catch (e){
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                    return cachedClearTimeout.call(null, marker);
                } catch (e){
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                    // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                    return cachedClearTimeout.call(this, marker);
                }
            }



        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
            if (!draining || !currentQueue) {
                return;
            }
            draining = false;
            if (currentQueue.length) {
                queue = currentQueue.concat(queue);
            } else {
                queueIndex = -1;
            }
            if (queue.length) {
                drainQueue();
            }
        }

        function drainQueue() {
            if (draining) {
                return;
            }
            var timeout = runTimeout(cleanUpNextTick);
            draining = true;

            var len = queue.length;
            while(len) {
                currentQueue = queue;
                queue = [];
                while (++queueIndex < len) {
                    if (currentQueue) {
                        currentQueue[queueIndex].run();
                    }
                }
                queueIndex = -1;
                len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
        }
        function nextTick(fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    args[i - 1] = arguments[i];
                }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
                runTimeout(drainQueue);
            }
        }
        // v8 likes predictible objects
        function Item(fun, array) {
            this.fun = fun;
            this.array = array;
        }
        Item.prototype.run = function () {
            this.fun.apply(null, this.array);
        };
        var title = 'browser';
        var platform = 'browser';
        var browser = true;
        var env = {};
        var argv = [];
        var version = ''; // empty string to avoid regexp issues
        var versions = {};
        var release = {};
        var config = {};

        function noop() {}

        var on = noop;
        var addListener = noop;
        var once = noop;
        var off = noop;
        var removeListener = noop;
        var removeAllListeners = noop;
        var emit = noop;

        function binding(name) {
            throw new Error('process.binding is not supported');
        }

        function cwd () { return '/' }
        function chdir (dir) {
            throw new Error('process.chdir is not supported');
        }function umask() { return 0; }

        // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
        var performance = global$1.performance || {};
        var performanceNow =
          performance.now        ||
          performance.mozNow     ||
          performance.msNow      ||
          performance.oNow       ||
          performance.webkitNow  ||
          function(){ return (new Date()).getTime() };

        // generate timestamp or delta
        // see http://nodejs.org/api/process.html#process_process_hrtime
        function hrtime(previousTimestamp){
          var clocktime = performanceNow.call(performance)*1e-3;
          var seconds = Math.floor(clocktime);
          var nanoseconds = Math.floor((clocktime%1)*1e9);
          if (previousTimestamp) {
            seconds = seconds - previousTimestamp[0];
            nanoseconds = nanoseconds - previousTimestamp[1];
            if (nanoseconds<0) {
              seconds--;
              nanoseconds += 1e9;
            }
          }
          return [seconds,nanoseconds]
        }

        var startTime = new Date();
        function uptime() {
          var currentTime = new Date();
          var dif = currentTime - startTime;
          return dif / 1000;
        }

        var process = {
          nextTick: nextTick,
          title: title,
          browser: browser,
          env: env,
          argv: argv,
          version: version,
          versions: versions,
          on: on,
          addListener: addListener,
          once: once,
          off: off,
          removeListener: removeListener,
          removeAllListeners: removeAllListeners,
          emit: emit,
          binding: binding,
          cwd: cwd,
          chdir: chdir,
          umask: umask,
          hrtime: hrtime,
          platform: platform,
          release: release,
          config: config,
          uptime: uptime
        };

        var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

        function createCommonjsModule(fn, module) {
        	return module = { exports: {} }, fn(module, module.exports), module.exports;
        }

        var symbols = createCommonjsModule(function (module) {

        const isWindows = process.platform === 'win32';
        const isLinux = process.platform === 'linux';

        const windows = {
          bullet: '•',
          check: '√',
          cross: '×',
          ellipsis: '...',
          heart: '❤',
          info: 'i',
          line: '─',
          middot: '·',
          minus: '－',
          plus: '＋',
          question: '?',
          questionSmall: '﹖',
          pointer: '>',
          pointerSmall: '»',
          warning: '‼'
        };

        const other = {
          ballotCross: '✘',
          bullet: '•',
          check: '✔',
          cross: '✖',
          ellipsis: '…',
          heart: '❤',
          info: 'ℹ',
          line: '─',
          middot: '·',
          minus: '－',
          plus: '＋',
          question: '?',
          questionFull: '？',
          questionSmall: '﹖',
          pointer: isLinux ? '▸' : '❯',
          pointerSmall: isLinux ? '‣' : '›',
          warning: '⚠'
        };

        module.exports = isWindows ? windows : other;
        Reflect.defineProperty(module.exports, 'windows', { enumerable: false, value: windows });
        Reflect.defineProperty(module.exports, 'other', { enumerable: false, value: other });
        });

        const colors = { enabled: true, visible: true, styles: {}, keys: {} };

        if ('FORCE_COLOR' in process.env) {
          colors.enabled = process.env.FORCE_COLOR !== '0';
        }

        const ansi = style => {
          style.open = `\u001b[${style.codes[0]}m`;
          style.close = `\u001b[${style.codes[1]}m`;
          style.regex = new RegExp(`\\u001b\\[${style.codes[1]}m`, 'g');
          return style;
        };

        const wrap = (style, str, nl) => {
          let { open, close, regex } = style;
          str = open + (str.includes(close) ? str.replace(regex, close + open) : str) + close;
          // see https://github.com/chalk/chalk/pull/92, thanks to the
          // chalk contributors for this fix. However, we've confirmed that
          // this issue is also present in Windows terminals
          return nl ? str.replace(/\r?\n/g, `${close}$&${open}`) : str;
        };

        const style = (input, stack) => {
          if (input === '' || input == null) return '';
          if (colors.enabled === false) return input;
          if (colors.visible === false) return '';
          let str = '' + input;
          let nl = str.includes('\n');
          let n = stack.length;
          while (n-- > 0) str = wrap(colors.styles[stack[n]], str, nl);
          return str;
        };

        const define = (name, codes, type) => {
          colors.styles[name] = ansi({ name, codes });
          let t = colors.keys[type] || (colors.keys[type] = []);
          t.push(name);

          Reflect.defineProperty(colors, name, {
            get() {
              let color = input => style(input, color.stack);
              Reflect.setPrototypeOf(color, colors);
              color.stack = this.stack ? this.stack.concat(name) : [name];
              return color;
            }
          });
        };

        define('reset', [0, 0], 'modifier');
        define('bold', [1, 22], 'modifier');
        define('dim', [2, 22], 'modifier');
        define('italic', [3, 23], 'modifier');
        define('underline', [4, 24], 'modifier');
        define('inverse', [7, 27], 'modifier');
        define('hidden', [8, 28], 'modifier');
        define('strikethrough', [9, 29], 'modifier');

        define('black', [30, 39], 'color');
        define('red', [31, 39], 'color');
        define('green', [32, 39], 'color');
        define('yellow', [33, 39], 'color');
        define('blue', [34, 39], 'color');
        define('magenta', [35, 39], 'color');
        define('cyan', [36, 39], 'color');
        define('white', [37, 39], 'color');
        define('gray', [90, 39], 'color');
        define('grey', [90, 39], 'color');

        define('bgBlack', [40, 49], 'bg');
        define('bgRed', [41, 49], 'bg');
        define('bgGreen', [42, 49], 'bg');
        define('bgYellow', [43, 49], 'bg');
        define('bgBlue', [44, 49], 'bg');
        define('bgMagenta', [45, 49], 'bg');
        define('bgCyan', [46, 49], 'bg');
        define('bgWhite', [47, 49], 'bg');

        define('blackBright', [90, 39], 'bright');
        define('redBright', [91, 39], 'bright');
        define('greenBright', [92, 39], 'bright');
        define('yellowBright', [93, 39], 'bright');
        define('blueBright', [94, 39], 'bright');
        define('magentaBright', [95, 39], 'bright');
        define('cyanBright', [96, 39], 'bright');
        define('whiteBright', [97, 39], 'bright');

        define('bgBlackBright', [100, 49], 'bgBright');
        define('bgRedBright', [101, 49], 'bgBright');
        define('bgGreenBright', [102, 49], 'bgBright');
        define('bgYellowBright', [103, 49], 'bgBright');
        define('bgBlueBright', [104, 49], 'bgBright');
        define('bgMagentaBright', [105, 49], 'bgBright');
        define('bgCyanBright', [106, 49], 'bgBright');
        define('bgWhiteBright', [107, 49], 'bgBright');

        /* eslint-disable no-control-regex */
        const re = colors.ansiRegex = /\u001b\[\d+m/gm;
        colors.hasColor = colors.hasAnsi = str => !!str && typeof str === 'string' && re.test(str);
        colors.unstyle = str => typeof str === 'string' ? str.replace(re, '') : str;
        colors.none = colors.clear = colors.noop = str => str; // no-op, for programmatic usage
        colors.stripColor = colors.unstyle;
        colors.symbols = symbols;
        colors.define = define;
        var ansiColors = colors;

        function primaryKeyTypeSafetyCheck(targetPrimaryKeyType, primaryKey, modelName) {
          const primaryKeyType = typeof primaryKey;

          if (targetPrimaryKeyType === 'id' && (primaryKeyType !== 'number')) {
            throw new Error(ansiColors.red(`[MemServer] ${modelName} model primaryKey type is 'id'. Instead you've tried to enter id: ${primaryKey} with ${primaryKeyType} type`));
          } else if (targetPrimaryKeyType === 'uuid' && (primaryKeyType !== 'string')) {
            throw new Error(ansiColors.red(`[MemServer] ${modelName} model primaryKey type is 'uuid'. Instead you've tried to enter uuid: ${primaryKey} with ${primaryKeyType} type`));
          }

          return targetPrimaryKeyType;
        }

        var fake_xml_http_request = createCommonjsModule(function (module, exports) {
        (function (global, factory) {
          module.exports = factory();
        }(commonjsGlobal, function () {
          /**
           * Minimal Event interface implementation
           *
           * Original implementation by Sven Fuchs: https://gist.github.com/995028
           * Modifications and tests by Christian Johansen.
           *
           * @author Sven Fuchs (svenfuchs@artweb-design.de)
           * @author Christian Johansen (christian@cjohansen.no)
           * @license BSD
           *
           * Copyright (c) 2011 Sven Fuchs, Christian Johansen
           */

          var _Event = function Event(type, bubbles, cancelable, target) {
            this.type = type;
            this.bubbles = bubbles;
            this.cancelable = cancelable;
            this.target = target;
          };

          _Event.prototype = {
            stopPropagation: function () {},
            preventDefault: function () {
              this.defaultPrevented = true;
            }
          };

          /*
            Used to set the statusText property of an xhr object
          */
          var httpStatusCodes = {
            100: "Continue",
            101: "Switching Protocols",
            200: "OK",
            201: "Created",
            202: "Accepted",
            203: "Non-Authoritative Information",
            204: "No Content",
            205: "Reset Content",
            206: "Partial Content",
            300: "Multiple Choice",
            301: "Moved Permanently",
            302: "Found",
            303: "See Other",
            304: "Not Modified",
            305: "Use Proxy",
            307: "Temporary Redirect",
            400: "Bad Request",
            401: "Unauthorized",
            402: "Payment Required",
            403: "Forbidden",
            404: "Not Found",
            405: "Method Not Allowed",
            406: "Not Acceptable",
            407: "Proxy Authentication Required",
            408: "Request Timeout",
            409: "Conflict",
            410: "Gone",
            411: "Length Required",
            412: "Precondition Failed",
            413: "Request Entity Too Large",
            414: "Request-URI Too Long",
            415: "Unsupported Media Type",
            416: "Requested Range Not Satisfiable",
            417: "Expectation Failed",
            422: "Unprocessable Entity",
            500: "Internal Server Error",
            501: "Not Implemented",
            502: "Bad Gateway",
            503: "Service Unavailable",
            504: "Gateway Timeout",
            505: "HTTP Version Not Supported"
          };


          /*
            Cross-browser XML parsing. Used to turn
            XML responses into Document objects
            Borrowed from JSpec
          */
          function parseXML(text) {
            var xmlDoc;

            if (typeof DOMParser != "undefined") {
              var parser = new DOMParser();
              xmlDoc = parser.parseFromString(text, "text/xml");
            } else {
              xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
              xmlDoc.async = "false";
              xmlDoc.loadXML(text);
            }

            return xmlDoc;
          }

          /*
            Without mocking, the native XMLHttpRequest object will throw
            an error when attempting to set these headers. We match this behavior.
          */
          var unsafeHeaders = {
            "Accept-Charset": true,
            "Accept-Encoding": true,
            "Connection": true,
            "Content-Length": true,
            "Cookie": true,
            "Cookie2": true,
            "Content-Transfer-Encoding": true,
            "Date": true,
            "Expect": true,
            "Host": true,
            "Keep-Alive": true,
            "Referer": true,
            "TE": true,
            "Trailer": true,
            "Transfer-Encoding": true,
            "Upgrade": true,
            "User-Agent": true,
            "Via": true
          };

          /*
            Adds an "event" onto the fake xhr object
            that just calls the same-named method. This is
            in case a library adds callbacks for these events.
          */
          function _addEventListener(eventName, xhr){
            xhr.addEventListener(eventName, function (event) {
              var listener = xhr["on" + eventName];

              if (listener && typeof listener == "function") {
                listener.call(event.target, event);
              }
            });
          }

          function EventedObject() {
            this._eventListeners = {};
            var events = ["loadstart", "progress", "load", "abort", "loadend"];
            for (var i = events.length - 1; i >= 0; i--) {
              _addEventListener(events[i], this);
            }
          }
          EventedObject.prototype = {
            /*
              Duplicates the behavior of native XMLHttpRequest's addEventListener function
            */
            addEventListener: function addEventListener(event, listener) {
              this._eventListeners[event] = this._eventListeners[event] || [];
              this._eventListeners[event].push(listener);
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's removeEventListener function
            */
            removeEventListener: function removeEventListener(event, listener) {
              var listeners = this._eventListeners[event] || [];

              for (var i = 0, l = listeners.length; i < l; ++i) {
                if (listeners[i] == listener) {
                  return listeners.splice(i, 1);
                }
              }
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
            */
            dispatchEvent: function dispatchEvent(event) {
              var type = event.type;
              var listeners = this._eventListeners[type] || [];

              for (var i = 0; i < listeners.length; i++) {
                if (typeof listeners[i] == "function") {
                  listeners[i].call(this, event);
                } else {
                  listeners[i].handleEvent(event);
                }
              }

              return !!event.defaultPrevented;
            },

            /*
              Triggers an `onprogress` event with the given parameters.
            */
            _progress: function _progress(lengthComputable, loaded, total) {
              var event = new _Event('progress');
              event.target = this;
              event.lengthComputable = lengthComputable;
              event.loaded = loaded;
              event.total = total;
              this.dispatchEvent(event);
            }
          };

          /*
            Constructor for a fake window.XMLHttpRequest
          */
          function FakeXMLHttpRequest() {
            EventedObject.call(this);
            this.readyState = FakeXMLHttpRequest.UNSENT;
            this.requestHeaders = {};
            this.requestBody = null;
            this.status = 0;
            this.statusText = "";
            this.upload = new EventedObject();
          }

          FakeXMLHttpRequest.prototype = new EventedObject();

          // These status codes are available on the native XMLHttpRequest
          // object, so we match that here in case a library is relying on them.
          FakeXMLHttpRequest.UNSENT = 0;
          FakeXMLHttpRequest.OPENED = 1;
          FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
          FakeXMLHttpRequest.LOADING = 3;
          FakeXMLHttpRequest.DONE = 4;

          var FakeXMLHttpRequestProto = {
            UNSENT: 0,
            OPENED: 1,
            HEADERS_RECEIVED: 2,
            LOADING: 3,
            DONE: 4,
            async: true,
            withCredentials: false,

            /*
              Duplicates the behavior of native XMLHttpRequest's open function
            */
            open: function open(method, url, async, username, password) {
              this.method = method;
              this.url = url;
              this.async = typeof async == "boolean" ? async : true;
              this.username = username;
              this.password = password;
              this.responseText = null;
              this.responseXML = null;
              this.requestHeaders = {};
              this.sendFlag = false;
              this._readyStateChange(FakeXMLHttpRequest.OPENED);
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
            */
            setRequestHeader: function setRequestHeader(header, value) {
              verifyState(this);

              if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
                throw new Error("Refused to set unsafe header \"" + header + "\"");
              }

              if (this.requestHeaders[header]) {
                this.requestHeaders[header] += "," + value;
              } else {
                this.requestHeaders[header] = value;
              }
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's send function
            */
            send: function send(data) {
              verifyState(this);

              if (!/^(get|head)$/i.test(this.method)) {
                var hasContentTypeHeader = false;

                Object.keys(this.requestHeaders).forEach(function (key) {
                  if (key.toLowerCase() === 'content-type') {
                    hasContentTypeHeader = true;
                  }
                });

                if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
                  this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
                }

                this.requestBody = data;
              }

              this.errorFlag = false;
              this.sendFlag = this.async;
              this._readyStateChange(FakeXMLHttpRequest.OPENED);

              if (typeof this.onSend == "function") {
                this.onSend(this);
              }

              this.dispatchEvent(new _Event("loadstart", false, false, this));
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's abort function
            */
            abort: function abort() {
              this.aborted = true;
              this.responseText = null;
              this.errorFlag = true;
              this.requestHeaders = {};

              if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
                this._readyStateChange(FakeXMLHttpRequest.DONE);
                this.sendFlag = false;
              }

              this.readyState = FakeXMLHttpRequest.UNSENT;

              this.dispatchEvent(new _Event("abort", false, false, this));
              if (typeof this.onerror === "function") {
                  this.onerror();
              }
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
            */
            getResponseHeader: function getResponseHeader(header) {
              if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return null;
              }

              if (/^Set-Cookie2?$/i.test(header)) {
                return null;
              }

              header = header.toLowerCase();

              for (var h in this.responseHeaders) {
                if (h.toLowerCase() == header) {
                  return this.responseHeaders[h];
                }
              }

              return null;
            },

            /*
              Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
            */
            getAllResponseHeaders: function getAllResponseHeaders() {
              if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return "";
              }

              var headers = "";

              for (var header in this.responseHeaders) {
                if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
                  headers += header + ": " + this.responseHeaders[header] + "\r\n";
                }
              }

              return headers;
            },

            /*
             Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
             */
            overrideMimeType: function overrideMimeType(mimeType) {
              if (typeof mimeType === "string") {
                this.forceMimeType = mimeType.toLowerCase();
              }
            },


            /*
              Places a FakeXMLHttpRequest object into the passed
              state.
            */
            _readyStateChange: function _readyStateChange(state) {
              this.readyState = state;

              if (typeof this.onreadystatechange == "function") {
                this.onreadystatechange(new _Event("readystatechange"));
              }

              this.dispatchEvent(new _Event("readystatechange"));

              if (this.readyState == FakeXMLHttpRequest.DONE) {
                this.dispatchEvent(new _Event("load", false, false, this));
                this.dispatchEvent(new _Event("loadend", false, false, this));
              }
            },


            /*
              Sets the FakeXMLHttpRequest object's response headers and
              places the object into readyState 2
            */
            _setResponseHeaders: function _setResponseHeaders(headers) {
              this.responseHeaders = {};

              for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this.responseHeaders[header] = headers[header];
                }
              }

              if (this.forceMimeType) {
                this.responseHeaders['Content-Type'] = this.forceMimeType;
              }

              if (this.async) {
                this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
              } else {
                this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
              }
            },

            /*
              Sets the FakeXMLHttpRequest object's response body and
              if body text is XML, sets responseXML to parsed document
              object
            */
            _setResponseBody: function _setResponseBody(body) {
              verifyRequestSent(this);
              verifyHeadersReceived(this);
              verifyResponseBodyType(body);

              var chunkSize = this.chunkSize || 10;
              var index = 0;
              this.responseText = "";

              do {
                if (this.async) {
                  this._readyStateChange(FakeXMLHttpRequest.LOADING);
                }

                this.responseText += body.substring(index, index + chunkSize);
                index += chunkSize;
              } while (index < body.length);

              var type = this.getResponseHeader("Content-Type");

              if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
                try {
                  this.responseXML = parseXML(this.responseText);
                } catch (e) {
                  // Unable to parse XML - no biggie
                }
              }

              if (this.async) {
                this._readyStateChange(FakeXMLHttpRequest.DONE);
              } else {
                this.readyState = FakeXMLHttpRequest.DONE;
              }
            },

            /*
              Forces a response on to the FakeXMLHttpRequest object.

              This is the public API for faking responses. This function
              takes a number status, headers object, and string body:

              ```
              xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")

              ```
            */
            respond: function respond(status, headers, body) {
              this._setResponseHeaders(headers || {});
              this.status = typeof status == "number" ? status : 200;
              this.statusText = httpStatusCodes[this.status];
              this._setResponseBody(body || "");
            }
          };

          for (var property in FakeXMLHttpRequestProto) {
            FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
          }

          function verifyState(xhr) {
            if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
              throw new Error("INVALID_STATE_ERR");
            }

            if (xhr.sendFlag) {
              throw new Error("INVALID_STATE_ERR");
            }
          }


          function verifyRequestSent(xhr) {
              if (xhr.readyState == FakeXMLHttpRequest.DONE) {
                  throw new Error("Request done");
              }
          }

          function verifyHeadersReceived(xhr) {
              if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
                  throw new Error("No headers received");
              }
          }

          function verifyResponseBodyType(body) {
              if (typeof body != "string") {
                  var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                                       body + ", which is not a string.");
                  error.name = "InvalidBodyException";
                  throw error;
              }
          }
          var fake_xml_http_request = FakeXMLHttpRequest;

          return fake_xml_http_request;

        }));
        });

        var createObject = Object.create;
        function createMap() {
            var map = createObject(null);
            map["__"] = undefined;
            delete map["__"];
            return map;
        }

        var Target = function Target(path, matcher, delegate) {
            this.path = path;
            this.matcher = matcher;
            this.delegate = delegate;
        };
        Target.prototype.to = function to (target, callback) {
            var delegate = this.delegate;
            if (delegate && delegate.willAddRoute) {
                target = delegate.willAddRoute(this.matcher.target, target);
            }
            this.matcher.add(this.path, target);
            if (callback) {
                if (callback.length === 0) {
                    throw new Error("You must have an argument in the function passed to `to`");
                }
                this.matcher.addChild(this.path, target, callback, this.delegate);
            }
        };
        var Matcher = function Matcher(target) {
            this.routes = createMap();
            this.children = createMap();
            this.target = target;
        };
        Matcher.prototype.add = function add (path, target) {
            this.routes[path] = target;
        };
        Matcher.prototype.addChild = function addChild (path, target, callback, delegate) {
            var matcher = new Matcher(target);
            this.children[path] = matcher;
            var match = generateMatch(path, matcher, delegate);
            if (delegate && delegate.contextEntered) {
                delegate.contextEntered(target, match);
            }
            callback(match);
        };
        function generateMatch(startingPath, matcher, delegate) {
            function match(path, callback) {
                var fullPath = startingPath + path;
                if (callback) {
                    callback(generateMatch(fullPath, matcher, delegate));
                }
                else {
                    return new Target(fullPath, matcher, delegate);
                }
            }

            return match;
        }
        function addRoute(routeArray, path, handler) {
            var len = 0;
            for (var i = 0; i < routeArray.length; i++) {
                len += routeArray[i].path.length;
            }
            path = path.substr(len);
            var route = { path: path, handler: handler };
            routeArray.push(route);
        }
        function eachRoute(baseRoute, matcher, callback, binding) {
            var routes = matcher.routes;
            var paths = Object.keys(routes);
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var routeArray = baseRoute.slice();
                addRoute(routeArray, path, routes[path]);
                var nested = matcher.children[path];
                if (nested) {
                    eachRoute(routeArray, nested, callback, binding);
                }
                else {
                    callback.call(binding, routeArray);
                }
            }
        }
        var map = function (callback, addRouteCallback) {
            var matcher = new Matcher();
            callback(generateMatch("", matcher, this.delegate));
            eachRoute([], matcher, function (routes) {
                if (addRouteCallback) {
                    addRouteCallback(this, routes);
                }
                else {
                    this.add(routes);
                }
            }, this);
        };

        // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
        // values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
        // chars are "/" and "%".
        // Safe to call multiple times on the same path.
        // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
        function normalizePath(path) {
            return path.split("/")
                .map(normalizeSegment)
                .join("/");
        }
        // We want to ensure the characters "%" and "/" remain in percent-encoded
        // form when normalizing paths, so replace them with their encoded form after
        // decoding the rest of the path
        var SEGMENT_RESERVED_CHARS = /%|\//g;
        function normalizeSegment(segment) {
            if (segment.length < 3 || segment.indexOf("%") === -1)
                { return segment; }
            return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
        }
        // We do not want to encode these characters when generating dynamic path segments
        // See https://tools.ietf.org/html/rfc3986#section-3.3
        // sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
        // others allowed by RFC 3986: ":", "@"
        //
        // First encode the entire path segment, then decode any of the encoded special chars.
        //
        // The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
        // so the possible encoded chars are:
        // ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].
        var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;
        function encodePathSegment(str) {
            return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
        }

        var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
        var isArray = Array.isArray;
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        function getParam(params, key) {
            if (typeof params !== "object" || params === null) {
                throw new Error("You must pass an object as the second argument to `generate`.");
            }
            if (!hasOwnProperty.call(params, key)) {
                throw new Error("You must provide param `" + key + "` to `generate`.");
            }
            var value = params[key];
            var str = typeof value === "string" ? value : "" + value;
            if (str.length === 0) {
                throw new Error("You must provide a param `" + key + "`.");
            }
            return str;
        }
        var eachChar = [];
        eachChar[0 /* Static */] = function (segment, currentState) {
            var state = currentState;
            var value = segment.value;
            for (var i = 0; i < value.length; i++) {
                var ch = value.charCodeAt(i);
                state = state.put(ch, false, false);
            }
            return state;
        };
        eachChar[1 /* Dynamic */] = function (_, currentState) {
            return currentState.put(47 /* SLASH */, true, true);
        };
        eachChar[2 /* Star */] = function (_, currentState) {
            return currentState.put(-1 /* ANY */, false, true);
        };
        eachChar[4 /* Epsilon */] = function (_, currentState) {
            return currentState;
        };
        var regex = [];
        regex[0 /* Static */] = function (segment) {
            return segment.value.replace(escapeRegex, "\\$1");
        };
        regex[1 /* Dynamic */] = function () {
            return "([^/]+)";
        };
        regex[2 /* Star */] = function () {
            return "(.+)";
        };
        regex[4 /* Epsilon */] = function () {
            return "";
        };
        var generate = [];
        generate[0 /* Static */] = function (segment) {
            return segment.value;
        };
        generate[1 /* Dynamic */] = function (segment, params) {
            var value = getParam(params, segment.value);
            if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
                return encodePathSegment(value);
            }
            else {
                return value;
            }
        };
        generate[2 /* Star */] = function (segment, params) {
            return getParam(params, segment.value);
        };
        generate[4 /* Epsilon */] = function () {
            return "";
        };
        var EmptyObject = Object.freeze({});
        var EmptyArray = Object.freeze([]);
        // The `names` will be populated with the paramter name for each dynamic/star
        // segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
        // segment, indicating whether it should be decoded during recognition.
        function parse(segments, route, types) {
            // normalize route as not starting with a "/". Recognition will
            // also normalize.
            if (route.length > 0 && route.charCodeAt(0) === 47 /* SLASH */) {
                route = route.substr(1);
            }
            var parts = route.split("/");
            var names = undefined;
            var shouldDecodes = undefined;
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                var flags = 0;
                var type = 0;
                if (part === "") {
                    type = 4 /* Epsilon */;
                }
                else if (part.charCodeAt(0) === 58 /* COLON */) {
                    type = 1 /* Dynamic */;
                }
                else if (part.charCodeAt(0) === 42 /* STAR */) {
                    type = 2 /* Star */;
                }
                else {
                    type = 0 /* Static */;
                }
                flags = 2 << type;
                if (flags & 12 /* Named */) {
                    part = part.slice(1);
                    names = names || [];
                    names.push(part);
                    shouldDecodes = shouldDecodes || [];
                    shouldDecodes.push((flags & 4 /* Decoded */) !== 0);
                }
                if (flags & 14 /* Counted */) {
                    types[type]++;
                }
                segments.push({
                    type: type,
                    value: normalizeSegment(part)
                });
            }
            return {
                names: names || EmptyArray,
                shouldDecodes: shouldDecodes || EmptyArray,
            };
        }
        function isEqualCharSpec(spec, char, negate) {
            return spec.char === char && spec.negate === negate;
        }
        // A State has a character specification and (`charSpec`) and a list of possible
        // subsequent states (`nextStates`).
        //
        // If a State is an accepting state, it will also have several additional
        // properties:
        //
        // * `regex`: A regular expression that is used to extract parameters from paths
        //   that reached this accepting state.
        // * `handlers`: Information on how to convert the list of captures into calls
        //   to registered handlers with the specified parameters
        // * `types`: How many static, dynamic or star segments in this route. Used to
        //   decide which route to use if multiple registered routes match a path.
        //
        // Currently, State is implemented naively by looping over `nextStates` and
        // comparing a character specification against a character. A more efficient
        // implementation would use a hash of keys pointing at one or more next states.
        var State = function State(states, id, char, negate, repeat) {
            this.states = states;
            this.id = id;
            this.char = char;
            this.negate = negate;
            this.nextStates = repeat ? id : null;
            this.pattern = "";
            this._regex = undefined;
            this.handlers = undefined;
            this.types = undefined;
        };
        State.prototype.regex = function regex$1 () {
            if (!this._regex) {
                this._regex = new RegExp(this.pattern);
            }
            return this._regex;
        };
        State.prototype.get = function get (char, negate) {
                var this$1 = this;

            var nextStates = this.nextStates;
            if (nextStates === null)
                { return; }
            if (isArray(nextStates)) {
                for (var i = 0; i < nextStates.length; i++) {
                    var child = this$1.states[nextStates[i]];
                    if (isEqualCharSpec(child, char, negate)) {
                        return child;
                    }
                }
            }
            else {
                var child$1 = this.states[nextStates];
                if (isEqualCharSpec(child$1, char, negate)) {
                    return child$1;
                }
            }
        };
        State.prototype.put = function put (char, negate, repeat) {
            var state;
            // If the character specification already exists in a child of the current
            // state, just return that state.
            if (state = this.get(char, negate)) {
                return state;
            }
            // Make a new state for the character spec
            var states = this.states;
            state = new State(states, states.length, char, negate, repeat);
            states[states.length] = state;
            // Insert the new state as a child of the current state
            if (this.nextStates == null) {
                this.nextStates = state.id;
            }
            else if (isArray(this.nextStates)) {
                this.nextStates.push(state.id);
            }
            else {
                this.nextStates = [this.nextStates, state.id];
            }
            // Return the new state
            return state;
        };
        // Find a list of child states matching the next character
        State.prototype.match = function match (ch) {
                var this$1 = this;

            var nextStates = this.nextStates;
            if (!nextStates)
                { return []; }
            var returned = [];
            if (isArray(nextStates)) {
                for (var i = 0; i < nextStates.length; i++) {
                    var child = this$1.states[nextStates[i]];
                    if (isMatch(child, ch)) {
                        returned.push(child);
                    }
                }
            }
            else {
                var child$1 = this.states[nextStates];
                if (isMatch(child$1, ch)) {
                    returned.push(child$1);
                }
            }
            return returned;
        };
        function isMatch(spec, char) {
            return spec.negate ? spec.char !== char && spec.char !== -1 /* ANY */ : spec.char === char || spec.char === -1 /* ANY */;
        }
        // This is a somewhat naive strategy, but should work in a lot of cases
        // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
        //
        // This strategy generally prefers more static and less dynamic matching.
        // Specifically, it
        //
        //  * prefers fewer stars to more, then
        //  * prefers using stars for less of the match to more, then
        //  * prefers fewer dynamic segments to more, then
        //  * prefers more static segments to more
        function sortSolutions(states) {
            return states.sort(function (a, b) {
                var ref = a.types || [0, 0, 0];
                var astatics = ref[0];
                var adynamics = ref[1];
                var astars = ref[2];
                var ref$1 = b.types || [0, 0, 0];
                var bstatics = ref$1[0];
                var bdynamics = ref$1[1];
                var bstars = ref$1[2];
                if (astars !== bstars) {
                    return astars - bstars;
                }
                if (astars) {
                    if (astatics !== bstatics) {
                        return bstatics - astatics;
                    }
                    if (adynamics !== bdynamics) {
                        return bdynamics - adynamics;
                    }
                }
                if (adynamics !== bdynamics) {
                    return adynamics - bdynamics;
                }
                if (astatics !== bstatics) {
                    return bstatics - astatics;
                }
                return 0;
            });
        }
        function recognizeChar(states, ch) {
            var nextStates = [];
            for (var i = 0, l = states.length; i < l; i++) {
                var state = states[i];
                nextStates = nextStates.concat(state.match(ch));
            }
            return nextStates;
        }
        var RecognizeResults = function RecognizeResults(queryParams) {
            this.length = 0;
            this.queryParams = queryParams || {};
        };

        RecognizeResults.prototype.splice = Array.prototype.splice;
        RecognizeResults.prototype.slice = Array.prototype.slice;
        RecognizeResults.prototype.push = Array.prototype.push;
        function findHandler(state, originalPath, queryParams) {
            var handlers = state.handlers;
            var regex = state.regex();
            if (!regex || !handlers)
                { throw new Error("state not initialized"); }
            var captures = originalPath.match(regex);
            var currentCapture = 1;
            var result = new RecognizeResults(queryParams);
            result.length = handlers.length;
            for (var i = 0; i < handlers.length; i++) {
                var handler = handlers[i];
                var names = handler.names;
                var shouldDecodes = handler.shouldDecodes;
                var params = EmptyObject;
                var isDynamic = false;
                if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
                    for (var j = 0; j < names.length; j++) {
                        isDynamic = true;
                        var name = names[j];
                        var capture = captures && captures[currentCapture++];
                        if (params === EmptyObject) {
                            params = {};
                        }
                        if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
                            params[name] = capture && decodeURIComponent(capture);
                        }
                        else {
                            params[name] = capture;
                        }
                    }
                }
                result[i] = {
                    handler: handler.handler,
                    params: params,
                    isDynamic: isDynamic
                };
            }
            return result;
        }
        function decodeQueryParamPart(part) {
            // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
            part = part.replace(/\+/gm, "%20");
            var result;
            try {
                result = decodeURIComponent(part);
            }
            catch (error) {
                result = "";
            }
            return result;
        }
        var RouteRecognizer = function RouteRecognizer() {
            this.names = createMap();
            var states = [];
            var state = new State(states, 0, -1 /* ANY */, true, false);
            states[0] = state;
            this.states = states;
            this.rootState = state;
        };
        RouteRecognizer.prototype.add = function add (routes, options) {
            var currentState = this.rootState;
            var pattern = "^";
            var types = [0, 0, 0];
            var handlers = new Array(routes.length);
            var allSegments = [];
            var isEmpty = true;
            var j = 0;
            for (var i = 0; i < routes.length; i++) {
                var route = routes[i];
                var ref = parse(allSegments, route.path, types);
                    var names = ref.names;
                    var shouldDecodes = ref.shouldDecodes;
                // preserve j so it points to the start of newly added segments
                for (; j < allSegments.length; j++) {
                    var segment = allSegments[j];
                    if (segment.type === 4 /* Epsilon */) {
                        continue;
                    }
                    isEmpty = false;
                    // Add a "/" for the new segment
                    currentState = currentState.put(47 /* SLASH */, false, false);
                    pattern += "/";
                    // Add a representation of the segment to the NFA and regex
                    currentState = eachChar[segment.type](segment, currentState);
                    pattern += regex[segment.type](segment);
                }
                handlers[i] = {
                    handler: route.handler,
                    names: names,
                    shouldDecodes: shouldDecodes
                };
            }
            if (isEmpty) {
                currentState = currentState.put(47 /* SLASH */, false, false);
                pattern += "/";
            }
            currentState.handlers = handlers;
            currentState.pattern = pattern + "$";
            currentState.types = types;
            var name;
            if (typeof options === "object" && options !== null && options.as) {
                name = options.as;
            }
            if (name) {
                // if (this.names[name]) {
                //   throw new Error("You may not add a duplicate route named `" + name + "`.");
                // }
                this.names[name] = {
                    segments: allSegments,
                    handlers: handlers
                };
            }
        };
        RouteRecognizer.prototype.handlersFor = function handlersFor (name) {
            var route = this.names[name];
            if (!route) {
                throw new Error("There is no route named " + name);
            }
            var result = new Array(route.handlers.length);
            for (var i = 0; i < route.handlers.length; i++) {
                var handler = route.handlers[i];
                result[i] = handler;
            }
            return result;
        };
        RouteRecognizer.prototype.hasRoute = function hasRoute (name) {
            return !!this.names[name];
        };
        RouteRecognizer.prototype.generate = function generate$1 (name, params) {
            var route = this.names[name];
            var output = "";
            if (!route) {
                throw new Error("There is no route named " + name);
            }
            var segments = route.segments;
            for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];
                if (segment.type === 4 /* Epsilon */) {
                    continue;
                }
                output += "/";
                output += generate[segment.type](segment, params);
            }
            if (output.charAt(0) !== "/") {
                output = "/" + output;
            }
            if (params && params.queryParams) {
                output += this.generateQueryString(params.queryParams);
            }
            return output;
        };
        RouteRecognizer.prototype.generateQueryString = function generateQueryString (params) {
            var pairs = [];
            var keys = Object.keys(params);
            keys.sort();
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = params[key];
                if (value == null) {
                    continue;
                }
                var pair = encodeURIComponent(key);
                if (isArray(value)) {
                    for (var j = 0; j < value.length; j++) {
                        var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
                        pairs.push(arrayPair);
                    }
                }
                else {
                    pair += "=" + encodeURIComponent(value);
                    pairs.push(pair);
                }
            }
            if (pairs.length === 0) {
                return "";
            }
            return "?" + pairs.join("&");
        };
        RouteRecognizer.prototype.parseQueryString = function parseQueryString (queryString) {
            var pairs = queryString.split("&");
            var queryParams = {};
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split("="), key = decodeQueryParamPart(pair[0]), keyLength = key.length, isArray = false, value = (void 0);
                if (pair.length === 1) {
                    value = "true";
                }
                else {
                    // Handle arrays
                    if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
                        isArray = true;
                        key = key.slice(0, keyLength - 2);
                        if (!queryParams[key]) {
                            queryParams[key] = [];
                        }
                    }
                    value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
                }
                if (isArray) {
                    queryParams[key].push(value);
                }
                else {
                    queryParams[key] = value;
                }
            }
            return queryParams;
        };
        RouteRecognizer.prototype.recognize = function recognize (path) {
            var results;
            var states = [this.rootState];
            var queryParams = {};
            var isSlashDropped = false;
            var hashStart = path.indexOf("#");
            if (hashStart !== -1) {
                path = path.substr(0, hashStart);
            }
            var queryStart = path.indexOf("?");
            if (queryStart !== -1) {
                var queryString = path.substr(queryStart + 1, path.length);
                path = path.substr(0, queryStart);
                queryParams = this.parseQueryString(queryString);
            }
            if (path.charAt(0) !== "/") {
                path = "/" + path;
            }
            var originalPath = path;
            if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
                path = normalizePath(path);
            }
            else {
                path = decodeURI(path);
                originalPath = decodeURI(originalPath);
            }
            var pathLen = path.length;
            if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
                path = path.substr(0, pathLen - 1);
                originalPath = originalPath.substr(0, originalPath.length - 1);
                isSlashDropped = true;
            }
            for (var i = 0; i < path.length; i++) {
                states = recognizeChar(states, path.charCodeAt(i));
                if (!states.length) {
                    break;
                }
            }
            var solutions = [];
            for (var i$1 = 0; i$1 < states.length; i$1++) {
                if (states[i$1].handlers) {
                    solutions.push(states[i$1]);
                }
            }
            states = sortSolutions(solutions);
            var state = solutions[0];
            if (state && state.handlers) {
                // if a trailing slash was dropped and a star segment is the last segment
                // specified, put the trailing slash back
                if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
                    originalPath = originalPath + "/";
                }
                results = findHandler(state, originalPath, queryParams);
            }
            return results;
        };
        RouteRecognizer.VERSION = "0.3.4";
        // Set to false to opt-out of encoding and decoding path segments.
        // See https://github.com/tildeio/route-recognizer/pull/55
        RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
        RouteRecognizer.Normalizer = {
            normalizeSegment: normalizeSegment, normalizePath: normalizePath, encodePathSegment: encodePathSegment
        };
        RouteRecognizer.prototype.map = map;

        const targetNamespace = typeof global$1 === 'object' ? global$1 : window;
        const DEFAULT_PASSTHROUGHS = [
          'http://localhost:0/chromecheckurl', 'http://localhost:30820/socket.io'
        ];

        function startServer(Server, options={}) {
          window.Pretender.prototype.namespace = options.namespace;
          window.Pretender.prototype.urlPrefix = options.urlPrefix;
          window.Pretender.prototype.timing = options.timing;

          let pretender = new window.Pretender(function() {
            const MemServer = ansiColors.cyan('[MemServer]');

            if (options.logging) {
              this.handledRequest = function(verb, path, request) {
                const method = verb.toUpperCase();

                console.log(MemServer, colorStatusCode(request.status), method, request.url);

                if (['POST', 'PUT'].includes(method)) {
                  console.log(`${method} REQUEST BODY IS:`, request.params);
                }

                console.log(JSON.parse(request.responseText));
              };
              this.passthroughRequest = function(verb, path, request) {
                console.log(MemServer, ansiColors.yellow('[PASSTHROUGH]'), verb, request.url);
              };
            }

            this.unhandledRequest = function(verb, path, request) {
              console.log(MemServer, ansiColors.red('[UNHANDLED REQUEST]', verb, path));
              console.log(ansiColors.red('UNHANDLED REQUEST WAS:\n'), request);
              console.log(request);
            };
          }, { trackRequests: false });

          // HACK: Pretender this.passthrough for better UX
          // TODO: this doesnt passthrough full http:// https://
          pretender.passthrough = function(url) {
            const parent = window.Pretender.prototype;
            const verbs = ['get', 'post', 'put', 'delete'];

            if (!url) {
              ['/**', '/', '/*'].forEach((path) => {
                verbs.forEach((verb) => pretender[verb](path, parent.passthrough));
              });

              return;
            }

            const fullUrl = (this.urlPrefix || '') + (this.namespace ? ('/' + this.namespace) : '') + url;

            verbs.forEach((verb) => pretender[verb](fullUrl, parent.passthrough));
          };

          DEFAULT_PASSTHROUGHS.forEach((url) => pretender.passthrough(url));
          // END: Pretender this.passthrough for better UX

          Server.apply(pretender, [targetNamespace.MemServer.Models]);

          return pretender;
        }

        function colorStatusCode(statusCode) {
          if (statusCode === 200 || statusCode === 201) {
            return ansiColors.green(statusCode);
          } else if (statusCode === 404 || statusCode === 204) {
            return ansiColors.cyan(statusCode);
          }

          return ansiColors.red(statusCode);
        }

        var support = {
          searchParams: 'URLSearchParams' in self,
          iterable: 'Symbol' in self && 'iterator' in Symbol,
          blob:
            'FileReader' in self &&
            'Blob' in self &&
            (function() {
              try {
                new Blob();
                return true
              } catch (e) {
                return false
              }
            })(),
          formData: 'FormData' in self,
          arrayBuffer: 'ArrayBuffer' in self
        };

        function isDataView(obj) {
          return obj && DataView.prototype.isPrototypeOf(obj)
        }

        if (support.arrayBuffer) {
          var viewClasses = [
            '[object Int8Array]',
            '[object Uint8Array]',
            '[object Uint8ClampedArray]',
            '[object Int16Array]',
            '[object Uint16Array]',
            '[object Int32Array]',
            '[object Uint32Array]',
            '[object Float32Array]',
            '[object Float64Array]'
          ];

          var isArrayBufferView =
            ArrayBuffer.isView ||
            function(obj) {
              return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
            };
        }

        function normalizeName(name) {
          if (typeof name !== 'string') {
            name = String(name);
          }
          if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
            throw new TypeError('Invalid character in header field name')
          }
          return name.toLowerCase()
        }

        function normalizeValue(value) {
          if (typeof value !== 'string') {
            value = String(value);
          }
          return value
        }

        // Build a destructive iterator for the value list
        function iteratorFor(items) {
          var iterator = {
            next: function() {
              var value = items.shift();
              return {done: value === undefined, value: value}
            }
          };

          if (support.iterable) {
            iterator[Symbol.iterator] = function() {
              return iterator
            };
          }

          return iterator
        }

        function Headers(headers) {
          this.map = {};

          if (headers instanceof Headers) {
            headers.forEach(function(value, name) {
              this.append(name, value);
            }, this);
          } else if (Array.isArray(headers)) {
            headers.forEach(function(header) {
              this.append(header[0], header[1]);
            }, this);
          } else if (headers) {
            Object.getOwnPropertyNames(headers).forEach(function(name) {
              this.append(name, headers[name]);
            }, this);
          }
        }

        Headers.prototype.append = function(name, value) {
          name = normalizeName(name);
          value = normalizeValue(value);
          var oldValue = this.map[name];
          this.map[name] = oldValue ? oldValue + ', ' + value : value;
        };

        Headers.prototype['delete'] = function(name) {
          delete this.map[normalizeName(name)];
        };

        Headers.prototype.get = function(name) {
          name = normalizeName(name);
          return this.has(name) ? this.map[name] : null
        };

        Headers.prototype.has = function(name) {
          return this.map.hasOwnProperty(normalizeName(name))
        };

        Headers.prototype.set = function(name, value) {
          this.map[normalizeName(name)] = normalizeValue(value);
        };

        Headers.prototype.forEach = function(callback, thisArg) {
          for (var name in this.map) {
            if (this.map.hasOwnProperty(name)) {
              callback.call(thisArg, this.map[name], name, this);
            }
          }
        };

        Headers.prototype.keys = function() {
          var items = [];
          this.forEach(function(value, name) {
            items.push(name);
          });
          return iteratorFor(items)
        };

        Headers.prototype.values = function() {
          var items = [];
          this.forEach(function(value) {
            items.push(value);
          });
          return iteratorFor(items)
        };

        Headers.prototype.entries = function() {
          var items = [];
          this.forEach(function(value, name) {
            items.push([name, value]);
          });
          return iteratorFor(items)
        };

        if (support.iterable) {
          Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
        }

        function consumed(body) {
          if (body.bodyUsed) {
            return Promise.reject(new TypeError('Already read'))
          }
          body.bodyUsed = true;
        }

        function fileReaderReady(reader) {
          return new Promise(function(resolve, reject) {
            reader.onload = function() {
              resolve(reader.result);
            };
            reader.onerror = function() {
              reject(reader.error);
            };
          })
        }

        function readBlobAsArrayBuffer(blob) {
          var reader = new FileReader();
          var promise = fileReaderReady(reader);
          reader.readAsArrayBuffer(blob);
          return promise
        }

        function readBlobAsText(blob) {
          var reader = new FileReader();
          var promise = fileReaderReady(reader);
          reader.readAsText(blob);
          return promise
        }

        function readArrayBufferAsText(buf) {
          var view = new Uint8Array(buf);
          var chars = new Array(view.length);

          for (var i = 0; i < view.length; i++) {
            chars[i] = String.fromCharCode(view[i]);
          }
          return chars.join('')
        }

        function bufferClone(buf) {
          if (buf.slice) {
            return buf.slice(0)
          } else {
            var view = new Uint8Array(buf.byteLength);
            view.set(new Uint8Array(buf));
            return view.buffer
          }
        }

        function Body() {
          this.bodyUsed = false;

          this._initBody = function(body) {
            this._bodyInit = body;
            if (!body) {
              this._bodyText = '';
            } else if (typeof body === 'string') {
              this._bodyText = body;
            } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
              this._bodyBlob = body;
            } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
              this._bodyFormData = body;
            } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
              this._bodyText = body.toString();
            } else if (support.arrayBuffer && support.blob && isDataView(body)) {
              this._bodyArrayBuffer = bufferClone(body.buffer);
              // IE 10-11 can't handle a DataView body.
              this._bodyInit = new Blob([this._bodyArrayBuffer]);
            } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
              this._bodyArrayBuffer = bufferClone(body);
            } else {
              throw new Error('unsupported BodyInit type')
            }

            if (!this.headers.get('content-type')) {
              if (typeof body === 'string') {
                this.headers.set('content-type', 'text/plain;charset=UTF-8');
              } else if (this._bodyBlob && this._bodyBlob.type) {
                this.headers.set('content-type', this._bodyBlob.type);
              } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
                this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
              }
            }
          };

          if (support.blob) {
            this.blob = function() {
              var rejected = consumed(this);
              if (rejected) {
                return rejected
              }

              if (this._bodyBlob) {
                return Promise.resolve(this._bodyBlob)
              } else if (this._bodyArrayBuffer) {
                return Promise.resolve(new Blob([this._bodyArrayBuffer]))
              } else if (this._bodyFormData) {
                throw new Error('could not read FormData body as blob')
              } else {
                return Promise.resolve(new Blob([this._bodyText]))
              }
            };

            this.arrayBuffer = function() {
              if (this._bodyArrayBuffer) {
                return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
              } else {
                return this.blob().then(readBlobAsArrayBuffer)
              }
            };
          }

          this.text = function() {
            var rejected = consumed(this);
            if (rejected) {
              return rejected
            }

            if (this._bodyBlob) {
              return readBlobAsText(this._bodyBlob)
            } else if (this._bodyArrayBuffer) {
              return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
            } else if (this._bodyFormData) {
              throw new Error('could not read FormData body as text')
            } else {
              return Promise.resolve(this._bodyText)
            }
          };

          if (support.formData) {
            this.formData = function() {
              return this.text().then(decode)
            };
          }

          this.json = function() {
            return this.text().then(JSON.parse)
          };

          return this
        }

        // HTTP methods whose capitalization should be normalized
        var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

        function normalizeMethod(method) {
          var upcased = method.toUpperCase();
          return methods.indexOf(upcased) > -1 ? upcased : method
        }

        function Request(input, options) {
          options = options || {};
          var body = options.body;

          if (input instanceof Request) {
            if (input.bodyUsed) {
              throw new TypeError('Already read')
            }
            this.url = input.url;
            this.credentials = input.credentials;
            if (!options.headers) {
              this.headers = new Headers(input.headers);
            }
            this.method = input.method;
            this.mode = input.mode;
            this.signal = input.signal;
            if (!body && input._bodyInit != null) {
              body = input._bodyInit;
              input.bodyUsed = true;
            }
          } else {
            this.url = String(input);
          }

          this.credentials = options.credentials || this.credentials || 'omit';
          if (options.headers || !this.headers) {
            this.headers = new Headers(options.headers);
          }
          this.method = normalizeMethod(options.method || this.method || 'GET');
          this.mode = options.mode || this.mode || null;
          this.signal = options.signal || this.signal;
          this.referrer = null;

          if ((this.method === 'GET' || this.method === 'HEAD') && body) {
            throw new TypeError('Body not allowed for GET or HEAD requests')
          }
          this._initBody(body);
        }

        Request.prototype.clone = function() {
          return new Request(this, {body: this._bodyInit})
        };

        function decode(body) {
          var form = new FormData();
          body
            .trim()
            .split('&')
            .forEach(function(bytes) {
              if (bytes) {
                var split = bytes.split('=');
                var name = split.shift().replace(/\+/g, ' ');
                var value = split.join('=').replace(/\+/g, ' ');
                form.append(decodeURIComponent(name), decodeURIComponent(value));
              }
            });
          return form
        }

        function parseHeaders(rawHeaders) {
          var headers = new Headers();
          // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
          // https://tools.ietf.org/html/rfc7230#section-3.2
          var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
          preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
            var parts = line.split(':');
            var key = parts.shift().trim();
            if (key) {
              var value = parts.join(':').trim();
              headers.append(key, value);
            }
          });
          return headers
        }

        Body.call(Request.prototype);

        function Response(bodyInit, options) {
          if (!options) {
            options = {};
          }

          this.type = 'default';
          this.status = options.status === undefined ? 200 : options.status;
          this.ok = this.status >= 200 && this.status < 300;
          this.statusText = 'statusText' in options ? options.statusText : 'OK';
          this.headers = new Headers(options.headers);
          this.url = options.url || '';
          this._initBody(bodyInit);
        }

        Body.call(Response.prototype);

        Response.prototype.clone = function() {
          return new Response(this._bodyInit, {
            status: this.status,
            statusText: this.statusText,
            headers: new Headers(this.headers),
            url: this.url
          })
        };

        Response.error = function() {
          var response = new Response(null, {status: 0, statusText: ''});
          response.type = 'error';
          return response
        };

        var redirectStatuses = [301, 302, 303, 307, 308];

        Response.redirect = function(url, status) {
          if (redirectStatuses.indexOf(status) === -1) {
            throw new RangeError('Invalid status code')
          }

          return new Response(null, {status: status, headers: {location: url}})
        };

        var DOMException = self.DOMException;
        try {
          new DOMException();
        } catch (err) {
          DOMException = function(message, name) {
            this.message = message;
            this.name = name;
            var error = Error(message);
            this.stack = error.stack;
          };
          DOMException.prototype = Object.create(Error.prototype);
          DOMException.prototype.constructor = DOMException;
        }

        function fetch(input, init) {
          return new Promise(function(resolve, reject) {
            var request = new Request(input, init);

            if (request.signal && request.signal.aborted) {
              return reject(new DOMException('Aborted', 'AbortError'))
            }

            var xhr = new XMLHttpRequest();

            function abortXhr() {
              xhr.abort();
            }

            xhr.onload = function() {
              var options = {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: parseHeaders(xhr.getAllResponseHeaders() || '')
              };
              options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
              var body = 'response' in xhr ? xhr.response : xhr.responseText;
              resolve(new Response(body, options));
            };

            xhr.onerror = function() {
              reject(new TypeError('Network request failed'));
            };

            xhr.ontimeout = function() {
              reject(new TypeError('Network request failed'));
            };

            xhr.onabort = function() {
              reject(new DOMException('Aborted', 'AbortError'));
            };

            xhr.open(request.method, request.url, true);

            if (request.credentials === 'include') {
              xhr.withCredentials = true;
            } else if (request.credentials === 'omit') {
              xhr.withCredentials = false;
            }

            if ('responseType' in xhr && support.blob) {
              xhr.responseType = 'blob';
            }

            request.headers.forEach(function(value, name) {
              xhr.setRequestHeader(name, value);
            });

            if (request.signal) {
              request.signal.addEventListener('abort', abortXhr);

              xhr.onreadystatechange = function() {
                // DONE (success or failure)
                if (xhr.readyState === 4) {
                  request.signal.removeEventListener('abort', abortXhr);
                }
              };
            }

            xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
          })
        }

        fetch.polyfill = true;

        if (!self.fetch) {
          self.fetch = fetch;
          self.Headers = Headers;
          self.Request = Request;
          self.Response = Response;
        }

        var fetch$1 = /*#__PURE__*/Object.freeze({
                Headers: Headers,
                Request: Request,
                Response: Response,
                get DOMException () { return DOMException; },
                fetch: fetch
        });

        var pretender = createCommonjsModule(function (module) {
        (function(self) {

        function getModuleDefault(module) {
          return module.default || module;
        }

        var appearsBrowserified = typeof self !== 'undefined' &&
                                  typeof process !== 'undefined' &&
                                  (Object.prototype.toString.call(process) === '[object Object]' ||
                                   Object.prototype.toString.call(process) === '[object process]');

        var RouteRecognizer$$1 = appearsBrowserified ? getModuleDefault(RouteRecognizer) : self.RouteRecognizer;
        var FakeXMLHttpRequest = appearsBrowserified ? getModuleDefault(fake_xml_http_request) :
          self.FakeXMLHttpRequest;

        // fetch related ponyfills
        // TODO: use whatwg-fetch once new version release
        var FakeFetch = appearsBrowserified ? getModuleDefault(fetch$1) : self.WHATWGFetch;

        /**
         * parseURL - decompose a URL into its parts
         * @param  {String} url a URL
         * @return {Object} parts of the URL, including the following
         *
         * 'https://www.yahoo.com:1234/mypage?test=yes#abc'
         *
         * {
         *   host: 'www.yahoo.com:1234',
         *   protocol: 'https:',
         *   search: '?test=yes',
         *   hash: '#abc',
         *   href: 'https://www.yahoo.com:1234/mypage?test=yes#abc',
         *   pathname: '/mypage',
         *   fullpath: '/mypage?test=yes'
         * }
         */
        function parseURL(url) {
          // TODO: something for when document isn't present... #yolo
          var anchor = document.createElement('a');
          anchor.href = url;

          if (!anchor.host) {
            anchor.href = anchor.href; // IE: load the host and protocol
          }

          var pathname = anchor.pathname;
          if (pathname.charAt(0) !== '/') {
            pathname = '/' + pathname; // IE: prepend leading slash
          }

          var host = anchor.host;
          if (anchor.port === '80' || anchor.port === '443') {
            host = anchor.hostname; // IE: remove default port
          }

          return {
            host: host,
            protocol: anchor.protocol,
            search: anchor.search,
            hash: anchor.hash,
            href: anchor.href,
            pathname: pathname,
            fullpath: pathname + (anchor.search || '') + (anchor.hash || '')
          };
        }


        /**
         * Registry
         *
         * A registry is a map of HTTP verbs to route recognizers.
         */

        function Registry(/* host */) {
          // Herein we keep track of RouteRecognizer instances
          // keyed by HTTP method. Feel free to add more as needed.
          this.verbs = {
            GET: new RouteRecognizer$$1(),
            PUT: new RouteRecognizer$$1(),
            POST: new RouteRecognizer$$1(),
            DELETE: new RouteRecognizer$$1(),
            PATCH: new RouteRecognizer$$1(),
            HEAD: new RouteRecognizer$$1(),
            OPTIONS: new RouteRecognizer$$1()
          };
        }

        /**
         * Hosts
         *
         * a map of hosts to Registries, ultimately allowing
         * a per-host-and-port, per HTTP verb lookup of RouteRecognizers
         */
        function Hosts() {
          this._registries = {};
        }

        /**
         * Hosts#forURL - retrieve a map of HTTP verbs to RouteRecognizers
         *                for a given URL
         *
         * @param  {String} url a URL
         * @return {Registry}   a map of HTTP verbs to RouteRecognizers
         *                      corresponding to the provided URL's
         *                      hostname and port
         */
        Hosts.prototype.forURL = function(url) {
          var host = parseURL(url).host;
          var registry = this._registries[host];

          if (registry === undefined) {
            registry = (this._registries[host] = new Registry(host));
          }

          return registry.verbs;
        };


        function Pretender(/* routeMap1, routeMap2, ..., options*/) {
          this.hosts = new Hosts();

          var lastArg = arguments[arguments.length - 1];
          var options = typeof lastArg === 'object' ? lastArg : null;
          var shouldNotTrack = options && (options.trackRequests === false);
          var noopArray = { push: function() {}, length: 0 };

          this.handlers = [];
          this.handledRequests = shouldNotTrack ? noopArray: [];
          this.passthroughRequests = shouldNotTrack ? noopArray: [];
          this.unhandledRequests = shouldNotTrack ? noopArray: [];
          this.requestReferences = [];
          this.forcePassthrough = options && (options.forcePassthrough === true);
          this.disableUnhandled = options && (options.disableUnhandled === true);

          // reference the native XMLHttpRequest object so
          // it can be restored later
          this._nativeXMLHttpRequest = self.XMLHttpRequest;
          this.running = false;
          var ctx = { pretender: this };
          this.ctx = ctx;

          // capture xhr requests, channeling them into
          // the route map.
          self.XMLHttpRequest = interceptor(ctx);

          // polyfill fetch when xhr is ready
          this._fetchProps = ['fetch', 'Headers', 'Request', 'Response'];
          this._fetchProps.forEach(function(name) {
            this['_native' + name] = self[name];
            self[name] = FakeFetch[name];
          }, this);

          // 'start' the server
          this.running = true;

          // trigger the route map DSL.
          var argLength = options ? arguments.length - 1 : arguments.length;
          for (var i = 0; i < argLength; i++) {
            this.map(arguments[i]);
          }
        }

        function interceptor(ctx) {
          function FakeRequest() {
            // super()
            FakeXMLHttpRequest.call(this);
          }
          FakeRequest.prototype = Object.create(FakeXMLHttpRequest.prototype);
          FakeRequest.prototype.constructor = FakeRequest;

          // extend
          FakeRequest.prototype.send = function send() {
            if (!ctx.pretender.running) {
              throw new Error('You shut down a Pretender instance while there was a pending request. ' +
                    'That request just tried to complete. Check to see if you accidentally shut down ' +
                    'a pretender earlier than you intended to');
            }

            FakeXMLHttpRequest.prototype.send.apply(this, arguments);

            if (ctx.pretender.checkPassthrough(this)) {
              var xhr = createPassthrough(this);
              xhr.send.apply(xhr, arguments);
            } else {
              ctx.pretender.handleRequest(this);
            }
          };


          function createPassthrough(fakeXHR) {
            // event types to handle on the xhr
            var evts = ['error', 'timeout', 'abort', 'readystatechange'];

            // event types to handle on the xhr.upload
            var uploadEvents = [];

            // properties to copy from the native xhr to fake xhr
            var lifecycleProps = ['readyState', 'responseText', 'responseXML', 'status', 'statusText'];

            var xhr = fakeXHR._passthroughRequest = new ctx.pretender._nativeXMLHttpRequest();
            xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);

            if (fakeXHR.responseType === 'arraybuffer') {
              lifecycleProps = ['readyState', 'response', 'status', 'statusText'];
              xhr.responseType = fakeXHR.responseType;
            }

            // use onload if the browser supports it
            if ('onload' in xhr) {
              evts.push('load');
            }

            // add progress event for async calls
            // avoid using progress events for sync calls, they will hang https://bugs.webkit.org/show_bug.cgi?id=40996.
            if (fakeXHR.async && fakeXHR.responseType !== 'arraybuffer') {
              evts.push('progress');
              uploadEvents.push('progress');
            }

            // update `propertyNames` properties from `fromXHR` to `toXHR`
            function copyLifecycleProperties(propertyNames, fromXHR, toXHR) {
              for (var i = 0; i < propertyNames.length; i++) {
                var prop = propertyNames[i];
                if (prop in fromXHR) {
                  toXHR[prop] = fromXHR[prop];
                }
              }
            }

            // fire fake event on `eventable`
            function dispatchEvent(eventable, eventType, event) {
              eventable.dispatchEvent(event);
              if (eventable['on' + eventType]) {
                eventable['on' + eventType](event);
              }
            }

            // set the on- handler on the native xhr for the given eventType
            function createHandler(eventType) {
              xhr['on' + eventType] = function(event) {
                copyLifecycleProperties(lifecycleProps, xhr, fakeXHR);
                dispatchEvent(fakeXHR, eventType, event);
              };
            }

            // set the on- handler on the native xhr's `upload` property for
            // the given eventType
            function createUploadHandler(eventType) {
              if (xhr.upload) {
                xhr.upload['on' + eventType] = function(event) {
                  dispatchEvent(fakeXHR.upload, eventType, event);
                };
              }
            }

            var i;
            for (i = 0; i < evts.length; i++) {
              createHandler(evts[i]);
            }
            for (i = 0; i < uploadEvents.length; i++) {
              createUploadHandler(uploadEvents[i]);
            }

            if (fakeXHR.async) {
              xhr.timeout = fakeXHR.timeout;
              xhr.withCredentials = fakeXHR.withCredentials;
            }
            for (var h in fakeXHR.requestHeaders) {
              xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
            }
            return xhr;
          }

          FakeRequest.prototype._passthroughCheck = function(method, args) {
            if (this._passthroughRequest) {
              return this._passthroughRequest[method].apply(this._passthroughRequest, args);
            }
            return FakeXMLHttpRequest.prototype[method].apply(this, args);
          };

          FakeRequest.prototype.abort = function abort() {
            return this._passthroughCheck('abort', arguments);
          };

          FakeRequest.prototype.getResponseHeader = function getResponseHeader() {
            return this._passthroughCheck('getResponseHeader', arguments);
          };

          FakeRequest.prototype.getAllResponseHeaders = function getAllResponseHeaders() {
            return this._passthroughCheck('getAllResponseHeaders', arguments);
          };

          if (ctx.pretender._nativeXMLHttpRequest.prototype._passthroughCheck) {
            console.warn('You created a second Pretender instance while there was already one running. ' +
                  'Running two Pretender servers at once will lead to unexpected results and will ' +
                  'be removed entirely in a future major version.' +
                  'Please call .shutdown() on your instances when you no longer need them to respond.');
          }
          return FakeRequest;
        }

        function verbify(verb) {
          return function(path, handler, async) {
            return this.register(verb, path, handler, async);
          };
        }

        function scheduleProgressEvent(request, startTime, totalTime) {
          setTimeout(function() {
            if (!request.aborted && !request.status) {
              var ellapsedTime = new Date().getTime() - startTime.getTime();
              request.upload._progress(true, ellapsedTime, totalTime);
              request._progress(true, ellapsedTime, totalTime);
              scheduleProgressEvent(request, startTime, totalTime);
            }
          }, 50);
        }

        function isArray(array) {
          return Object.prototype.toString.call(array) === '[object Array]';
        }

        var PASSTHROUGH = {};

        Pretender.prototype = {
          get: verbify('GET'),
          post: verbify('POST'),
          put: verbify('PUT'),
          'delete': verbify('DELETE'),
          patch: verbify('PATCH'),
          head: verbify('HEAD'),
          options: verbify('OPTIONS'),
          map: function(maps) {
            maps.call(this);
          },
          register: function register(verb, url, handler, async) {
            if (!handler) {
              throw new Error('The function you tried passing to Pretender to handle ' +
                verb + ' ' + url + ' is undefined or missing.');
            }

            handler.numberOfCalls = 0;
            handler.async = async;
            this.handlers.push(handler);

            var registry = this.hosts.forURL(url)[verb];

            registry.add([{
              path: parseURL(url).fullpath,
              handler: handler
            }]);

            return handler;
          },
          passthrough: PASSTHROUGH,
          checkPassthrough: function checkPassthrough(request) {
            var verb = request.method.toUpperCase();
            var path = parseURL(request.url).fullpath;
            var recognized = this.hosts.forURL(request.url)[verb].recognize(path);
            var match = recognized && recognized[0];

            if ((match && match.handler === PASSTHROUGH) || this.forcePassthrough)  {
              this.passthroughRequests.push(request);
              this.passthroughRequest(verb, path, request);
              return true;
            }

            return false;
          },
          handleRequest: function handleRequest(request) {
            var verb = request.method.toUpperCase();
            var path = request.url;

            var handler = this._handlerFor(verb, path, request);

            if (handler) {
              handler.handler.numberOfCalls++;
              var async = handler.handler.async;
              this.handledRequests.push(request);

              var pretender = this;

              var _handleRequest = function(statusHeadersAndBody) {
                if (!isArray(statusHeadersAndBody)) {
                  var note = 'Remember to `return [status, headers, body];` in your route handler.';
                  throw new Error('Nothing returned by handler for ' + path + '. ' + note);
                }

                var status = statusHeadersAndBody[0],
                    headers = pretender.prepareHeaders(statusHeadersAndBody[1]),
                    body = pretender.prepareBody(statusHeadersAndBody[2], headers);

                pretender.handleResponse(request, async, function() {
                  request.respond(status, headers, body);
                  pretender.handledRequest(verb, path, request);
                });
              };

              try {
                var result = handler.handler(request);
                if (result && typeof result.then === 'function') {
                  // `result` is a promise, resolve it
                  result.then(function(resolvedResult) {
                    _handleRequest(resolvedResult);
                  });
                } else {
                  _handleRequest(result);
                }
              } catch (error) {
                this.erroredRequest(verb, path, request, error);
                this.resolve(request);
              }
            } else {
              if (!this.disableUnhandled) {
                this.unhandledRequests.push(request);
                this.unhandledRequest(verb, path, request);
              }
            }
          },
          handleResponse: function handleResponse(request, strategy, callback) {
            var delay = typeof strategy === 'function' ? strategy() : strategy;
            delay = typeof delay === 'boolean' || typeof delay === 'number' ? delay : 0;

            if (delay === false) {
              callback();
            } else {
              var pretender = this;
              pretender.requestReferences.push({
                request: request,
                callback: callback
              });

              if (delay !== true) {
                scheduleProgressEvent(request, new Date(), delay);
                setTimeout(function() {
                  pretender.resolve(request);
                }, delay);
              }
            }
          },
          resolve: function resolve(request) {
            for (var i = 0, len = this.requestReferences.length; i < len; i++) {
              var res = this.requestReferences[i];
              if (res.request === request) {
                res.callback();
                this.requestReferences.splice(i, 1);
                break;
              }
            }
          },
          requiresManualResolution: function(verb, path) {
            var handler = this._handlerFor(verb.toUpperCase(), path, {});
            if (!handler) { return false; }

            var async = handler.handler.async;
            return typeof async === 'function' ? async() === true : async === true;
          },
          prepareBody: function(body) { return body; },
          prepareHeaders: function(headers) { return headers; },
          handledRequest: function(/* verb, path, request */) { /* no-op */},
          passthroughRequest: function(/* verb, path, request */) { /* no-op */},
          unhandledRequest: function(verb, path/*, request */) {
            throw new Error('Pretender intercepted ' + verb + ' ' +
              path + ' but no handler was defined for this type of request');
          },
          erroredRequest: function(verb, path, request, error) {
            error.message = 'Pretender intercepted ' + verb + ' ' +
              path + ' but encountered an error: ' + error.message;
            throw error;
          },
          _handlerFor: function(verb, url, request) {
            var registry = this.hosts.forURL(url)[verb];
            var matches = registry.recognize(parseURL(url).fullpath);

            var match = matches ? matches[0] : null;
            if (match) {
              request.params = match.params;
              request.queryParams = matches.queryParams;
            }

            return match;
          },
          shutdown: function shutdown() {
            self.XMLHttpRequest = this._nativeXMLHttpRequest;
            this._fetchProps.forEach(function(name) {
              self[name] = this['_native' + name];
            }, this);
            this.ctx.pretender = undefined;
            // 'stop' the server
            this.running = false;
          }
        };

        Pretender.parseURL = parseURL;
        Pretender.Hosts = Hosts;
        Pretender.Registry = Registry;

        {
          module.exports = Pretender;
        }
        self.Pretender = Pretender;
        }(self));
        });

        var has = Object.prototype.hasOwnProperty;

        var hexTable = (function () {
            var array = [];
            for (var i = 0; i < 256; ++i) {
                array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
            }

            return array;
        }());

        var compactQueue = function compactQueue(queue) {
            var obj;

            while (queue.length) {
                var item = queue.pop();
                obj = item.obj[item.prop];

                if (Array.isArray(obj)) {
                    var compacted = [];

                    for (var j = 0; j < obj.length; ++j) {
                        if (typeof obj[j] !== 'undefined') {
                            compacted.push(obj[j]);
                        }
                    }

                    item.obj[item.prop] = compacted;
                }
            }

            return obj;
        };

        var arrayToObject = function arrayToObject(source, options) {
            var obj = options && options.plainObjects ? Object.create(null) : {};
            for (var i = 0; i < source.length; ++i) {
                if (typeof source[i] !== 'undefined') {
                    obj[i] = source[i];
                }
            }

            return obj;
        };

        var merge = function merge(target, source, options) {
            if (!source) {
                return target;
            }

            if (typeof source !== 'object') {
                if (Array.isArray(target)) {
                    target.push(source);
                } else if (typeof target === 'object') {
                    if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                        target[source] = true;
                    }
                } else {
                    return [target, source];
                }

                return target;
            }

            if (typeof target !== 'object') {
                return [target].concat(source);
            }

            var mergeTarget = target;
            if (Array.isArray(target) && !Array.isArray(source)) {
                mergeTarget = arrayToObject(target, options);
            }

            if (Array.isArray(target) && Array.isArray(source)) {
                source.forEach(function (item, i) {
                    if (has.call(target, i)) {
                        if (target[i] && typeof target[i] === 'object') {
                            target[i] = merge(target[i], item, options);
                        } else {
                            target.push(item);
                        }
                    } else {
                        target[i] = item;
                    }
                });
                return target;
            }

            return Object.keys(source).reduce(function (acc, key) {
                var value = source[key];

                if (has.call(acc, key)) {
                    acc[key] = merge(acc[key], value, options);
                } else {
                    acc[key] = value;
                }
                return acc;
            }, mergeTarget);
        };

        var assign = function assignSingleSource(target, source) {
            return Object.keys(source).reduce(function (acc, key) {
                acc[key] = source[key];
                return acc;
            }, target);
        };

        var decode$1 = function (str) {
            try {
                return decodeURIComponent(str.replace(/\+/g, ' '));
            } catch (e) {
                return str;
            }
        };

        var encode = function encode(str) {
            // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
            // It has been adapted here for stricter adherence to RFC 3986
            if (str.length === 0) {
                return str;
            }

            var string = typeof str === 'string' ? str : String(str);

            var out = '';
            for (var i = 0; i < string.length; ++i) {
                var c = string.charCodeAt(i);

                if (
                    c === 0x2D // -
                    || c === 0x2E // .
                    || c === 0x5F // _
                    || c === 0x7E // ~
                    || (c >= 0x30 && c <= 0x39) // 0-9
                    || (c >= 0x41 && c <= 0x5A) // a-z
                    || (c >= 0x61 && c <= 0x7A) // A-Z
                ) {
                    out += string.charAt(i);
                    continue;
                }

                if (c < 0x80) {
                    out = out + hexTable[c];
                    continue;
                }

                if (c < 0x800) {
                    out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
                    continue;
                }

                if (c < 0xD800 || c >= 0xE000) {
                    out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
                    continue;
                }

                i += 1;
                c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
                out += hexTable[0xF0 | (c >> 18)]
                    + hexTable[0x80 | ((c >> 12) & 0x3F)]
                    + hexTable[0x80 | ((c >> 6) & 0x3F)]
                    + hexTable[0x80 | (c & 0x3F)];
            }

            return out;
        };

        var compact = function compact(value) {
            var queue = [{ obj: { o: value }, prop: 'o' }];
            var refs = [];

            for (var i = 0; i < queue.length; ++i) {
                var item = queue[i];
                var obj = item.obj[item.prop];

                var keys = Object.keys(obj);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    var val = obj[key];
                    if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                        queue.push({ obj: obj, prop: key });
                        refs.push(val);
                    }
                }
            }

            return compactQueue(queue);
        };

        var isRegExp = function isRegExp(obj) {
            return Object.prototype.toString.call(obj) === '[object RegExp]';
        };

        var isBuffer = function isBuffer(obj) {
            if (obj === null || typeof obj === 'undefined') {
                return false;
            }

            return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
        };

        var utils = {
            arrayToObject: arrayToObject,
            assign: assign,
            compact: compact,
            decode: decode$1,
            encode: encode,
            isBuffer: isBuffer,
            isRegExp: isRegExp,
            merge: merge
        };

        var replace = String.prototype.replace;
        var percentTwenties = /%20/g;

        var formats = {
            'default': 'RFC3986',
            formatters: {
                RFC1738: function (value) {
                    return replace.call(value, percentTwenties, '+');
                },
                RFC3986: function (value) {
                    return value;
                }
            },
            RFC1738: 'RFC1738',
            RFC3986: 'RFC3986'
        };

        var arrayPrefixGenerators = {
            brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
                return prefix + '[]';
            },
            indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
                return prefix + '[' + key + ']';
            },
            repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
                return prefix;
            }
        };

        var toISO = Date.prototype.toISOString;

        var defaults = {
            delimiter: '&',
            encode: true,
            encoder: utils.encode,
            encodeValuesOnly: false,
            serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
                return toISO.call(date);
            },
            skipNulls: false,
            strictNullHandling: false
        };

        var stringify = function stringify( // eslint-disable-line func-name-matching
            object,
            prefix,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encoder,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
        ) {
            var obj = object;
            if (typeof filter === 'function') {
                obj = filter(prefix, obj);
            } else if (obj instanceof Date) {
                obj = serializeDate(obj);
            } else if (obj === null) {
                if (strictNullHandling) {
                    return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix;
                }

                obj = '';
            }

            if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
                if (encoder) {
                    var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder);
                    return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder))];
                }
                return [formatter(prefix) + '=' + formatter(String(obj))];
            }

            var values = [];

            if (typeof obj === 'undefined') {
                return values;
            }

            var objKeys;
            if (Array.isArray(filter)) {
                objKeys = filter;
            } else {
                var keys = Object.keys(obj);
                objKeys = sort ? keys.sort(sort) : keys;
            }

            for (var i = 0; i < objKeys.length; ++i) {
                var key = objKeys[i];

                if (skipNulls && obj[key] === null) {
                    continue;
                }

                if (Array.isArray(obj)) {
                    values = values.concat(stringify(
                        obj[key],
                        generateArrayPrefix(prefix, key),
                        generateArrayPrefix,
                        strictNullHandling,
                        skipNulls,
                        encoder,
                        filter,
                        sort,
                        allowDots,
                        serializeDate,
                        formatter,
                        encodeValuesOnly
                    ));
                } else {
                    values = values.concat(stringify(
                        obj[key],
                        prefix + (allowDots ? '.' + key : '[' + key + ']'),
                        generateArrayPrefix,
                        strictNullHandling,
                        skipNulls,
                        encoder,
                        filter,
                        sort,
                        allowDots,
                        serializeDate,
                        formatter,
                        encodeValuesOnly
                    ));
                }
            }

            return values;
        };

        var stringify_1 = function (object, opts) {
            var obj = object;
            var options = opts ? utils.assign({}, opts) : {};

            if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
                throw new TypeError('Encoder has to be a function.');
            }

            var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
            var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
            var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
            var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
            var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
            var sort = typeof options.sort === 'function' ? options.sort : null;
            var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
            var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
            var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
            if (typeof options.format === 'undefined') {
                options.format = formats['default'];
            } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
                throw new TypeError('Unknown format option provided.');
            }
            var formatter = formats.formatters[options.format];
            var objKeys;
            var filter;

            if (typeof options.filter === 'function') {
                filter = options.filter;
                obj = filter('', obj);
            } else if (Array.isArray(options.filter)) {
                filter = options.filter;
                objKeys = filter;
            }

            var keys = [];

            if (typeof obj !== 'object' || obj === null) {
                return '';
            }

            var arrayFormat;
            if (options.arrayFormat in arrayPrefixGenerators) {
                arrayFormat = options.arrayFormat;
            } else if ('indices' in options) {
                arrayFormat = options.indices ? 'indices' : 'repeat';
            } else {
                arrayFormat = 'indices';
            }

            var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

            if (!objKeys) {
                objKeys = Object.keys(obj);
            }

            if (sort) {
                objKeys.sort(sort);
            }

            for (var i = 0; i < objKeys.length; ++i) {
                var key = objKeys[i];

                if (skipNulls && obj[key] === null) {
                    continue;
                }

                keys = keys.concat(stringify(
                    obj[key],
                    key,
                    generateArrayPrefix,
                    strictNullHandling,
                    skipNulls,
                    encode ? encoder : null,
                    filter,
                    sort,
                    allowDots,
                    serializeDate,
                    formatter,
                    encodeValuesOnly
                ));
            }

            var joined = keys.join(delimiter);
            var prefix = options.addQueryPrefix === true ? '?' : '';

            return joined.length > 0 ? prefix + joined : '';
        };

        var has$1 = Object.prototype.hasOwnProperty;

        var defaults$1 = {
            allowDots: false,
            allowPrototypes: false,
            arrayLimit: 20,
            decoder: utils.decode,
            delimiter: '&',
            depth: 5,
            parameterLimit: 1000,
            plainObjects: false,
            strictNullHandling: false
        };

        var parseValues = function parseQueryStringValues(str, options) {
            var obj = {};
            var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
            var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
            var parts = cleanStr.split(options.delimiter, limit);

            for (var i = 0; i < parts.length; ++i) {
                var part = parts[i];

                var bracketEqualsPos = part.indexOf(']=');
                var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

                var key, val;
                if (pos === -1) {
                    key = options.decoder(part, defaults$1.decoder);
                    val = options.strictNullHandling ? null : '';
                } else {
                    key = options.decoder(part.slice(0, pos), defaults$1.decoder);
                    val = options.decoder(part.slice(pos + 1), defaults$1.decoder);
                }
                if (has$1.call(obj, key)) {
                    obj[key] = [].concat(obj[key]).concat(val);
                } else {
                    obj[key] = val;
                }
            }

            return obj;
        };

        var parseObject = function (chain, val, options) {
            var leaf = val;

            for (var i = chain.length - 1; i >= 0; --i) {
                var obj;
                var root = chain[i];

                if (root === '[]') {
                    obj = [];
                    obj = obj.concat(leaf);
                } else {
                    obj = options.plainObjects ? Object.create(null) : {};
                    var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
                    var index = parseInt(cleanRoot, 10);
                    if (
                        !isNaN(index)
                        && root !== cleanRoot
                        && String(index) === cleanRoot
                        && index >= 0
                        && (options.parseArrays && index <= options.arrayLimit)
                    ) {
                        obj = [];
                        obj[index] = leaf;
                    } else {
                        obj[cleanRoot] = leaf;
                    }
                }

                leaf = obj;
            }

            return leaf;
        };

        var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
            if (!givenKey) {
                return;
            }

            // Transform dot notation to bracket notation
            var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

            // The regex chunks

            var brackets = /(\[[^[\]]*])/;
            var child = /(\[[^[\]]*])/g;

            // Get the parent

            var segment = brackets.exec(key);
            var parent = segment ? key.slice(0, segment.index) : key;

            // Stash the parent if it exists

            var keys = [];
            if (parent) {
                // If we aren't using plain objects, optionally prefix keys
                // that would overwrite object prototype properties
                if (!options.plainObjects && has$1.call(Object.prototype, parent)) {
                    if (!options.allowPrototypes) {
                        return;
                    }
                }

                keys.push(parent);
            }

            // Loop through children appending to the array until we hit depth

            var i = 0;
            while ((segment = child.exec(key)) !== null && i < options.depth) {
                i += 1;
                if (!options.plainObjects && has$1.call(Object.prototype, segment[1].slice(1, -1))) {
                    if (!options.allowPrototypes) {
                        return;
                    }
                }
                keys.push(segment[1]);
            }

            // If there's a remainder, just add whatever is left

            if (segment) {
                keys.push('[' + key.slice(segment.index) + ']');
            }

            return parseObject(keys, val, options);
        };

        var parse$1 = function (str, opts) {
            var options = opts ? utils.assign({}, opts) : {};

            if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
                throw new TypeError('Decoder has to be a function.');
            }

            options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
            options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults$1.delimiter;
            options.depth = typeof options.depth === 'number' ? options.depth : defaults$1.depth;
            options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults$1.arrayLimit;
            options.parseArrays = options.parseArrays !== false;
            options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults$1.decoder;
            options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults$1.allowDots;
            options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults$1.plainObjects;
            options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults$1.allowPrototypes;
            options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults$1.parameterLimit;
            options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults$1.strictNullHandling;

            if (str === '' || str === null || typeof str === 'undefined') {
                return options.plainObjects ? Object.create(null) : {};
            }

            var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
            var obj = options.plainObjects ? Object.create(null) : {};

            // Iterate over the keys and setup the new object

            var keys = Object.keys(tempObj);
            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                var newObj = parseKeys(key, tempObj[key], options);
                obj = utils.merge(obj, newObj, options);
            }

            return utils.compact(obj);
        };

        var lib = {
            formats: formats,
            parse: parse$1,
            stringify: stringify_1
        };

        var util = createCommonjsModule(function (module) {
        // Some utility functions in js

        var u = module.exports = {
          array: {
            // Returns a copy of the array with the value removed once
            //
            //     [1, 2, 3, 1].del 1 #=> [2, 3, 1]
            //     [1, 2, 3].del 4    #=> [1, 2, 3]
            del: function (arr, val) {
              var index = arr.indexOf(val);

              if (index != -1) {
                if (index == 0) {
                 return arr.slice(1)
                } else {
                  return arr.slice(0, index).concat(arr.slice(index+1));
                }
              } else {
                return arr;
              }
            },

            // Returns the first element of the array
            //
            //     [1, 2, 3].first() #=> 1
            first: function(arr) {
              return arr[0];
            },

            // Returns the last element of the array
            //
            //     [1, 2, 3].last()  #=> 3
            last: function(arr) {
              return arr[arr.length-1];
            }
          },
          string: {
            // Returns a copy of str with all occurrences of pattern replaced with either replacement or the return value of a function.
            // The pattern will typically be a Regexp; if it is a String then no regular expression metacharacters will be interpreted
            // (that is /\d/ will match a digit, but ‘\d’ will match a backslash followed by a ‘d’).
            //
            // In the function form, the current match object is passed in as a parameter to the function, and variables such as
            // $[1], $[2], $[3] (where $ is the match object) will be set appropriately. The value returned by the function will be
            // substituted for the match on each call.
            //
            // The result inherits any tainting in the original string or any supplied replacement string.
            //
            //     "hello".gsub /[aeiou]/, '*'      #=> "h*ll*"
            //     "hello".gsub /[aeiou]/, '<$1>'   #=> "h<e>ll<o>"
            //     "hello".gsub /[aeiou]/, ($) {
            //       "<#{$[1]}>"                    #=> "h<e>ll<o>"
            //
            gsub: function (str, pattern, replacement) {
              var i, match, matchCmpr, matchCmprPrev, replacementStr, result, self;
              if (!((pattern != null) && (replacement != null))) return u.string.value(str);
              result = '';
              self = str;
              while (self.length > 0) {
                if ((match = self.match(pattern))) {
                  result += self.slice(0, match.index);
                  if (typeof replacement === 'function') {
                    match[1] = match[1] || match[0];
                    result += replacement(match);
                  } else if (replacement.match(/\$[1-9]/)) {
                    matchCmprPrev = match;
                    matchCmpr = u.array.del(match, void 0);
                    while (matchCmpr !== matchCmprPrev) {
                      matchCmprPrev = matchCmpr;
                      matchCmpr = u.array.del(matchCmpr, void 0);
                    }
                    match[1] = match[1] || match[0];
                    replacementStr = replacement;
                    for (i = 1; i <= 9; i++) {
                      if (matchCmpr[i]) {
                        replacementStr = u.string.gsub(replacementStr, new RegExp("\\\$" + i), matchCmpr[i]);
                      }
                    }
                    result += replacementStr;
                  } else {
                    result += replacement;
                  }
                  self = self.slice(match.index + match[0].length);
                } else {
                  result += self;
                  self = '';
                }
              }
              return result;
            },

            // Returns a copy of the String with the first letter being upper case
            //
            //     "hello".upcase #=> "Hello"
            upcase: function(str) {
              var self = u.string.gsub(str, /_([a-z])/, function ($) {
                return "_" + $[1].toUpperCase();
              });

              self = u.string.gsub(self, /\/([a-z])/, function ($) {
                return "/" + $[1].toUpperCase();
              });

              return self[0].toUpperCase() + self.substr(1);
            },

            // Returns a copy of capitalized string
            //
            //     "employee salary" #=> "Employee Salary"
            capitalize: function (str, spaces) {
              if (!str.length) {
                return str;
              }

              var self = str.toLowerCase();

              if (!spaces) {
                self = u.string.gsub(self, /\s([a-z])/, function ($) {
                  return " " + $[1].toUpperCase();
                });
              }

              return self[0].toUpperCase() + self.substr(1);
            },

            // Returns a copy of the String with the first letter being lower case
            //
            //     "HELLO".downcase #=> "hELLO"
            downcase: function(str) {
              var self = u.string.gsub(str, /_([A-Z])/, function ($) {
                return "_" + $[1].toLowerCase();
              });

              self = u.string.gsub(self, /\/([A-Z])/, function ($) {
                return "/" + $[1].toLowerCase();
              });

              return self[0].toLowerCase() + self.substr(1);
            },

            // Returns a string value for the String object
            //
            //     "hello".value() #=> "hello"
            value: function (str) {
              return str.substr(0);
            }
          }
        };
        });
        var util_1 = util.array;
        var util_2 = util.string;

        // Default inflections
        var defaults$2 = function (inflect) {

          inflect.plural(/$/, 's');
          inflect.plural(/s$/i, 's');
          inflect.plural(/(ax|test)is$/i, '$1es');
          inflect.plural(/(octop|vir)us$/i, '$1i');
          inflect.plural(/(octop|vir)i$/i, '$1i');
          inflect.plural(/(alias|status)$/i, '$1es');
          inflect.plural(/(bu)s$/i, '$1ses');
          inflect.plural(/(buffal|tomat)o$/i, '$1oes');
          inflect.plural(/([ti])um$/i, '$1a');
          inflect.plural(/([ti])a$/i, '$1a');
          inflect.plural(/sis$/i, 'ses');
          inflect.plural(/(?:([^fa])fe|(?:(oa)f)|([lr])f)$/i, '$1ves');
          inflect.plural(/(hive)$/i, '$1s');
          inflect.plural(/([^aeiouy]|qu)y$/i, '$1ies');
          inflect.plural(/(x|ch|ss|sh)$/i, '$1es');
          inflect.plural(/(matr|vert|ind)(?:ix|ex)$/i, '$1ices');
          inflect.plural(/([m|l])ouse$/i, '$1ice');
          inflect.plural(/([m|l])ice$/i, '$1ice');
          inflect.plural(/^(ox)$/i, '$1en');
          inflect.plural(/^(oxen)$/i, '$1');
          inflect.plural(/(quiz)$/i, '$1zes');

          inflect.singular(/s$/i, '');
          inflect.singular(/(n)ews$/i, '$1ews');
          inflect.singular(/([ti])a$/i, '$1um');
          inflect.singular(/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, '$1sis');
          inflect.singular(/(^analy)ses$/i, '$1sis');
          inflect.singular(/([^f])ves$/i, '$1fe');
          inflect.singular(/(hive)s$/i, '$1');
          inflect.singular(/(tive)s$/i, '$1');
          inflect.singular(/(oave)s$/i, 'oaf');
          inflect.singular(/([lr])ves$/i, '$1f');
          inflect.singular(/([^aeiouy]|qu)ies$/i, '$1y');
          inflect.singular(/(s)eries$/i, '$1eries');
          inflect.singular(/(m)ovies$/i, '$1ovie');
          inflect.singular(/(x|ch|ss|sh)es$/i, '$1');
          inflect.singular(/([m|l])ice$/i, '$1ouse');
          inflect.singular(/(bus)es$/i, '$1');
          inflect.singular(/(o)es$/i, '$1');
          inflect.singular(/(shoe)s$/i, '$1');
          inflect.singular(/(cris|ax|test)es$/i, '$1is');
          inflect.singular(/(octop|vir)i$/i, '$1us');
          inflect.singular(/(alias|status)es$/i, '$1');
          inflect.singular(/^(ox)en/i, '$1');
          inflect.singular(/(vert|ind)ices$/i, '$1ex');
          inflect.singular(/(matr)ices$/i, '$1ix');
          inflect.singular(/(quiz)zes$/i, '$1');
          inflect.singular(/(database)s$/i, '$1');

          inflect.irregular('child', 'children');
          inflect.irregular('person', 'people');
          inflect.irregular('man', 'men');
          inflect.irregular('child', 'children');
          inflect.irregular('sex', 'sexes');
          inflect.irregular('move', 'moves');
          inflect.irregular('cow', 'kine');
          inflect.irregular('zombie', 'zombies');
          inflect.irregular('oaf', 'oafs', true);
          inflect.irregular('jefe', 'jefes');
          inflect.irregular('save', 'saves');
          inflect.irregular('safe', 'safes');
          inflect.irregular('fife', 'fifes');

          inflect.uncountable(['equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep', 'jeans', 'sushi']);
        };

        // A singleton instance of this class is yielded by Inflector.inflections, which can then be used to specify additional
        // inflection rules. Examples:
        //
        //     BulletSupport.Inflector.inflect ($) ->
        //       $.plural /^(ox)$/i, '$1en'
        //       $.singular /^(ox)en/i, '$1'
        //
        //       $.irregular 'octopus', 'octopi'
        //
        //       $.uncountable "equipment"
        //
        // New rules are added at the top. So in the example above, the irregular rule for octopus will now be the first of the
        // pluralization and singularization rules that is runs. This guarantees that your rules run before any of the rules that may
        // already have been loaded.



        var Inflections = function () {
          this.plurals = [];
          this.singulars = [];
          this.uncountables = [];
          this.humans = [];
          defaults$2(this);
          return this;
        };

        // Specifies a new pluralization rule and its replacement. The rule can either be a string or a regular expression.
        // The replacement should always be a string that may include references to the matched data from the rule.
        Inflections.prototype.plural = function (rule, replacement) {
          if (typeof rule == 'string') {
            this.uncountables = util.array.del(this.uncountables, rule);
          }
          this.uncountables = util.array.del(this.uncountables, replacement);
          this.plurals.unshift([rule, replacement]);
        };

        // Specifies a new singularization rule and its replacement. The rule can either be a string or a regular expression.
        // The replacement should always be a string that may include references to the matched data from the rule.
        Inflections.prototype.singular = function (rule, replacement) {
          if (typeof rule == 'string') {
            this.uncountables = util.array.del(this.uncountables, rule);
          }
          this.uncountables = util.array.del(this.uncountables, replacement);
          this.singulars.unshift([rule, replacement]);
        };

        // Specifies a new irregular that applies to both pluralization and singularization at the same time. This can only be used
        // for strings, not regular expressions. You simply pass the irregular in singular and plural form.
        //
        //     irregular 'octopus', 'octopi'
        //     irregular 'person', 'people'
        Inflections.prototype.irregular =  function (singular, plural, fullMatchRequired) {
          this.uncountables = util.array.del(this.uncountables, singular);
          this.uncountables = util.array.del(this.uncountables, plural);
          var prefix = "";
          if (fullMatchRequired) {
            prefix = "^";
          }
          if (singular[0].toUpperCase() == plural[0].toUpperCase()) {
            this.plural(new RegExp("(" + prefix + singular[0] + ")" + singular.slice(1) + "$", "i"), '$1' + plural.slice(1));
            this.plural(new RegExp("(" + prefix + plural[0] + ")" + plural.slice(1) + "$", "i"), '$1' + plural.slice(1));
            this.singular(new RegExp("(" + prefix + plural[0] + ")" + plural.slice(1) + "$", "i"), '$1' + singular.slice(1));
          } else {
            this.plural(new RegExp(prefix + (singular[0].toUpperCase()) + singular.slice(1) + "$"), plural[0].toUpperCase() + plural.slice(1));
            this.plural(new RegExp(prefix + (singular[0].toLowerCase()) + singular.slice(1) + "$"), plural[0].toLowerCase() + plural.slice(1));
            this.plural(new RegExp(prefix + (plural[0].toUpperCase()) + plural.slice(1) + "$"), plural[0].toUpperCase() + plural.slice(1));
            this.plural(new RegExp(prefix + (plural[0].toLowerCase()) + plural.slice(1) + "$"), plural[0].toLowerCase() + plural.slice(1));
            this.singular(new RegExp(prefix + (plural[0].toUpperCase()) + plural.slice(1) + "$"), singular[0].toUpperCase() + singular.slice(1));
            this.singular(new RegExp(prefix + (plural[0].toLowerCase()) + plural.slice(1) + "$"), singular[0].toLowerCase() + singular.slice(1));
          }
        };

        // Specifies a humanized form of a string by a regular expression rule or by a string mapping.
        // When using a regular expression based replacement, the normal humanize formatting is called after the replacement.
        // When a string is used, the human form should be specified as desired (example: 'The name', not 'the_name')
        //
        //     human /(.*)_cnt$/i, '$1_count'
        //     human "legacy_col_person_name", "Name"
        Inflections.prototype.human = function (rule, replacement) {
          this.humans.unshift([rule, replacement]);
        };

        // Add uncountable words that shouldn't be attempted inflected.
        //
        //     uncountable "money"
        //     uncountable ["money", "information"]
        Inflections.prototype.uncountable = function (words) {
          this.uncountables = this.uncountables.concat(words);
        };

        // Clears the loaded inflections within a given scope (default is _'all'_).
        // Give the scope as a symbol of the inflection type, the options are: _'plurals'_,
        // _'singulars'_, _'uncountables'_, _'humans'_.
        //
        //     clear 'all'
        //     clear 'plurals'
        Inflections.prototype.clear = function (scope) {
          if (scope == null) scope = 'all';
          switch (scope) {
            case 'all':
              this.plurals = [];
              this.singulars = [];
              this.uncountables = [];
              this.humans = [];
            default:
              this[scope] = [];
          }
        };

        // Clears the loaded inflections and initializes them to [default](../inflections.html)
        Inflections.prototype.default = function () {
          this.plurals = [];
          this.singulars = [];
          this.uncountables = [];
          this.humans = [];
          defaults$2(this);
          return this;
        };

        var inflections = new Inflections();

        var methods$1 = createCommonjsModule(function (module) {
        // The Inflector transforms words from singular to plural, class names to table names, modularized class names to ones without,
        // and class names to foreign keys. The default inflections for pluralization, singularization, and uncountable words are kept
        // in inflections.coffee
        //
        // If you discover an incorrect inflection and require it for your application, you'll need
        // to correct it yourself (explained below).



        var inflect = module.exports;

        // Import [inflections](inflections.html) instance
        inflect.inflections = inflections;

        // Gives easy access to add inflections to this class
        inflect.inflect = function (fn) {
          fn(inflect.inflections);
        };

        // By default, _camelize_ converts strings to UpperCamelCase. If the argument to _camelize_
        // is set to _false_ then _camelize_ produces lowerCamelCase.
        //
        // _camelize_ will also convert '/' to '.' which is useful for converting paths to namespaces.
        //
        //     "bullet_record".camelize()             // => "BulletRecord"
        //     "bullet_record".camelize(false)        // => "bulletRecord"
        //     "bullet_record/errors".camelize()      // => "BulletRecord.Errors"
        //     "bullet_record/errors".camelize(false) // => "bulletRecord.Errors"
        //
        // As a rule of thumb you can think of _camelize_ as the inverse of _underscore_,
        // though there are cases where that does not hold:
        //
        //     "SSLError".underscore.camelize // => "SslError"
        inflect.camelize = function(lower_case_and_underscored_word, first_letter_in_uppercase) {
          var result;
          if (first_letter_in_uppercase == null) first_letter_in_uppercase = true;
          result = util.string.gsub(lower_case_and_underscored_word, /\/(.?)/, function($) {
            return "." + (util.string.upcase($[1]));
          });
          result = util.string.gsub(result, /(?:_)(.)/, function($) {
            return util.string.upcase($[1]);
          });
          if (first_letter_in_uppercase) {
            return util.string.upcase(result);
          } else {
            return util.string.downcase(result);
          }
        };

        // Makes an underscored, lowercase form from the expression in the string.
        //
        // Changes '.' to '/' to convert namespaces to paths.
        //
        //     "BulletRecord".underscore()         // => "bullet_record"
        //     "BulletRecord.Errors".underscore()  // => "bullet_record/errors"
        //
        // As a rule of thumb you can think of +underscore+ as the inverse of +camelize+,
        // though there are cases where that does not hold:
        //
        //     "SSLError".underscore().camelize() // => "SslError"
        inflect.underscore = function (camel_cased_word) {
          var self;
          self = util.string.gsub(camel_cased_word, /\./, '/');
          self = util.string.gsub(self, /([A-Z]+)([A-Z][a-z])/, "$1_$2");
          self = util.string.gsub(self, /([a-z\d])([A-Z])/, "$1_$2");
          self = util.string.gsub(self, /-/, '_');
          return self.toLowerCase();
        };

        // Replaces underscores with dashes in the string.
        //
        //     "puni_puni".dasherize()   // => "puni-puni"
        inflect.dasherize = function (underscored_word) {
          return util.string.gsub(underscored_word, /_/, '-');
        };

        // Removes the module part from the expression in the string.
        //
        //     "BulletRecord.String.Inflections".demodulize() // => "Inflections"
        //     "Inflections".demodulize()                     // => "Inflections"
        inflect.demodulize = function (class_name_in_module) {
          return util.string.gsub(class_name_in_module, /^.*\./, '');
        };

        // Creates a foreign key name from a class name.
        // _separate_class_name_and_id_with_underscore_ sets whether
        // the method should put '_' between the name and 'id'.
        //
        //     "Message".foreign_key()      // => "message_id"
        //     "Message".foreign_key(false) // => "messageid"
        //     "Admin::Post".foreign_key()  // => "post_id"
        inflect.foreign_key = function (class_name, separate_class_name_and_id_with_underscore) {
          if (separate_class_name_and_id_with_underscore == null) {
            separate_class_name_and_id_with_underscore = true;
          }
          return inflect.underscore(inflect.demodulize(class_name)) + (separate_class_name_and_id_with_underscore ? "_id" : "id");
        };

        // Turns a number into an ordinal string used to denote the position in an
        // ordered sequence such as 1st, 2nd, 3rd, 4th.
        //
        //     ordinalize(1)     // => "1st"
        //     ordinalize(2)     // => "2nd"
        //     ordinalize(1002)  // => "1002nd"
        //     ordinalize(1003)  // => "1003rd"
        //     ordinalize(-11)   // => "-11th"
        //     ordinalize(-1021) // => "-1021st"
        inflect.ordinalize = function (number) {
          var _ref;
          number = parseInt(number);
          if ((_ref = Math.abs(number) % 100) === 11 || _ref === 12 || _ref === 13) {
            return "" + number + "th";
          } else {
            switch (Math.abs(number) % 10) {
              case 1:
                return "" + number + "st";
              case 2:
                return "" + number + "nd";
              case 3:
                return "" + number + "rd";
              default:
                return "" + number + "th";
            }
          }
        };

        // Checks a given word for uncountability
        //
        //     "money".uncountability()     // => true
        //     "my money".uncountability()  // => true
        inflect.uncountability = function (word) {
          return inflect.inflections.uncountables.some(function(ele, ind, arr) {
            return word.match(new RegExp("(\\b|_)" + ele + "$", 'i')) != null;
          });
        };

        // Returns the plural form of the word in the string.
        //
        //     "post".pluralize()             // => "posts"
        //     "octopus".pluralize()          // => "octopi"
        //     "sheep".pluralize()            // => "sheep"
        //     "words".pluralize()            // => "words"
        //     "CamelOctopus".pluralize()     // => "CamelOctopi"
        inflect.pluralize = function (word) {
          var plural, result;
          result = word;
          if (word === '' || inflect.uncountability(word)) {
            return result;
          } else {
            for (var i = 0; i < inflect.inflections.plurals.length; i++) {
              plural = inflect.inflections.plurals[i];
              result = util.string.gsub(result, plural[0], plural[1]);
              if (word.match(plural[0]) != null) break;
            }
            return result;
          }
        };

        // The reverse of _pluralize_, returns the singular form of a word in a string.
        //
        //     "posts".singularize()            // => "post"
        //     "octopi".singularize()           // => "octopus"
        //     "sheep".singularize()            // => "sheep"
        //     "word".singularize()             // => "word"
        //     "CamelOctopi".singularize()      // => "CamelOctopus"
        inflect.singularize = function (word) {
          var result, singular;
          result = word;
          if (word === '' || inflect.uncountability(word)) {
            return result;
          } else {
            for (var i = 0; i < inflect.inflections.singulars.length; i++) {
              singular = inflect.inflections.singulars[i];
              result = util.string.gsub(result, singular[0], singular[1]);
              if (word.match(singular[0])) break;
            }
            return result;
          }
        };

        // Capitalizes the first word and turns underscores into spaces and strips a
        // trailing "_id", if any. Like _titleize_, this is meant for creating pretty output.
        //
        //     "employee_salary".humanize()   // => "Employee salary"
        //     "author_id".humanize()         // => "Author"
        inflect.humanize = function (lower_case_and_underscored_word) {
          var human, result;
          result = lower_case_and_underscored_word;
          for (var i = 0; i < inflect.inflections.humans.length; i++) {
            human = inflect.inflections.humans[i];
            result = util.string.gsub(result, human[0], human[1]);
          }
          result = util.string.gsub(result, /_id$/, "");
          result = util.string.gsub(result, /_/, " ");
          return util.string.capitalize(result, true);
        };

        // Capitalizes all the words and replaces some characters in the string to create
        // a nicer looking title. _titleize_ is meant for creating pretty output. It is not
        // used in the Bullet internals.
        //
        //
        //     "man from the boondocks".titleize()   // => "Man From The Boondocks"
        //     "x-men: the last stand".titleize()    // => "X Men: The Last Stand"
        inflect.titleize = function (word) {
          var self;
          self = inflect.humanize(inflect.underscore(word));
          return util.string.capitalize(self);
        };

        // Create the name of a table like Bullet does for models to table names. This method
        // uses the _pluralize_ method on the last word in the string.
        //
        //     "RawScaledScorer".tableize()   // => "raw_scaled_scorers"
        //     "egg_and_ham".tableize()       // => "egg_and_hams"
        //     "fancyCategory".tableize()     // => "fancy_categories"
        inflect.tableize = function (class_name) {
          return inflect.pluralize(inflect.underscore(class_name));
        };

        // Create a class name from a plural table name like Bullet does for table names to models.
        // Note that this returns a string and not a Class.
        //
        //     "egg_and_hams".classify()   // => "EggAndHam"
        //     "posts".classify()          // => "Post"
        //
        // Singular names are not handled correctly:
        //
        //     "business".classify()       // => "Busines"
        inflect.classify = function (table_name) {
          return inflect.camelize(inflect.singularize(util.string.gsub(table_name, /.*\./, '')));
        };
        });

        var native_1 = function (obj) {

          var addProperty = function (method, func) {
            String.prototype.__defineGetter__(method, func);
          };

          var stringPrototypeBlacklist = [
            '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', 'charAt', 'constructor',
            'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', 'charCodeAt',
            'indexOf', 'lastIndexof', 'length', 'localeCompare', 'match', 'replace', 'search', 'slice', 'split', 'substring',
            'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight', 'gsub'
          ];

          Object.keys(obj).forEach(function (key) {
            if (key != 'inflect' && key != 'inflections') {
              if (stringPrototypeBlacklist.indexOf(key) !== -1) {
                console.log('warn: You should not override String.prototype.' + key);
              } else {
                addProperty(key, function () {
                  return obj[key](this);
                });
              }
            }
          });

        };

        // Requiring modules

        var inflect = function (attach) {
          var methods = methods$1;

          if (attach) {
            native_1(methods);
          }

          return methods
        };

        var STRING_DASHERIZE_REGEXP = (/[ _]/g);
        var STRING_DASHERIZE_CACHE = {};
        var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
        var STRING_CAMELIZE_REGEXP = (/(\-|_|\.|\s)+(.)?/g);
        var STRING_UNDERSCORE_REGEXP_1 = (/([a-z\d])([A-Z]+)/g);
        var STRING_UNDERSCORE_REGEXP_2 = (/\-|\s+/g);

        /**
          Converts a camelized string into all lower case separated by underscores.

          ```javascript
          decamelize('innerHTML');         // 'inner_html'
          decamelize('action_name');       // 'action_name'
          decamelize('css-class-name');    // 'css-class-name'
          decamelize('my favorite items'); // 'my favorite items'
          ```

          @method decamelize
          @param {String} str The string to decamelize.
          @return {String} the decamelized string.
        */
        function decamelize(str) {
          return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
        }

        /**
          Replaces underscores, spaces, or camelCase with dashes.

          ```javascript
          dasherize('innerHTML');         // 'inner-html'
          dasherize('action_name');       // 'action-name'
          dasherize('css-class-name');    // 'css-class-name'
          dasherize('my favorite items'); // 'my-favorite-items'
          ```

          @method dasherize
          @param {String} str The string to dasherize.
          @return {String} the dasherized string.
        */
        function dasherize(str) {
          var cache = STRING_DASHERIZE_CACHE,
              hit   = cache.hasOwnProperty(str),
              ret;

          if (hit) {
            return cache[str];
          } else {
            ret = decamelize(str).replace(STRING_DASHERIZE_REGEXP,'-');
            cache[str] = ret;
          }

          return ret;
        }

        /**
          Returns the lowerCamelCase form of a string.

          ```javascript
          camelize('innerHTML');          // 'innerHTML'
          camelize('action_name');        // 'actionName'
          camelize('css-class-name');     // 'cssClassName'
          camelize('my favorite items');  // 'myFavoriteItems'
          camelize('My Favorite Items');  // 'myFavoriteItems'
          ```

          @method camelize
          @param {String} str The string to camelize.
          @return {String} the camelized string.
        */
        function camelize(str) {
          return str.replace(STRING_CAMELIZE_REGEXP, function(match, separator, chr) {
            return chr ? chr.toUpperCase() : '';
          }).replace(/^([A-Z])/, function(match) {
            return match.toLowerCase();
          });
        }

        /**
          Returns the UpperCamelCase form of a string.

          ```javascript
          'innerHTML'.classify();          // 'InnerHTML'
          'action_name'.classify();        // 'ActionName'
          'css-class-name'.classify();     // 'CssClassName'
          'my favorite items'.classify();  // 'MyFavoriteItems'
          ```

          @method classify
          @param {String} str the string to classify
          @return {String} the classified string
        */
        function classify(str) {
          var parts = str.split('.'),
              out = [];

          for (var i=0, l=parts.length; i<l; i++) {
            var camelized = camelize(parts[i]);
            out.push(camelized.charAt(0).toUpperCase() + camelized.substr(1));
          }

          return out.join('.');
        }

        /**
          More general than decamelize. Returns the lower\_case\_and\_underscored
          form of a string.

          ```javascript
          'innerHTML'.underscore();          // 'inner_html'
          'action_name'.underscore();        // 'action_name'
          'css-class-name'.underscore();     // 'css_class_name'
          'my favorite items'.underscore();  // 'my_favorite_items'
          ```

          @method underscore
          @param {String} str The string to underscore.
          @return {String} the underscored string.
        */
        function underscore(str) {
          return str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').
            replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase();
        }

        /**
          Returns the Capitalized form of a string

          ```javascript
          'innerHTML'.capitalize()         // 'InnerHTML'
          'action_name'.capitalize()       // 'Action_name'
          'css-class-name'.capitalize()    // 'Css-class-name'
          'my favorite items'.capitalize() // 'My favorite items'
          ```

          @method capitalize
          @param {String} str The string to capitalize.
          @return {String} The capitalized string.
        */
        function capitalize(str) {
          return str.charAt(0).toUpperCase() + str.substr(1);
        }

        var emberCliStringUtils = {
          decamelize: decamelize,
          dasherize: dasherize,
          camelize: camelize,
          classify: classify,
          underscore: underscore,
          capitalize: capitalize
        };

        const { classify: classify$1 } = emberCliStringUtils;
        const { singularize } = inflect();
        const targetNamespace$1 = typeof global$1 === 'object' ? global$1 : window;

        // HACK START: Pretender Request Parameter Type Casting Hack: Because types are important.
        window.Pretender.prototype._handlerFor = function(verb, url, request) {
          var registry = this.hosts.forURL(url)[verb];

          var matches = registry.recognize(window.Pretender.parseURL(url).fullpath);
          var match = matches ? matches[0] : null;
          var headers = request.requestHeaders || {};

          if (match) {
            request.headers = headers;
            request.params = Object.keys(match.params).reduce((result, key) => {
              var value = castCorrectType(match.params[key]);

              return Object.assign(result, { [key]: value });
            }, {});
            request.queryParams = Object.keys(matches.queryParams).reduce((result, key) => {
              var targetValue = castCorrectType(matches.queryParams[key]);

              return Object.assign(result, { [key]: targetValue });
            }, {});

            var contentHeader = request.headers['Content-Type'] || request.headers['content-type'];

            if (request.requestBody && contentHeader && contentHeader.includes('application/json')) {
              request.params = nilifyStrings(Object.assign(request.params, JSON.parse(request.requestBody)));
            } else {
              request.params = nilifyStrings(Object.assign(request.params, lib.parse(request.requestBody)));
            }
          }

          return match;
        };

        function castCorrectType(value) {
          if (Array.isArray(value)) {
            return value.map((element) => castCorrectType(element));
          } else if (Number(value) && parseInt(value, 10)) {
            return Number(value);
          } else if (value === 'false') {
            return false;
          } else if (value === 'true') {
            return true;
          }

          return nilifyStrings(value);
        }

        function nilifyStrings(value) {
          if (value !== null && typeof value === 'object') {
            return Object.keys(value).reduce((object, key) => {
              return Object.assign(object, { [key]: nilifyStrings(value[key]) });
            }, {});
          } else if (value === '') {
            return null;
          }

          return value;
        }
        // END: Pretender Request Parameter Type Casting Hack

        // HACK START: Pretender Response Defaults UX Hack: Because Pretender Response types suck UX-wise.
        window.Pretender.prototype.handleRequest = function(request) {
          var pretender = this;
          var verb = request.method.toUpperCase();
          var path = request.url;
          var handler = pretender._handlerFor(verb, path, request);

          var _handleRequest = function(result) {
            var statusCode, headers, body;

            if (Array.isArray(result) && result.length === 3) {
              statusCode = result[0];
              headers = pretender.prepareHeaders(result[1]);
              body = pretender.prepareBody(result[2], headers);

              return pretender.handleResponse(request, async, function() {
                request.respond(statusCode, headers, body);
                pretender.handledRequest(verb, path, request);
              });
            } else if (!result) {
              headers = pretender.prepareHeaders({ 'Content-Type': 'application/json' });

              if (verb === 'DELETE') {
                return pretender.handleResponse(request, async, function() {
                  request.respond(204, headers, pretender.prepareBody('{}', headers));
                  pretender.handledRequest(verb, path, request);
                });
              }

              return pretender.handleResponse(request, async, function() {
                request.respond(500, headers, pretender.prepareBody(JSON.stringify({
                  error: `[MemServer] ${verb} ${path} route handler did not return anything to respond to the request!`
                }), headers));
                pretender.handledRequest(verb, path, request);
              });
            }

            statusCode = getDefaultStatusCode(verb);
            headers = pretender.prepareHeaders({ 'Content-Type': 'application/json' });
            var targetResult = typeof result === 'string' ? result : JSON.stringify(result);
            body = pretender.prepareBody(targetResult, headers);

            return pretender.handleResponse(request, async, function() {
              request.respond(statusCode, headers, body);
              pretender.handledRequest(verb, path, request);
            });
          };

          if (handler) {
            var async = handler.handler.async;
            handler.handler.numberOfCalls++;
            this.handledRequests.push(request);

            var result = handler.handler(request);

            if (result && typeof result.then === 'function') { // `result` is a promise, resolve it
              result.then(function(resolvedResult) { _handleRequest(resolvedResult); });
            } else {
              _handleRequest(result);
            }
          } else {
            if (!this.disableUnhandled) {
              this.unhandledRequests.push(request);
              this.unhandledRequest(verb, path, request);
            }
          }
        };

        function getDefaultStatusCode(verb) {
          if (['GET', 'PUT', 'PATCH'].includes(verb)) {
            return 200;
          } else if (verb === 'POST') {
            return 201;
          } else if (verb === 'DELETE') {
            return 204;
          }

          return 500;
        }
        // END: Pretender Response Defaults UX Hack


        // HACK: Pretender REST defaults hack: For better UX
        ['get', 'put', 'post', 'delete'].forEach((verb) => {
          window.Pretender.prototype[verb] = function(path, handler, async) {
            const fullPath = (this.urlPrefix || '') + (this.namespace ? ('/' + this.namespace) : '') + path;
            const targetHandler = handler || getDefaultRouteHandler(verb.toUpperCase(), fullPath);
            const timing = async ? async.timing || this.timing : this.timing;
            // console.log('timing is', timing);
            // console.log('async is', async);
            return this.register(verb.toUpperCase(), fullPath, targetHandler, timing);
          };
        });
        // END: Pretender REST default hack: For better UX

        function getDefaultRouteHandler(verb, path) {
          const paths = path.split(/\//g);
          const lastPath = paths[paths.length - 1];
          const pluralResourceName = lastPath.includes(':') ? paths[paths.length - 2] : lastPath;
          const resourceName = singularize(pluralResourceName);
          const ResourceModel = targetNamespace$1.MemServer.Models[classify$1(resourceName)];

          if (!ResourceModel) {
            throw new Error(ansiColors.red(`[MemServer] ${verb} ${path} route handler cannot be generated automatically: ${classify$1(resourceName)} is not a valid MemServer.Model, please check that your route name matches the model reference or create a custom handler function`));
          } else if (verb === 'GET') {
            if (lastPath.includes(':')) {
              return (request) => {
                return { [resourceName]: ResourceModel.serializer(ResourceModel.find(request.params.id)) };
              };
            }

            return () => {
              return { [pluralResourceName]: ResourceModel.serializer(ResourceModel.findAll()) };
            };
          } else if (verb === 'POST') {
            return (request) => {
              const resourceParams = request.params[resourceName];

              return { [resourceName]: ResourceModel.serializer(ResourceModel.insert(resourceParams)) };
            };
          } else if (verb === 'PUT') {
            return (request) => {
              const resourceParams = request.params[resourceName];

              return { [resourceName]: ResourceModel.serializer(ResourceModel.update(resourceParams)) };
            };
          } else if (verb === 'DELETE') {
            return (request) => { ResourceModel.delete({ id: request.params.id }); };
          }
        }

        const ENVIRONMENT_IS_NODE = typeof global$1 === 'object';
        const targetNamespace$2 = ENVIRONMENT_IS_NODE ? global$1 : window;

        if (ENVIRONMENT_IS_NODE) {
          global$1.self = window.self;
        }

        window.FakeXMLHttpRequest = fake_xml_http_request;
        window.RouteRecognizer = RouteRecognizer;

        function MEMSERVER(modelFixtureTree, Server, initializer=() => {}) {
          if (!Server) {
            throw new Error('memserver/server.js doesnt exist! Please create a memserver/server.js to use MemServer');
          }

          targetNamespace$2.MemServer = {
            DB: {},
            Server: {},
            Models: registerModels(modelFixtureTree),
            start(options={ logging: true }) {
              this.DB = resetDatabase(this.Models, modelFixtureTree);
              this.Server = startServer(Server, options);

              initializer(this.Models);

              return this;
            },
            shutdown() {
              this.Server.shutdown();
              this.DB = {};

              return this;
            }
          };

          return targetNamespace$2.MemServer;
        }

        function registerModels(modelFixtureTree) {
          return Object.keys(modelFixtureTree).reduce((result, ModelName) => {
            result[ModelName] = Object.assign(modelFixtureTree[ModelName].model, {
              modelName: ModelName,
              primaryKey: null,
              attributes: Object.keys(modelFixtureTree[ModelName].model.defaultAttributes)
            });

            return result;
          }, {});
        }

        function resetDatabase(models, modelFixtureTree) {
          return Object.keys(models).reduce((result, modelName) => {
            result[modelName] = Array.from(modelFixtureTree[modelName].fixtures, (fixtureObject) => {
              return Object.assign({}, fixtureObject);
            });

            const modelPrimaryKey = result[modelName].reduce(([existingPrimaryKey, primaryKeys], model) => {
              const primaryKey = getModelPrimaryKey(model, existingPrimaryKey, modelName);

              if (!primaryKey) {
                throw new Error(ansiColors.red(`[MemServer] DB ERROR: At least one of your ${modelName} fixtures missing a primary key. Please make sure all your ${modelName} fixtures have either id or uuid primaryKey`));
              } else if (primaryKeys.includes(model[primaryKey])) {
                throw new Error(ansiColors.red(`[MemServer] DB ERROR: Duplication in ${modelName} fixtures with ${primaryKey}: ${model[primaryKey]}`));
              }

              const existingAttributes = targetNamespace$2.MemServer.Models[modelName].attributes;

              Object.keys(model).forEach((key) => {
                if (!existingAttributes.includes(key)) {
                  targetNamespace$2.MemServer.Models[modelName].attributes.push(key);
                }
              });

              return [primaryKey, primaryKeys.concat([model[primaryKey]])];
            }, [targetNamespace$2.MemServer.Models[modelName].primaryKey, []])[0];

            targetNamespace$2.MemServer.Models[modelName].primaryKey = modelPrimaryKey;

            return result;
          }, {});
        }

        function getModelPrimaryKey(model, existingPrimaryKeyType, modelName) {
          if (existingPrimaryKeyType) {
            return primaryKeyTypeSafetyCheck(existingPrimaryKeyType, model[existingPrimaryKeyType], modelName);
          }

          const primaryKey = model.id || model.uuid;

          if (!primaryKey) {
            return;
          }

          existingPrimaryKeyType = model.id ? 'id' : 'uuid';

          return primaryKeyTypeSafetyCheck(existingPrimaryKeyType, primaryKey, modelName);
        }

        const modelFixtureTree = Object.keys(models).reduce((tree, modelName) => {
          return Object.assign({}, tree, {
            [modelName]: {
              model: models[modelName],
              fixtures: fixtures[modelName] || []
            }
          });
        }, {});

        const memserver = MEMSERVER(modelFixtureTree, server, initializer);

        return memserver;

}());
window.MemServer = MEMSERVER;
