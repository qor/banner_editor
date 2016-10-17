(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var NAMESPACE = 'qor.bannereditor';
  var EVENT_ENABLE = 'enable.' + NAMESPACE;
  var EVENT_DISABLE = 'disable.' + NAMESPACE;
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var UPLOAD_BACKGROUND_BUTTON = '.qor-bannereditor__upload';

  function QorBannerEditor(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, QorBannerEditor.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  QorBannerEditor.prototype = {
    constructor: QorBannerEditor,

    init: function () {
      this.bind();
      this.initStatus();
    },

    bind: function () {
      this.$element.on(EVENT_CLICK, UPLOAD_BACKGROUND_BUTTON, this.openBottomSheet.bind(this));
    },

    initStatus: function() {
      $(".qor-bannereditor__content").each(function(i, e) {
        var configure = $(e).data("configure");
        $(e).vee({
          width: configure.width,
          height: configure.height,
          fixed: configure.fixed,
          datas : configure.elements
        });
      });
    },

    openBottomSheet: function (e) {
      var $this = this;
      var BottomSheets = $('body').data('qor.bottomsheets');
      BottomSheets.open({ url: "/admin/product_images" }, function() {
        var $bottomsheets = $('.qor-bottomsheets'),
        options = {
          formatOnSelect: $this.formatSelectResults.bind(e.target),  // render selected item after click item lists
          formatOnSubmit: function() {}   // render new items after new item form submitted
        };
        $bottomsheets.qorSelectCore(options).addClass('qor-bottomsheets__mediabox').find('.qor-button--new').data('ingore-submit', true);
      });
    },

    formatSelectResults: function (e, data) {
      var BottomSheets = $('body').data('qor.bottomsheets');
      $(this).parents(".qor-bannereditor__wrap").find(".veeContentWrap").css("background-image", "url(" + $(data.Image).attr("src") + ")");
      BottomSheets.hide();
    }
  };

  QorBannerEditor.plugin = function (options) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var fn;

      if (!data) {
        if (/destroy/.test(options)) {
          return;
        }
        $this.data(NAMESPACE, (data = new QorBannerEditor(this, options)));
      }

      if (typeof options === 'string' && $.isFunction(fn = data[options])) {
        fn.apply(data);
      }
    });
  };


  $(function () {
    var selector = '[data-toggle="qor.bannereditor"]';
    $(document).
      on(EVENT_DISABLE, function (e) {
        QorBannerEditor.plugin.call($(selector, e.target), 'destroy');
      }).
      on(EVENT_ENABLE, function (e) {
        QorBannerEditor.plugin.call($(selector, e.target));
      }).
      triggerHandler(EVENT_ENABLE);
  });

  return QorBannerEditor;
});
