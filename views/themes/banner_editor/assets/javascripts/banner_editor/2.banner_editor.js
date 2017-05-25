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
        EVENT_DBCLICK = 'dblclick.' + NAMESPACE,
        EVENT_DRAGSTOP = 'dragstop.' + NAMESPACE,
        EVENT_RESIZESTOP = 'resizestop.' + NAMESPACE,
        EVENT_DRAG = 'drag.' + NAMESPACE,
        CLASS_DRAGGABLE = '.qor-bannereditor__draggable',
        CLASS_BOTTOMSHEETS = '.qor-bottomsheets',
        CLASS_MEDIABOX = 'qor-bottomsheets__mediabox',
        CLASS_TOOLBAR_BUTTON = '.qor-bannereditor__button',
        CLASS_BANNEREDITOR_VALUE = '.qor-bannereditor__value',
        CLASS_BANNEREDITOR_BG = '.qor-bannereditor__bg',
        CLASS_BANNEREDITOR_IMAGE = '.qor-bannereditor__toolbar-image',
        CLASS_BANNEREDITOR_DRAGGING = 'qor-bannereditor__dragging',
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
            let $element = this.$element,
                $textarea = $element.find(CLASS_BANNEREDITOR_VALUE),
                config = {},
                _this = this,
                $canvas = $element.find(CLASS_CANVAS),
                html = $canvas.clone(),
                $iframe = $('<iframe id="qor-bannereditor__iframe" width="100%" height="300px" />'),
                configure = $textarea.data('configure');

            config.toolbar = configure.Elements;
            config.editURL = configure.EditUrl;

            this.config = config;
            this.$textarea = $textarea;

            $canvas.html('').removeClass('qor-bannereditor__canvas');
            $iframe.appendTo($canvas);

            this.$iframe = $iframe;

            $iframe.on('load', function() {
                let $ele = $iframe.contents();

                $ele.find('head').append(`<link rel="stylesheet" type="text/css" href="${$element.data('stylesheet')}">`);
                $ele.find('body').html(html);
                _this.$bg = $ele.find(CLASS_BANNEREDITOR_BG);
                _this.$canvas = $ele.find(CLASS_CANVAS);

                _this.initBannerEditor();
                _this.bind();

            });

        },

        bind: function() {
            let $canvas = this.$canvas;

            this.$element
                .on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this))
                .on(EVENT_CLICK, CLASS_BANNEREDITOR_IMAGE, this.openBottomSheets.bind(this));

            $canvas
                .on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this))
                .on(EVENT_CLICK, CLASS_BANNEREDITOR_IMAGE, this.openBottomSheets.bind(this))
                .on(EVENT_CLICK, CLASS_DRAGGABLE, this.handleInlineEdit.bind(this))
                .on(EVENT_DBCLICK, CLASS_DRAGGABLE, this.showInlineEdit.bind(this))
                .on(EVENT_CLICK, '.qor-bannereditor__button-inline button', this.showEdit.bind(this))
                .on(EVENT_DRAGSTOP, CLASS_DRAGGABLE, this.handleDragStop.bind(this))
                .on(EVENT_RESIZESTOP, CLASS_DRAGGABLE, this.handleResizeStop.bind(this))
                .on(EVENT_DRAG, CLASS_DRAGGABLE, this.handleDrag.bind(this));

            $canvas
                .find(CLASS_DRAGGABLE).draggable({
                    addClasses: false,
                    distance: 10
                })
                .resizable({
                    handles: "e"
                });

            $(document)
                .on(EVENT_CLICK, '.qor-bannereditor__content button[type="submit"]', this.renderElement.bind(this))
                .on(EVENT_CLICK, this.hideElement.bind(this));
        },

        initBannerEditor: function() {
            let $toolbar = $(window.Mustache.render(QorBannerEditor.toolbar, this.config)),
                $bg = this.$bg;

            $toolbar.appendTo($('.qor-bannereditor__toolbar-btns'));
            this.$popover = $(QorBannerEditor.popover).appendTo('body');

            if ($('.qor-slideout').is(':visible')){
                $('.qor-slideout__fullscreen').click();
            }

            if ($bg.length && $bg.data('image-width')) {
                this.$canvas.width($bg.data('image-width')).height($bg.data('image-height'));
                this.$iframe.width($bg.data('image-width')).height($bg.data('image-height'));
            }

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

        hideElement: function(e) {
            let $canvas = this.$canvas;

            if (!$(e.target).closest('.qor-bannereditor__contents').length) {
                $canvas.find('.qor-bannereditor__button-inline,.qor-bannereditor__draggable-coordinate').remove();
                $canvas.find(CLASS_DRAGGABLE).removeClass('qor-bannereditor__dragging');
            }
        },

        openBottomSheets: function(e) {
            var $ele = $(e.target).closest(CLASS_BANNEREDITOR_IMAGE),
                url = $ele.data('banner-media-url');
            this.BottomSheets = $('body').data('qor.bottomsheets');

            this.BottomSheets.open({
                url: url,
                ingoreSubmit: true
            }, this.handleBannerImage.bind(this));

            return false;

        },

        handleBannerImage: function() {

            var $bottomsheets = $(CLASS_BOTTOMSHEETS),
                options = {
                    onSelect: this.addBannerImage.bind(this),
                    onSubmit: this.addBannerImage.bind(this)
                };

            $bottomsheets.qorSelectCore(options).addClass(CLASS_MEDIABOX);
            this.initMedia();
        },

        addBannerImage: function(data) {
            let MediaOption = data.MediaOption.OriginalURL ? data.MediaOption : JSON.parse(data.MediaOption),
                imgUrl = MediaOption.OriginalURL,
                bg = `<div class="${CLASS_BANNEREDITOR_BG.slice(1)}" />`,
                $bg = this.$bg;

            if (!$bg.length) {
                this.$canvas.wrapInner(bg);
                this.$bg = $bg = this.$canvas.find(CLASS_BANNEREDITOR_BG);
            }

            this.resetBoxSize(imgUrl, $bg);

            $bg.css({
                'background-image': `url(${imgUrl})`,
                'background-repeat': 'no-repeat',
                'background-position': 'center center',
                'width': '100%',
                'height': '100%'
            });

            this.BottomSheets.hide();
            this.setValue();
            return false;
        },

        resetBoxSize: function(url, $bg) {
            let $canvas = this.$canvas,
                $iframe = this.$iframe,
                _this = this;

            getImgSize(url, function(width, height) {
                $canvas.width(width).height(height);
                $iframe.width(width).height(height);
                $bg.attr({
                    'data-image-width': width,
                    'data-image-height': height
                });
                _this.setValue();
            });
        },

        handleInlineEdit: function(e) {
            let $target = $(e.target).closest(CLASS_DRAGGABLE),
                $canvas = this.$canvas;

            $canvas.find('.qor-bannereditor__button-inline').remove();
            $canvas.find(CLASS_DRAGGABLE).removeClass(CLASS_BANNEREDITOR_DRAGGING);
            $target.addClass(CLASS_BANNEREDITOR_DRAGGING).append(QorBannerEditor.inlineEdit);

            return false;
        },

        ajaxForm: function(url, title) {
            let $popover = this.$popover;

            $.ajax(url, {
                method: 'GET',
                dataType: 'html',
                success: function(html) {
                    let $content = $(html).find('.qor-form-container'),
                        popupTitle = title || $(html).find('.mdl-layout-title').html();

                    $content.find('.qor-button--cancel').attr('data-dismiss', 'modal').removeAttr('href');
                    $popover.find('.qor-bannereditor__title').html(popupTitle);
                    $popover.find('.qor-bannereditor__content').html($content.html());
                    $popover.trigger('enable').qorModal('show');
                }
            });
        },

        showEdit: function(e) {
            let $target = $(e.target).closest('button'),
                type = $target.data('edit-type'),
                $element = $target.closest(CLASS_DRAGGABLE),
                data = $element.data();

            if (type == 'edit') {
                this.showEditForm(data, $element);
            }

            if (type == 'delete') {
                this.deleteElement($element);
            }

            e.stopPropagation();
            return false;
        },

        showInlineEdit: function(e){
            let $ele = $(e.target).closest(CLASS_DRAGGABLE);

            this.showEditForm($ele.data(), $ele);
        },

        showEditForm: function(data, $element) {
            let url = this.config.editURL.replace(/:id/, data.editId);

            this.$editElement = $element;
            this.ajaxForm(url, null, true, $element);
        },

        deleteElement: function($element) {
            $element.remove();
            this.setValue();
        },

        handleDrag: function(event, ui) {
            ui.position.left = parseInt(ui.position.left, 10);
            ui.position.top = parseInt(ui.position.top, 10);

            this.$canvas.find('.qor-bannereditor__draggable-coordinate').remove();
            ui.helper.addClass(CLASS_BANNEREDITOR_DRAGGING).append(window.Mustache.render(QorBannerEditor.dragCoordinate, ui.position));
            ui.helper.find('.qor-bannereditor__button-inline').hide();
        },

        handleDragStop: function(event, ui) {
            let cWidth = this.$canvas.width(),
                cHeight = this.$canvas.height(),
                helperLeft = ui.position.left / cWidth * 100 + '%',
                helperTop = ui.position.top / cHeight * 100 + '%',
                helper = ui.helper,
                css = {
                    'left': helperLeft,
                    'top': helperTop
                };

            helper.css(css).attr({
                'data-position-left': helperLeft,
                'data-position-top': helperTop
            });

            if (!helper.find('.qor-bannereditor__button-inline').length) {
                helper.removeClass(CLASS_BANNEREDITOR_DRAGGING);
            }

            ui.helper.find('.qor-bannereditor__button-inline').show();
            ui.helper.find('.qor-bannereditor__draggable-coordinate').remove();

            this.setValue();
        },

        handleResizeStop: function(event, ui){
            let cWidth = this.$canvas.width(),
                helperWidth = ui.size.width / cWidth * 100 + '%';

            ui.helper.css('width', helperWidth);
        },

        renderElement: function(e) {
            let $form = $(e.target).closest('form'),
                url = $form.prop('action'),
                method = $form.prop('method'),
                _this = this,
                formData = new FormData($form[0]),
                $canvas = this.$canvas,
                $bg = this.$bg,
                $body = $bg.length ? $bg : $canvas,
                $textarea = this.$textarea,
                $popover = this.$popover,
                $editElement = this.$editElement;

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


                    if (!data.Template){
                        return;
                    }

                    let $ele = $(`<span class="${CLASS_DRAGGABLE.slice(1)}">${data.Template}</span>`);

                    if ($editElement && $editElement.length) {
                        let left = $editElement[0].style.left,
                            top = $editElement[0].style.top,
                            attrs = $editElement.prop("attributes");

                        $ele.css({
                                'position': 'absolute',
                                'left': left,
                                'top': top
                            })
                            .attr('data-edit-id', data.ID);

                        $.each(attrs, function() {
                            let name = this.name;

                            if (name == 'style' || name == 'class' || name == 'data-edit-id') {
                                return;
                            }

                            $ele.attr(this.name, this.value);

                        });

                        $ele.appendTo($body)
                            .draggable({
                                addClasses: false,
                                distance: 10
                            })
                            .resizable({
                                handles: "e"
                            });

                        $textarea.val($canvas.html());
                        $popover.qorModal('hide');

                        $editElement.remove();
                        _this.$editElement = null;


                    } else {
                        $ele.css({
                                'position': 'absolute',
                                'left': '10%',
                                'top': '10%'
                            })
                            .attr('data-edit-id', data.ID)
                            .appendTo($body)
                            .draggable({
                                addClasses: false,
                                distance: 10
                            })
                            .resizable({
                                handles: "e"
                            });
                        $textarea.val($canvas.html());
                        $popover.qorModal('hide');

                    }

                    _this.setValue();

                }
            });

            return false;
        },

        addElements: function(e) {
            let $target = $(e.target),
                url = $target.data('banner-url'),
                title = $target.data('title');

            this.ajaxForm(url, title);
        },

        setValue: function() {
            let $html = this.$canvas.clone();
            $html.find(CLASS_DRAGGABLE).removeClass('ui-draggable-handle ui-resizable');
            $html.find('.qor-bannereditor__button-inline,.ui-resizable-handle,.qor-bannereditor__draggable-coordinate').remove();
            this.$textarea.val($html.html().replace(/&quot;/g,''));
        }
    };

    QorBannerEditor.toolbar = `[[#toolbar]]<button class="mdl-button mdl-button--colored mdl-js-button qor-bannereditor__button" data-banner-url="[[CreateUrl]]" data-title="[[Name]]" type="button">[[Name]]</button>[[/toolbar]]`;

    QorBannerEditor.dragCoordinate = `<div class="qor-bannereditor__draggable-coordinate"><span>x :<em>[[left]]</em></span><span>y :<em>[[top]]</em></span></div>`;

    QorBannerEditor.inlineEdit = `<div class="qor-bannereditor__button-inline">
                                    <button class="mdl-button mdl-button--icon qor-bannereditor__button-edit" data-edit-type="edit" type="button"><i class="material-icons">mode_edit</i></button>
                                    <button class="mdl-button mdl-button--icon qor-bannereditor__button-delete" data-edit-type="delete" type="button"><i class="material-icons">delete_forever</i></button>
                                  </div>`;

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
