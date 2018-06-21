import {Container} from 'aurelia-dependency-injection';
import {DOM} from 'aurelia-pal';
import {ViewCompiler,ViewResources,BehaviorInstruction,TargetInstruction,BoundViewFactory,ViewSlot} from 'aurelia-templating';

let emptyArray = Object.freeze([]);

export class ComponentRegistry {
  static inject = [Container, ViewCompiler, ViewResources];

  _lookup = {};
  fallbackPrefix = 'au-';

  constructor(container, viewCompiler, viewResources) {
    this.container = container;
    this.viewCompiler = viewCompiler;
    this.viewResources = viewResources;
  }

  registerAllGlobalElements(): Function[] {
    let elements = this.viewResources.elements;

    return Object.keys(elements).map(tagName => {
      let behavior = elements[tagName];
      return this.registerBehavior(behavior, tagName);
    });
  }

  registerBehavior(behavior, tagName?:string): Function {
    let classDefinition = this._createWebComponentClassFromBehavior(behavior);
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
  }

  _determineTagNameFromBehavior(behavior) {
    return behavior.elementName;
  }

  _createWebComponentClassFromBehavior(behavior) {
    let viewResources = this.viewResources;
    let compiler = this.viewCompiler;
    let container = this.container;

    let CustomElement = class extends HTMLElement {
      constructor() {
        super();

        let behaviorInstruction = BehaviorInstruction.element(this, behavior);
        let attributes = this.attributes;
        let children = this._children = [];
        let bindings = this._bindings = [];

        behavior.processAttributes(compiler, viewResources, this, attributes, behaviorInstruction);

        for (let i = 0, ii = attributes.length; i < ii; ++i) {
          let attr = attributes[i];
          behaviorInstruction.attributes[attr.name] = attr.value;
        }

        behavior.compile(compiler, viewResources, this, behaviorInstruction, this.parentNode);

        let targetInstruction = TargetInstruction.normal(
          0,
          0,
          [behavior.target],
          [behaviorInstruction],
          emptyArray,
          behaviorInstruction
        );

        let childContainer = createElementContainer(
          container,
          this,
          targetInstruction,
          behaviorInstruction.partReplacements,
          children,
          viewResources
        );

        let controller = behavior.create(childContainer, behaviorInstruction, this, bindings);
        controller.created(null);
      }

      connectedCallback() {
        let scope = { bindingContext: this, overrideContext: {} };
        this.au.controller.bind(scope);
        this._bindings.forEach(x => x.bind(scope));
        this._children.forEach(x => x.bind(scope.bindingContext, scope.overrideContext, true));

        this.au.controller.attached();
        this._children.forEach(x => x.attached());
      }

      disconnectedCallback() {
        this.au.controller.detached();
        this._children.forEach(x => x.detached());

        this.au.controller.unbind();
        this._bindings.forEach(x => x.unbind());
        this._children.forEach(x => x.unbind());
      }

      attributeChangedCallback(attrName, oldValue, newValue) {
        let bindable = behavior.attributes[attrName];
        if (bindable) {
          this.au.controller.viewModel[bindable.name] = newValue;
        }
      }
    };

    let proto = CustomElement.prototype;
    let observedAttributes = [];

    behavior.properties.forEach(prop => {
      let descriptor = {
        get: function() {
          return this.au.controller.viewModel[prop.name];
        },
        set: function(value) {
          this.au.controller.viewModel[prop.name] = value;
        }
      };

      descriptor.get.getObserver = function(obj) {
        return getObserver(behavior, obj.au.controller.viewModel, prop.name);
      };

      observedAttributes.push(prop.attribute);
      Object.defineProperty(proto, prop.name, descriptor);
    });

    Object.defineProperty(CustomElement, 'observedAttributes', {
      get: function() {
        return observedAttributes;
      }
    });

    Object.keys(behavior.target.prototype).forEach(key => {
      try {
        let value = behavior.target.prototype[key];

        if (typeof value === 'function') {
          proto[key] = function(...args) {
            return this.au.controller.viewModel[key](...args);
          };
        }
      } catch (e) {
        //Do nothing since this is likely thrown by the getter and the value isn't a function.
      }
    });

    return CustomElement;
  }
}

function getObserver(behavior, instance, name) {
  let lookup = instance.__observers__;

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

    let factory = this.instruction.viewFactory;
    let partReplacements = this.partReplacements;

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
  let container = parent.createChild();
  let provider = instruction.providers[0];

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
