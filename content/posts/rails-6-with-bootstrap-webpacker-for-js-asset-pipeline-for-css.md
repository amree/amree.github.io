---
title: Rails 6 with Bootstrap (Webpacker for JS, Asset Pipeline for CSS)
date: 2020-02-02
tags: [ruby, css, js]
---

I haven't really worked on Rails for a while so I decided to take a sneak peek
on what's going in Ruby on Rails land.

The first thing I want to try is to integrate Rails with Bootstrap. It seems
like a lot of tutorials are focusing on how to use webpack for CSS and JS.

<!--more-->

But for this article, I'm going to try Bootstrap's integration with Rails with
the asset pipeline for the CSS and webpack for the JavaScript. A snippet from
webpacker's README:

> Webpacker makes it easy to use the JavaScript pre-processor and bundler
webpack 4.x.x+ to manage application-like JavaScript in Rails. It coexists with
the asset pipeline, as the primary purpose for webpack is app-like JavaScript,
not images, CSS, or even JavaScript Sprinkles (that all continues to live in
app/assets).

> However, it is possible to use Webpacker for CSS, images and fonts assets as
well, in which case you may not even need the asset pipeline. This is mostly
relevant when exclusively using component-based JavaScript frameworks.

Let's start by creating new rails app first:

```bash
rails new random_app
```

Make sure we can see the welcome page first

```bash
rails db:prepare
rails s
```

Open [https://localhost:3000](https://localhost:3000) and verify that you can
see the Rails famous welcome page.

Add bootstrap package and its dependencies:

```
yarn add bootstrap jquery popper.js
```

From the [Bootstrap's documentation](https://getbootstrap.com/docs/4.4/getting-started/javascript/#dependencies)

> Also note that all plugins depend on jQuery (this means jQuery must be
included before the plugin files). Consult our package.json to see which
versions of jQuery are supported. Our dropdowns, popovers and tooltips also
depend on Popper.js.

Alright, we have all of the required packages installed so the next step would
be loading them.

But before we do that, we need to have a page that will confirm all the setup is
correct once we've done with all of these.

Create a controller with a view:

```bash
rails g controller Home index
```

Let's put some Bootstrap's related code in there so that we can test the
JavaScript and CSS is actually working.

```html
# app/views/home/index.html.erb
<h1>Home#index</h1>
<p>Find me in app/views/home/index.html.erb</p>

<button type="button" class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="Tooltip on top">
Tooltip on top
</button>
```

It doesn't work right now but making it works will be our target.

Next, we'll take a look at `app/assets/stylesheets/application.css`:

```css
/*
 * ...
 *
 *= require_tree .
 *= require_self
 */

 ```

 `require_tree` means it'll load everything insider `app/assets/stylesheets` and
 it sub directories as well. `require_self` will load anything we defined in
 `application.scss` at the bottom of the output file (as it's declared in the
 last line).

 From [Ruby on Rails Guides](https://guides.rubyonrails.org/asset_pipeline.html#manifest-files-and-directives)

 > In this example, require_self is used. This puts the CSS contained within the
 file (if any) at the precise location of the require_self call.


> If you want to use multiple Sass files, you should generally use the Sass
@import rule instead of these Sprockets directives. When using Sprockets
directives, Sass files exist within their own scope, making variables or mixins
only available within the document they were defined in.

Depending on what you (or your team) are comfortable with, but I prefer to
explicitly specify my files.

So, I'll change `application.css` to a SCSS file so that I can use `@import`
directive:

```bash
mv app/assets/stylesheets/application.css app/assets/stylesheets/application.scss
```

Change the content to:

```scss
@import 'bootstrap';
```

Create a new file at `app/assets/stylesheets/bootstrap.scss` and update the file
with:

```scss
@import 'bootstrap/scss/bootstrap';

```

Reload our `Home#index` and you'll see that Bootstrap's styles have been loaded
correctly. However, the tooltip is not working yet. That's the JavaScript part.

Optional: You might be wondering why I didn't just do `@import` in the
`application.scss` itself. Well, the main reason is that I want to customize
which part of Bootstrap I want to use. This will help in terms of file size
later. But current code will still load everything, so, let's change it to:

```scss
// Required
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

// Optional
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';
@import 'bootstrap/scss/type';
@import 'bootstrap/scss/images';
@import 'bootstrap/scss/code';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/tables';
@import 'bootstrap/scss/forms';
@import 'bootstrap/scss/buttons';
@import 'bootstrap/scss/transitions';
@import 'bootstrap/scss/dropdown';
@import 'bootstrap/scss/button-group';
@import 'bootstrap/scss/input-group';
@import 'bootstrap/scss/custom-forms';
@import 'bootstrap/scss/nav';
@import 'bootstrap/scss/navbar';
@import 'bootstrap/scss/card';
@import 'bootstrap/scss/breadcrumb';
@import 'bootstrap/scss/pagination';
@import 'bootstrap/scss/badge';
@import 'bootstrap/scss/jumbotron';
@import 'bootstrap/scss/alert';
@import 'bootstrap/scss/progress';
@import 'bootstrap/scss/media';
@import 'bootstrap/scss/list-group';
@import 'bootstrap/scss/close';
@import 'bootstrap/scss/toasts';
@import 'bootstrap/scss/modal';
@import 'bootstrap/scss/tooltip';
@import 'bootstrap/scss/popover';
@import 'bootstrap/scss/carousel';
@import 'bootstrap/scss/spinners';
@import 'bootstrap/scss/utilities';
@import 'bootstrap/scss/print';
```

This is based on what we have in the original
[bootstrap.scss](https://github.com/twbs/bootstrap/blob/v4.4.1/scss/bootstrap.scss).
One of the downside with this approach is that you need to check if this file
changed whenever you upgrade Bootstrap as it's like using a private method 😁

Our Bootstrap's stylesheet is working as expected so the next step would be
getting the JavaScript to work and for this tutorial, we're going to focus on
the tooltip part.

Let's import Bootstrap's JS files:

```javascript
// app/javascript/packs/application.js

import "bootstrap"
```

We'll initialize tooltip by adding these code at the end of the file:

```javascript
$(function () {
$('[data-toggle="tooltip"]').tooltip()
})
```

In our intialization, we're using `$` for `jQuery` so we need to make it
available globally. We can use these to automatically load the modules instead
of `import` or `require` them:

```javascript
// config/webpack/environment.js
const { environment } = require('@rails/webpacker')
const webpack = require('webpack')

environment.plugins.append('Provide', new webpack.ProvidePlugin({
$: 'jquery',
}))

module.exports = environment
```

Refresh your `Home#index` and you should be able to see the tooltip when you
hover on the button.

Optional: If you want to specify which JS component that you want to load, you
can use these steps:

```javascript
// app/javascript/packs/application.js

require("./bootstrap")

```

and

```javascript
// app/javascript/packs/bootstrap/index.js
import "bootstrap/js/src/alert"
import "bootstrap/js/src/button"
import "bootstrap/js/src/carousel"
import "bootstrap/js/src/collapse"
import "bootstrap/js/src/dropdown"
import "bootstrap/js/src/modal"
import "bootstrap/js/src/popover"
import "bootstrap/js/src/scrollspy"
import "bootstrap/js/src/tab"
import "bootstrap/js/src/toast"
import "bootstrap/js/src/tooltip"

// Tooltip/Other components initialization here
```

And for our tutorial, we just use the last line which is `tooltip` and comment
out everything else. It'll reduce the size of the final JS (not much different
though).

💡 Tip: You can inspect your bundle size by running this command and then upload
the output to [Webpack
Visualizer](https://chrisbateman.github.io/webpack-visualizer/)

```
./bin/webpack --profile --json > webpack-stats.json
```

💡 Tip: You'll notice that your JS will only compile the new changes when you
refresh the page and that might cause some delay. If we want webpack to compile
immediately when we made some changes, we can run this command to monitor the
changes and compile them:

```
./bin/webpack-dev-server
```

💡 Tip: You can override Bootstrap's default value or in other word, you can
create your own theme by specifying the variable value before you import
Bootstrap's files. So, it can be something similar to this:

```scss
$primary: green;
$secondary: pink;

@import "bootstrap";
```

Checkout this [variables list](https://github.com/twbs/bootstrap/blob/master/scss/_variables.scss) and
you can find more info at [Bootstrap's Documentation](https://getbootstrap.com/docs/4.1/getting-started/theming/#theme-colors).
There're lots more that you can actually do.
