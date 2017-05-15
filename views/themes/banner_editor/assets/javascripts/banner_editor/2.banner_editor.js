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
        EVENT_DRAGSTART = 'dragstart.' + NAMESPACE,
        EVENT_DRAGSTOP = 'dragstop.' + NAMESPACE,
        EVENT_DRAGENTER = 'dragenter.' + NAMESPACE,
        EVENT_DROP = 'drop.' + NAMESPACE,

        CLASS_DRAGGABLE = '.qor-bannereditor__draggable',
        CLASS_BOTTOMSHEETS = '.qor-bottomsheets',
        CLASS_MEDIABOX = 'qor-bottomsheets__mediabox',
        CLASS_TOOLBAR_BUTTON = '.qor-bannereditor__button',
        CLASS_BANNEREDITOR_VALUE = '.qor-bannereditor__value',
        CLASS_BANNEREDITOR_BG = '.qor-bannereditor__bg',
        CLASS_BANNEREDITOR_IMAGE = '.qor-bannereditor__toolbar-image',
        CLASS_CANVAS = '.qor-bannereditor__canvas';

    function getImgSize(url, callback) {
        let img = new Image();

        img.onload = function() {
            if ($.isFunction(callback)) {
                callback(this.naturalWidth || this.width, this.naturalHeight || this.height);
            }
        };
        img.src = url;
    }

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
            this.$textarea = this.$element.find(CLASS_BANNEREDITOR_VALUE);
            this.config.toolbar = this.$textarea.data('configure');
            this.$canvas = this.$element.find(CLASS_CANVAS);
            this.initToolbar();
        },

        bind: function() {
            this.$element
                .on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this))
                .on(EVENT_CLICK, CLASS_BANNEREDITOR_IMAGE, this.openBottomSheets.bind(this))
                .on(EVENT_DRAGSTOP, CLASS_DRAGGABLE, this.handleDragStop.bind(this))
            // .on(EVENT_DRAGEND, CLASS_DRAGGABLE, this.handleDragEnd.bind(this))
            // .on(EVENT_DRAGENTER, CLASS_DRAGGABLE, this.handleDragEnter.bind(this))
            // .on(EVENT_DROP, CLASS_DRAGGABLE, this.handleDrop.bind(this));

            $(CLASS_DRAGGABLE).draggable();

            $(document).on(EVENT_CLICK, '.qor-bannereditor__content button[type="submit"]', this.renderElement.bind(this));
        },

        initToolbar: function() {
            let $toolbar = $(window.Mustache.render(QorBannerEditor.toolbar, this.config));

            $toolbar.appendTo($('.qor-bannereditor__toolbar-btns'));
            this.$popover = $(QorBannerEditor.popover).appendTo('body');
        },

        initMedia: function() {
            let $trs = $(CLASS_BOTTOMSHEETS).find('tbody tr'),
                $tr,
                $img;

            $trs.each(function() {
                $tr = $(this);
                $img = $tr.find('.qor-table--ml-slideout p img').first();
                $tr.find('.qor-table__actions').remove();

                if ($img.length) {
                    $tr.find('.qor-table--medialibrary-item').css('background-image', 'url(' + $img.prop('src') + ')');
                    $img.parent().remove();
                }
            });
        },

        openBottomSheets: function(e) {
            var $ele = $(e.target).closest(CLASS_BANNEREDITOR_IMAGE),
                url = $ele.data('banner-media-url');
            this.BottomSheets = $('body').data('qor.bottomsheets');

            this.BottomSheets.open({
                url: url
            }, this.handleBannerImage.bind(this));

            return false;

        },

        handleBannerImage: function() {

            var $bottomsheets = $(CLASS_BOTTOMSHEETS),
                options = {
                    onSelect: this.addBannerImage.bind(this), // render selected item after click item lists
                    onSubmit: this.addBannerImage.bind(this) // render new items after new item form submitted
                };

            $bottomsheets.qorSelectCore(options).addClass(CLASS_MEDIABOX);
            this.initMedia();
        },

        addBannerImage: function(data) {
            console.log(data);

            let MediaOption = data.MediaOption.OriginalURL ? data.MediaOption : JSON.parse(data.MediaOption),
                imgUrl = MediaOption.OriginalURL,
                bg = `<div class="${CLASS_BANNEREDITOR_BG.slice(1)}" />`,
                $bg;

            if (!this.$element.find(CLASS_BANNEREDITOR_BG).length) {
                this.$canvas.wrapInner(bg);
            }

            $bg = this.$element.find(CLASS_BANNEREDITOR_BG);

            this.resetBoxSize(imgUrl, $bg);

            $bg.css({
                'background-image': `url(${imgUrl})`,
                'background-repeat': 'no-repeat',
                'background-position': 'center center',
                'width': '100%',
                'height': '100%'
            });

            this.BottomSheets.hide();
            return false;
        },

        resetBoxSize: function(url, $bg) {
            let $canvas = this.$canvas,
                cWidth = $canvas.width(),
                iWidth, iHeight;

            getImgSize(url, function(width, height) {
                if (width < cWidth) {
                    $canvas.width(width);
                    $canvas.height(height);
                }
            });
        },

        handleDragStop: function(event, ui) {
            console.log(ui);
            console.log(this);
        },

        renderElement: function(e) {
            let $form = $(e.target).closest('form'),
                url = $form.prop('action'),
                method = $form.prop('method'),
                formData = new FormData($form[0]),
                $canvas = this.$canvas,
                $textarea = this.$textarea,
                $popover = this.$popover,
                draggableEvent = this.draggableEvent;

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

                    $(data.Template).addClass('qor-bannereditor__draggable').appendTo($canvas).draggable();
                    $textarea.val($canvas.html());
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

    QorBannerEditor.toolbar = `[[#toolbar]]<button class="mdl-button mdl-button--colored mdl-js-button qor-bannereditor__button" data-banner-url="[[CreateUrl]]" data-title="[[Name]]" type="button">[[Name]]</button>[[/toolbar]]`;

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
