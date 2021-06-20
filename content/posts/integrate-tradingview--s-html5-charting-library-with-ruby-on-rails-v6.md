---
title: Integrate TradingView's HTML5 Charting Library with Ruby on Rails v6
date: 2020-11-23
tags: [tradingview, ruby]
---

As you probably know, the charting library is not accessible publicly. You need
to request access from them. So, I can't really give a complete repo as an
example. I did however open a PR at
https://github.com/tradingview/charting-library-examples/pull/197, but I'm not
sure if it's going to be accepted.

<!--more-->

Anyway, the given example is using asset pipeline and the modern Ruby on Rails
application is using webpacker. So after trying out a few times, I figured a
working way to load the sample chart.

It's not straight forward for me, so maybe this will help someone else in the
future. However, I'm not sure if it's the best way to load it, however, it works
😁

I'm going to assume you're using the Ruby on Rails v6.0.3.4. Once you've cloned
the library into `charting_library` directory, you can do these steps:

- Copy `charting_library/charting_library.js` into `app/javascript/packs/charting_library/charting_library.js`
- Copy `datafeeds/udf/dist/*.js` into `app/javascript/packs/datafeeds/`
- Copy `charting_library/*.html` into `public/charting_library/`
- Copy `charting_library/bundles` into `public/charting_library/bundles`

Don't worry about serving outdated files just because you put it in the public
directory as the charting library will use a new hash on the files every time
there's a new update.

Once we got the files in the correct places, we can use this code to load the
sample:

```javascript
// app/javascript/packs/application.js
require("@rails/ujs").start()
require("turbolinks").start()
require("channels")
require("packs/datafeeds/polyfills")

const Datafeeds = require("packs/datafeeds/bundle")
const TradingView = require("packs/charting_library/charting_library")

function getLanguageFromURL() {
  const regex = new RegExp('[\\?&]lang=([^&#]*)');
  const results = regex.exec(location.search);

  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function initOnReady() {
  var widget = window.tvWidget = new TradingView.widget({
    symbol: 'AAPL',
    datafeed: new Datafeeds.UDFCompatibleDatafeed('https://demo_feed.tradingview.com'),
    interval: 'D',
    container_id: 'tv_chart_container',
    library_path: '/charting_library/',

    locale: getLanguageFromURL() || 'en',
    disabled_features: ['use_localstorage_for_settings'],
    enabled_features: ['study_templates'],
    charts_storage_url: 'https://saveload.tradingview.com',
    charts_storage_api_version: '1.1',
    client_id: 'tradingview.com',
    user_id: 'public_user_id',
    fullscreen: false,
    autosize: true,
    studies_overrides: {},
  });

  widget.onChartReady(() => {
    widget.headerReady().then(() => {
      const button = widget.createButton();

      button.setAttribute('title', 'Click to show a notification popup');
      button.classList.add('apply-common-tooltip');

      button.addEventListener('click', () => widget.showNoticeDialog({
        title: 'Notification',
        body: 'TradingView Charting Library API works correctly',
        callback: () => {
          console.log('Noticed!');
        },
      }));

      button.innerHTML = 'Check API';
    });
  });
};

window.addEventListener('DOMContentLoaded', initOnReady, false);
```

The code is actually coming from the sample with slight modifications.

Create a view and put this HTML in:

```html
<div class="page-tv-chart-container" id="tv_chart_container">
</div>
```

TradingView will use that ID to load the chart.

Just start your server and that's it. You should have a working TradingView
chart by now 👍
