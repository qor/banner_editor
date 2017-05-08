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
        CLASS_TOOLBAR_BUTTON = '.qor-bannereditor__button',
        CLASS_BANNEREDITOR_VALUE = '.qor-bannereditor__value',
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
            this.config = {};
            this.config.toolbar = this.$element.find(CLASS_BANNEREDITOR_VALUE).data('configure');
            this.$canvas = this.$element.find(CLASS_CANVAS);
            this.initToolbar();
        },

        bind: function() {
            this.$element.on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this));
            $(document).on(EVENT_CLICK, '.qor-bannereditor__content button[type="submit"]', this.renderElement.bind(this));
        },

        initToolbar: function() {
            let $toolbar = $(window.Mustache.render(QorBannerEditor.toolbar, this.config));

            $toolbar.appendTo($('.qor-bannereditor__toolbar'));
            this.$popover = $(QorBannerEditor.popover).appendTo('body');
        },

        renderElement: function(e) {
            let $form = $(e.target).closest('form'),
                url = $form.prop('action'),
                method = $form.prop('method'),
                formData = new FormData($form[0]),
                $canvas = this.$canvas,
                $popover = this.$popover;

            if (!$form.length) {
                return;
            }

            $.ajax(url, {
                method: method,
                dataType: 'json',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data) {
                    // console.log(data);

                    $canvas.append(data.Template);
                    $popover.qorModal('hide');
                }
            });

            return false;
        },

        addElements: function(e) {
            let $target = $(e.target),
                url = $target.data('banner-url'),
                title = $target.data('title'),
                $popover = this.$popover;


            $.ajax(url, {
                method: 'GET',
                dataType: 'html',
                success: function(html) {
                    let $content = $(html).find('.qor-form-container');

                    $content.find('.qor-button--cancel').attr('data-dismiss', 'modal').removeAttr('href');
                    $popover.find('.qor-bannereditor__title').html(title);
                    $popover.find('.qor-bannereditor__content').html($content.html());

                    $popover.trigger('enable').qorModal('show');
                }
            });

        }
    };

    QorBannerEditor.toolbar = `[[#toolbar]]<li><button class="qor-bannereditor__button" data-banner-url="[[CreateUrl]]" data-title="[[Name]]" type="button">[[Name]]</button></li>[[/toolbar]]`;

    QorBannerEditor.popover = `<div class="qor-modal fade qor-bannereditor__form" tabindex="-1" role="dialog" aria-hidden="true">
                                  <div class="mdl-card mdl-shadow--2dp" role="document">
                                    <div class="mdl-card__title">
                                        <h2 class="mdl-card__title-text qor-bannereditor__title"></h2>
                                    </div>
                                    <div class="mdl-card__supporting-text qor-bannereditor__content"></div>
                                  </div>
                                </div>`;


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
