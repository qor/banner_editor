(function(factory) {
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
})(function($) {

    'use strict';

    let NAMESPACE = 'qor.bannereditor',
        EVENT_ENABLE = 'enable.' + NAMESPACE,
        EVENT_DISABLE = 'disable.' + NAMESPACE,
        EVENT_CLICK = 'click.' + NAMESPACE,
        CLASS_TOOLBAR_BUTTON = '.qor-bannereditor__toolbar button[data-banner-type]',
        CLASS_IMAGE = '.qor-bannereditor__image',
        CLASS_LINK = '.qor-bannereditor__link',
        CLASS_BUTTON = '.qor-bannereditor__button',
        CLASS_TITLE = '.qor-bannereditor__title',
        CLASS_PARAGRAPH = '.qor-bannereditor__paragraph',
        CLASS_CANVAS = '.qor-bannereditor__canvas';

    function QorBannerEditor(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, QorBannerEditor.DEFAULTS, $.isPlainObject(options) && options);
        this.init();
    }

    QorBannerEditor.prototype = {
        constructor: QorBannerEditor,

        init: function() {
            this.bind();
            this.$canvas = this.$element.find(CLASS_CANVAS);
        },

        bind: function() {
            this.$element.on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addResource.bind(this));
        },

        addResource: function(e) {
            let $target = $(e.target),
                bannerType = $target.data('banner-type');

            console.log(bannerType);

            switch (bannerType) {
                case 'title':
                    this.$canvas.append(QorBannerEditor.template.TITLE);

                    break;
                default:

            }
        }
    };

    QorBannerEditor.template = {
        TITLE: '<h1>This is title</h1>',
        PARAGRAPH: '<p>This is paragraph</p>',
        LINK: '<a href="#">This is link</a>',
        BUTTON: '<button type="button">This is button</button>'
    };

    QorBannerEditor.plugin = function(options) {
        return this.each(function() {
            let $this = $(this),
                data = $this.data(NAMESPACE),
                fn;

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


    $(function() {
        let selector = '[data-toggle="qor.bannereditor"]';

        $(document).
        on(EVENT_DISABLE, function(e) {
            QorBannerEditor.plugin.call($(selector, e.target), 'destroy');
        }).
        on(EVENT_ENABLE, function(e) {
            QorBannerEditor.plugin.call($(selector, e.target));
        }).
        triggerHandler(EVENT_ENABLE);
    });

    return QorBannerEditor;
});
