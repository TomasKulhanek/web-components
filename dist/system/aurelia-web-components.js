'use strict';

System.register(['aurelia-dependency-injection', 'aurelia-pal', 'aurelia-templating'], function (_export, _context) {
  "use strict";

  var Container, DOM, ViewCompiler, ViewResources, BehaviorInstruction, TargetInstruction, BoundViewFactory, ViewSlot, _class, _temp, emptyArray, ComponentRegistry;

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function _CustomElement() {
    return Reflect.construct(HTMLElement, [], this.__proto__.constructor);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function getObserver(behavior, instance, name) {
    var lookup = instance.__observers__;

    if (lookup === undefined) {
      if (!behavior.isInitialized) {
        behavior.initialize(Container.instance || new Container(), instance.constructor);
      }

      lookup = behavior.observerLocator.getOrCreateObserversLookup(instance);
      behavior._ensurePropertiesDefined(instance, lookup);
    }

    return lookup[name];
  }

  function elementContainerGet(key) {
    if (key === DOM.Element) {
      return this.element;
    }

    if (key === BoundViewFactory) {
      if (this.boundViewFactory) {
        return this.boundViewFactory;
      }

      var factory = this.instruction.viewFactory;
      var partReplacements = this.partReplacements;

      if (partReplacements) {
        factory = partReplacements[factory.part] || factory;
      }

      this.boundViewFactory = new BoundViewFactory(this, factory, partReplacements);
      return this.boundViewFactory;
    }

    if (key === ViewSlot) {
      if (this.viewSlot === undefined) {
        this.viewSlot = new ViewSlot(this.element, this.instruction.anchorIsContainer);
        this.element.isContentProjectionSource = this.instruction.lifting;
        this.children.push(this.viewSlot);
      }

      return this.viewSlot;
    }

    if (key === ViewResources) {
      return this.viewResources;
    }

    if (key === TargetInstruction) {
      return this.instruction;
    }

    return this.superGet(key);
  }

  function createElementContainer(parent, element, instruction, children, partReplacements, resources) {
    var container = parent.createChild();
    var provider = instruction.providers[0];

    container.element = element;
    container.instruction = instruction;
    container.children = children;
    container.viewResources = resources;
    container.partReplacements = partReplacements;

    container.registerSingleton(provider, provider);

    container.superGet = container.get;
    container.get = elementContainerGet;

    return container;
  }
  return {
    setters: [function (_aureliaDependencyInjection) {
      Container = _aureliaDependencyInjection.Container;
    }, function (_aureliaPal) {
      DOM = _aureliaPal.DOM;
    }, function (_aureliaTemplating) {
      ViewCompiler = _aureliaTemplating.ViewCompiler;
      ViewResources = _aureliaTemplating.ViewResources;
      BehaviorInstruction = _aureliaTemplating.BehaviorInstruction;
      TargetInstruction = _aureliaTemplating.TargetInstruction;
      BoundViewFactory = _aureliaTemplating.BoundViewFactory;
      ViewSlot = _aureliaTemplating.ViewSlot;
    }],
    execute: function () {
      ;
      Object.setPrototypeOf(_CustomElement.prototype, HTMLElement.prototype);
      Object.setPrototypeOf(_CustomElement, HTMLElement);
      emptyArray = Object.freeze([]);

      _export('ComponentRegistry', ComponentRegistry = (_temp = _class = function () {
        function ComponentRegistry(container, viewCompiler, viewResources) {
          _classCallCheck(this, ComponentRegistry);

          this._lookup = {};
          this.fallbackPrefix = 'au-';

          this.container = container;
          this.viewCompiler = viewCompiler;
          this.viewResources = viewResources;
        }

        ComponentRegistry.prototype.registerAllGlobalElements = function registerAllGlobalElements() {
          var _this = this;

          var elements = this.viewResources.elements;

          return Object.keys(elements).map(function (tagName) {
            var behavior = elements[tagName];
            return _this.registerBehavior(behavior, tagName);
          });
        };

        ComponentRegistry.prototype.registerBehavior = function registerBehavior(behavior, tagName) {
          var classDefinition = this._createWebComponentClassFromBehavior(behavior);
          tagName = tagName || this._determineTagNameFromBehavior(behavior);

          this._lookup[tagName] = {
            tagName: tagName,
            behavior: behavior,
            classDefinition: classDefinition
          };

          if (tagName.indexOf('-') === -1) {
            tagName = this.fallbackPrefix + tagName;
          }

          customElements.define(tagName, classDefinition);

          return classDefinition;
        };

        ComponentRegistry.prototype._determineTagNameFromBehavior = function _determineTagNameFromBehavior(behavior) {
          return behavior.elementName;
        };

        ComponentRegistry.prototype._createWebComponentClassFromBehavior = function _createWebComponentClassFromBehavior(behavior) {
          var viewResources = this.viewResources;
          var compiler = this.viewCompiler;
          var container = this.container;

          var CustomElement = function (_CustomElement2) {
            _inherits(CustomElement, _CustomElement2);

            function CustomElement() {
              _classCallCheck(this, CustomElement);

              var _this2 = _possibleConstructorReturn(this, _CustomElement2.call(this));

              var behaviorInstruction = BehaviorInstruction.element(_this2, behavior);
              var attributes = _this2.attributes;
              var children = _this2._children = [];
              var bindings = _this2._bindings = [];

              behavior.processAttributes(compiler, viewResources, _this2, attributes, behaviorInstruction);

              for (var i = 0, ii = attributes.length; i < ii; ++i) {
                var attr = attributes[i];
                behaviorInstruction.attributes[attr.name] = attr.value;
              }

              behavior.compile(compiler, viewResources, _this2, behaviorInstruction, _this2.parentNode);

              var targetInstruction = TargetInstruction.normal(0, 0, [behavior.target], [behaviorInstruction], emptyArray, behaviorInstruction);

              var childContainer = createElementContainer(container, _this2, targetInstruction, behaviorInstruction.partReplacements, children, viewResources);

              var controller = behavior.create(childContainer, behaviorInstruction, _this2, bindings);
              controller.created(null);
              return _this2;
            }

            CustomElement.prototype.connectedCallback = function connectedCallback() {
              var scope = { bindingContext: this, overrideContext: {} };
              this.au.controller.bind(scope);
              this._bindings.forEach(function (x) {
                return x.bind(scope);
              });
              this._children.forEach(function (x) {
                return x.bind(scope.bindingContext, scope.overrideContext, true);
              });

              this.au.controller.attached();
              this._children.forEach(function (x) {
                return x.attached();
              });
            };

            CustomElement.prototype.disconnectedCallback = function disconnectedCallback() {
              this.au.controller.detached();
              this._children.forEach(function (x) {
                return x.detached();
              });

              this.au.controller.unbind();
              this._bindings.forEach(function (x) {
                return x.unbind();
              });
              this._children.forEach(function (x) {
                return x.unbind();
              });
            };

            CustomElement.prototype.attributeChangedCallback = function attributeChangedCallback(attrName, oldValue, newValue) {
              var bindable = behavior.attributes[attrName];
              if (bindable) {
                this.au.controller.viewModel[bindable.name] = newValue;
              }
            };

            return CustomElement;
          }(_CustomElement);

          var proto = CustomElement.prototype;
          var observedAttributes = [];

          behavior.properties.forEach(function (prop) {
            var descriptor = {
              get: function get() {
                return this.au.controller.viewModel[prop.name];
              },
              set: function set(value) {
                this.au.controller.viewModel[prop.name] = value;
              }
            };

            descriptor.get.getObserver = function (obj) {
              return getObserver(behavior, obj.au.controller.viewModel, prop.name);
            };

            observedAttributes.push(prop.attribute);
            Object.defineProperty(proto, prop.name, descriptor);
          });

          Object.defineProperty(CustomElement, 'observedAttributes', {
            get: function get() {
              return observedAttributes;
            }
          });

          Object.keys(behavior.target.prototype).forEach(function (key) {
            try {
              var value = behavior.target.prototype[key];

              if (typeof value === 'function') {
                proto[key] = function () {
                  var _au$controller$viewMo;

                  return (_au$controller$viewMo = this.au.controller.viewModel)[key].apply(_au$controller$viewMo, arguments);
                };
              }
            } catch (e) {}
          });

          return CustomElement;
        };

        return ComponentRegistry;
      }(), _class.inject = [Container, ViewCompiler, ViewResources], _temp));

      _export('ComponentRegistry', ComponentRegistry);
    }
  };
});