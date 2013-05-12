title:  Welcome to Jekyll
date:   aas
----
![http://backbonejs.org/docs/images/backbone.png](http://backbonejs.org/docs/images/backbone.png)

# Learning JavaScript via the Backbone.js source code

When I started learning Backbone.js, I hadn't done advanced JavaScript programming before. I took this opportunity to explore advanced JavaScript concepts in the context of the [Backbone.js source code](http://backbonejs.org/docs/backbone.html).

In this post, I will share some of these concepts which helped me understand both Backbone.js and JavaScript on a deeper level.

*Note: the Backbone.js source code documentation is created using [docco](http://jashkenas.github.io/docco/), I recommend checking it out for documenting your code.*

## Immediately invoking function expressions
IIFE's look like this:
```javascript
(function () {
  ...
}());
```
*Note: The opening `(` and closing `)` are syntax to denote that this function is immediately invoked*

These functions are are used to prevent polluting the global namespace in the JavaScript runtime environment. The first line of the Backbone.js source code has an IIFE which wraps the rest of the code, preventing any variables declared inside it from being available globally. This is done to prevent situations where a variable is used multiple times in the global namespace on a web page.

For example the [first statements](http://backbonejs.org/docs/backbone.html#section-3) of the Backbone.js source code use common variable names which could potentially be modified elsewhere on the page if not placed inside the IIFE:
```javascript
var root = this;
var previousBackbone = root.Backbone;
var array = [];
var push = array.push;
var slice = array.slice;
var splice = array.splice;
```
## Inheritance
When building a Backbone.js app your Views will look something like:
```javascript
var MyView = Backbone.View.extend({
  ...
});
```
`MyView` is extending from the base `Backbone.View`, meaning that it inherits `Backbone.View`'s properties and methods. As a user of Backbone.js, you can optionally override these [inherited properties and methods](http://backbonejs.org/docs/backbone.html#section-123) in your implementation. 

There are three different kinds of properties and methods that `Backbone.View` contains:

### Properties/Methods that are expected to be overwritten
`Backbone.View` [explicitly says](http://backbonejs.org/docs/backbone.html#section-126) in the annotated source that `initialize` and `render` should be overwritten as they are empty implementations:
```javascript
initialize: function () {},

render: function () {
  return this;
}
```
During runtime, the `Backbone.View`'s constructor calls `initialize`and expects the user to implement some logic there to render the view. More on constructors later.

### Properties/Methods that can be optionally overwritten
`Backbone.Model` and `Backbone.Collection`'s [`sync`](http://backbonejs.org/docs/backbone.html#section-37) methods are the best examples of functions which work without a user's implementation, but can also be overwritten for custom functionality:
```javascript
sync: function () {
  return Backbone.sync.apply(this, arguments);
}
```
In the default implementation of `sync` above, the model or collection simply calls the [Backbone.sync](http://backbonejs.org/docs/backbone.html#section-135) method with the arguments it received using [apply](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/apply) to pass the `this` context object. More on `this` below. 

You may want to implement [localStorage](http://diveintohtml5.info/storage.html) on one your Models/Collections to eliminate unnecessary network requests. To achieve that, you would override the sync method like this in your model:
```javascript
var MyModel = Backbone.Model.extend({
  sync: function (method, model, options) {
    if (method === 'read') {
      if(window.localStorage.getItem('myData')) {
        return JSON.parse(window.localStorage.getItem('myData'));
      } else {
        Backbone.sync.apply(this, arguments);
      }
    } else {
      Backbone.sync.apply(this, arguments);
    }
  }
});
```
Above I simply checked if the `myData` key is stored in localStorage, and if it is, I read it from there. If not, I call the `Backbone.Sync` method, just like the default `Model.sync` implementation. This optional method implementation feature of Backbone is really powerful as it allows you to choose at what level to customize your classes.

The sync method explicitly tells the user that it can be overwritten for custom functionality, but you can also optionally override many other Backbone methods. In the Backbone documentation for the [Model.extend method](http://backbonejs.org/#Model-extend), the following example is presented for overriding the `Backbone.Model.set` method:
```javascript
var Note = Backbone.Model.extend({
  set: function (attributes, options) {
    Backbone.Model.prototype.set.apply(this, arguments);
    ...
  }
});
```
This is similar to the pattern we saw above, except we are calling the `Backbone.Model`'s set method instead of copying its functionality. You notice the `.prototype` added after the class, which refers to the inheritable methods of Backbone.Model. These prototype methods are created using Backbone's helper [extend method](http://backbonejs.org/docs/backbone.html#section-190) which makes sure that the extended class inherits properly. 

This type of override would make sense if we needed to perform some logic before updating the model via the standard `Backbone.Model`'s set method.

### Properties/Methods that should *not* be overwritten or called
In reality, every single inheritable method in Backbone.View can be overwritten and called by the user. However, some of these methods are used internally by Backbone and should not be called or overwritten so they achieve their expected functionality when used in the library. 

JavaScript doesn't provide a mechanism to hide these methods from the user with its style of inheritance, so instead a common pattern is to prefix these 'private' methods with a `_` to indicate that the user of the function shouldn't overwrite it or call it.

This is seen throughout the Backbone.js source, and [here](http://backbonejs.org/docs/backbone.html#section-132) is an example of two 'private' methods in the `Backbone.View` class:
```javascript
_configure: function(options) {
  if (this.options) options = _.extend({}, _.result(this, 'options'), options);
  _.extend(this, _.pick(options, viewOptions));
  this.options = options;
},

_ensureElement: function() {
  if (!this.el) {
    var attrs = _.extend({}, _.result(this, 'attributes'));
    if (this.id) attrs.id = _.result(this, 'id');
    if (this.className) attrs['class'] = _.result(this, 'className');
    var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
    this.setElement($el, false);
  } else {
    this.setElement(_.result(this, 'el'), false);
  }
}
```
These 'private' methods are called internally by the Backbone.View class and act as supporting methods to public methods or constructors. For example, the `_.configure()` method is called in the `Backbone.View`'s constructor to configure the view based on the options the user passes in.

## JavaScript constructors
After writing your own Backbone views, you will invoke them by writing something like this statement,
```javascript
MyViewInstance = new MyView();
```
This `new` keyword creates a new instance of `MyView` by calling its constructor. Likely while programming in Backbone, you won't define a custom constructor, as the inherited constructor performs expected logic to prepare the class. Here is the Backbone.View constructor:
```javascript
var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };
```
All this constructor does is set the `cid` instance property and invoke instance methods which set up the View.
##The `this` keyword

Understanding `this` is essential to advanced programming in Backbone.js. It refers to the object on which the current function was invoked. In a Backbone View, when you write `this.render()` inside of your `initialize` function, the `this` refers to your View because it was called via the constructor as seen in the above snippet.

One interesting use of `this` in Backbone.View is in the [delegateEvents](http://backbonejs.org/docs/backbone.html#section-130) method. The following statement binds the jQuery event handlers to the corresponding view, so that `this` refers to `MyView` instead of the DOM element which received the event:
```javascript
method = _.bind(method, this);
```
Without having the above line of code, the following `buttonClickHandler` method would refer to the DOM element with the `myButton` class that was clicked instead of `MyView` and would throw an error when `this.remove()` is called:
```javascript
var MyView = Backbone.View.extend({
  events: {
    'click .myButton': 'buttonClickHandler'
  },
  buttonClickHandler: function(event) {
    this.remove();
  }
});
```
## [underscore.js](http://underscorejs.org/)

underscore is a powerful utility which allows you to write more semantic code. When operating on arrays or objects, you can use methods like `_.first`, `_.any`, and `_.without` rather than writing your own functions. Backbone [provides underscore methods](http://backbonejs.org/docs/backbone.html#section-115) directly on the Backbone.Collection and Backbone.Model for easy access to the methods.

In addition to custom convenience methods, underscore implements cross-browser versions of newer JavaScript functions which are only available in modern browsers. Underscore will detect if the browser supports the method, and will use the native implementation if it is present.

I hope this was helpful to developers wanting to advance their JavaScript and Backbone.js knowledge! I recommend exploring these concepts by writing code snippets in a web browser JavaScript console or a node.js interpreter. Let me know if you have any questions in the comments.
