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
        EVENT_CHANGE = 'change.' + NAMESPACE,
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
        CLASS_BANNEREDITOR_CONTENT = '.qor-bannereditor__contents',
        CLASS_CANVAS = '.qor-bannereditor__canvas',
        CLASS_DEVICE_TRIGGER = '.qor-bannereditor__device-trigger',
        CLASS_DEVICE_SELECTOR = '.qor-bannereditor__device',
        CLASS_DEVICE_TOOLBAR = '.qor-bannereditor__device-toolbar',
        CLASS_DEVICE_MODE = 'qor-bannereditor__device-mode',
        CLASS_TOP = 'qor-bannereditor__draggable-top',
        CLASS_LEFT = 'qor-bannereditor__draggable-left',
        CLASS_NEED_REMOVE = '.qor-bannereditor__button-inline,.ui-resizable-handle,.qor-bannereditor__draggable-coordinate,.ui-draggable-handle,.ui-resizable';

    function getImgSize(url, callback) {
        let img = new Image();

        img.onload = function() {
            if ($.isFunction(callback)) {
                callback(this.naturalWidth || this.width, this.naturalHeight || this.height);
            }
        };
        img.src = url;
    }

    function getDeviceSize(size, sym) {
        let arr = size.split(sym || 'x');
        return {
            width: parseInt(arr[0]),
            height: parseInt(arr[1])
        };
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
                html = $(`<div class="qor-bannereditor__canvas">${$textarea.val()}</div>`),
                $iframe = $('<iframe id="qor-bannereditor__iframe" width="100%" height="300px" />'),
                configure = $textarea.data('configure'),
                bannerSizes = configure.BannerSizes;

            config.toolbar = configure.Elements;
            config.editURL = configure.EditURL;
            config.externalStylePath = configure.ExternalStylePath;

            $canvas.hide();

            this.config = config;
            this.$textarea = $textarea;

            if (bannerSizes && bannerSizes.Laptop) {
                this.initWidth = bannerSizes.Laptop.Width;
                this.initHeight = bannerSizes.Laptop.Height;

                $element
                    .find('.qor-bannereditor__toolbar--size')
                    .show()
                    .find('span')
                    .html(`${this.initWidth}px X ${this.initHeight}px`);
            }

            $canvas.html($iframe).removeClass('qor-bannereditor__canvas');

            this.$iframe = $iframe;

            if ($('.qor-slideout').is(':visible')) {
                // for sliderout
                $iframe.ready(function() {
                    _this.initIframe(html);
                });
            } else {
                // for single page
                $iframe.on('load', function() {
                    _this.initIframe(html);
                });
            }
        },

        initIframe: function(html) {
            let $ele = this.$iframe.contents(),
                $head = $ele.find('head'),
                externalStylePath = this.config.externalStylePath,
                defaultCSS = this.$element.data('stylesheet'),
                linkTemplate = function(url) {
                    return `<link rel="stylesheet" type="text/css" href="${url}">`;
                };

            $head.append(linkTemplate(defaultCSS));

            // load banner editor external style
            if (externalStylePath && externalStylePath.length > 0) {
                for (let i = externalStylePath.length - 1; i >= 0; i--) {
                    $head.append(linkTemplate(externalStylePath[i]));
                }
            }

            $ele.find('body').html(html);
            this.$bg = $ele.find(CLASS_BANNEREDITOR_BG);
            this.$canvas = $ele.find(CLASS_CANVAS);
            this.initBannerEditor();
            this.bind();
        },

        bind: function() {
            let $canvas = this.$canvas;

            this.$element
                .on(EVENT_CLICK, CLASS_TOOLBAR_BUTTON, this.addElements.bind(this))
                .on(EVENT_CLICK, CLASS_BANNEREDITOR_IMAGE, this.openBottomSheets.bind(this))
                .on(EVENT_CLICK, CLASS_DEVICE_TRIGGER, this.toggleDevice.bind(this))
                .on(EVENT_CHANGE, CLASS_DEVICE_SELECTOR, this.switchDevice.bind(this));

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
                .find(CLASS_DRAGGABLE)
                .draggable(this.options.draggable)
                .resizable(this.options.resizable);

            $(document).on(EVENT_CLICK, this.hideElement.bind(this));
        },

        unbind: function() {
            let $canvas = this.$canvas;
            this.$element.off(EVENT_CLICK).off(EVENT_CHANGE);
            $canvas
                .off(EVENT_CLICK)
                .off(EVENT_DBCLICK)
                .off(EVENT_DRAGSTOP)
                .off(EVENT_RESIZESTOP)
                .off(EVENT_DRAG);
            $canvas
                .find(CLASS_DRAGGABLE)
                .draggable('destroy')
                .resizable('destroy');
            $(document).off(EVENT_CLICK);
        },

        toggleDevice: function() {
            let $element = this.$element,
                defaultValue = $element.find(CLASS_DEVICE_SELECTOR).val();

            if ($element.hasClass(CLASS_DEVICE_MODE)) {
                this.resetDevice();
            }

            this.$canvas.toggleClass(CLASS_DEVICE_MODE);
            $element
                .toggleClass(CLASS_DEVICE_MODE)
                .find(CLASS_DEVICE_TOOLBAR)
                .toggle();
            this.resetBannerEditorSize(defaultValue);
        },

        resetDevice: function() {
            let initWidth = this.initWidth || this.bannerWidth || 'auto',
                initHeight = this.initHeight || this.bannerHeight || 300;

            this.$element.find(CLASS_BANNEREDITOR_CONTENT).css('width', 'auto');
            this.$iframe.css({
                width: '100%',
                height: initHeight
            });
            this.$canvas.css({
                width: initWidth,
                height: initHeight
            });
        },

        switchDevice: function(e) {
            this.resetBannerEditorSize($(e.target).val());
        },

        resetBannerEditorSize: function(size) {
            let $element = this.$element,
                deviceSize = getDeviceSize(size),
                deviceWidth = deviceSize.width,
                deviceHeight = deviceSize.height;

            if (!$element.hasClass(CLASS_DEVICE_MODE)) {
                return;
            }

            this.$iframe.css({
                width: deviceWidth,
                height: deviceHeight
            });
            this.$canvas.css({
                width: deviceWidth,
                height: deviceHeight
            });

            $element.find(CLASS_BANNEREDITOR_CONTENT).width(deviceWidth);
            $element.find(CLASS_DEVICE_TOOLBAR).width(deviceWidth);
        },

        showCoordinate: function() {
            let $target = this.$canvas.find('.qor-bannereditor__dragging'),
                position = {};

            (position.left = parseInt($target.attr('data-position-left'), 10)), (position.top = parseInt($target.attr('data-position-top'), 10));

            this.$canvas.find('.qor-bannereditor__draggable-coordinate').remove();
            $target.append(window.Mustache.render(QorBannerEditor.dragCoordinate, position));
            $target.find('.qor-bannereditor__button-inline').hide();
            this.setValue();
        },

        initBannerEditor: function() {
            let $toolbar,
                $bg = this.$bg,
                $element = this.$element,
                $canvas = this.$canvas,
                $iframe = this.$iframe,
                initWidth = this.initWidth,
                initHeight = this.initHeight,
                $buttons = $element.find('.qor-bannereditor__toolbar--ml, .qor-bannereditor__toolbar--rdm'),
                isInBottomsheet = $element.closest('.qor-bottomsheets').length,
                isInSlideout = $('.qor-slideout').is(':visible'),
                hasFullClass = $('.qor-slideout').hasClass('qor-slideout__fullscreen'),
                randomString = (Math.random() + 1).toString(36).substring(7);

            this.config.toolbar.forEach(function(obj) {
                obj.id = `${obj.Name.toLowerCase().replace(/\s/g, '-')}-${randomString}`;
            });
            $toolbar = $(window.Mustache.render(QorBannerEditor.toolbar, this.config));
            $toolbar.appendTo($element.find('.qor-bannereditor__toolbar-btns'));
            this.$popover = $(QorBannerEditor.popover).appendTo('body');

            $element.closest('.qor-fieldset').addClass('qor-fieldset-bannereditor');

            $buttons.each(function(index) {
                let $innerButtons = $(this).find(' > button'),
                    $innerTip = $(this).find('.mdl-tooltip'),
                    $all = $(this).find(' > button, .mdl-tooltip');

                $all.removeAttr('data-upgraded');
                $innerButtons.attr('id', `add-${index}-${randomString}`);
                $innerTip.attr('data-mdl-for', `add-${index}-${randomString}`);
            });

            $element.find('.qor-bannereditor__toolbar').trigger('enable');

            if (isInSlideout && !isInBottomsheet && !hasFullClass) {
                $('.qor-slideout__fullscreen').click();
            }

            if (isInBottomsheet) {
                $element.closest('.qor-bottomsheets').addClass('qor-bottomsheets__fullscreen');
            }

            if (initWidth && initHeight) {
                $canvas.width(initWidth).height(initHeight);
                $iframe.height(initHeight);

                $bg.attr({
                    'data-bannereditor-width': initWidth,
                    'data-bannereditor-height': initHeight
                });
            } else if ($bg.length) {
                let bWidth = initWidth || $bg.data('bannereditor-width'),
                    bHeight = initHeight || $bg.data('bannereditor-height');

                $canvas.width(bWidth).height(bHeight);
                $iframe.height(bHeight);

                this.bannerWidth = bWidth;
                this.bannerHeight = bHeight;
            }

            $element.find('.qor-bannereditor__contents').show();
        },

        getContentSize: function(w, h) {
            return {
                width: 1200,
                height: 1200 * h / w
            };
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
                data = $ele.data();

            this.BottomSheets = $('body').data('qor.bottomsheets');

            data.url = data.bannerMediaUrl;
            this.BottomSheets.open(data, this.handleBannerImage.bind(this));

            return false;
        },

        handleBannerImage: function($bottomsheets) {
            let options = {
                onSelect: this.addBannerImage.bind(this),
                onSubmit: this.addBannerImage.bind(this)
            };

            $bottomsheets.qorSelectCore(options).addClass(CLASS_MEDIABOX);
            this.$bottomsheets = $bottomsheets;
            this.initMedia();
        },

        addBannerImage: function(data) {
            let MediaOption = data.MediaOption,
                $ele = data.$clickElement,
                imgUrl,
                bg = `<div class="${CLASS_BANNEREDITOR_BG.slice(1)}" />`,
                $bg = this.$bg;

            if (MediaOption) {
                MediaOption = data.MediaOption.URL ? data.MediaOption : JSON.parse(data.MediaOption);
                imgUrl = MediaOption.URL;
            } else if ($ele && $ele.find('[data-heading="BannerEditorUrl"]').length) {
                imgUrl = data.$clickElement.find('[data-heading="BannerEditorUrl"]').text();
            } else {
                imgUrl = JSON.parse(data.File).Url;
            }

            if (!$bg.length) {
                this.$canvas.wrapInner(bg);
                this.$bg = $bg = this.$canvas.find(CLASS_BANNEREDITOR_BG);
            }

            this.resetBoxSize(imgUrl, $bg);
            $bg.css({
                'background-image': `url(${imgUrl})`,
                'background-repeat': 'no-repeat',
                'background-position': 'center center',
                width: '100%',
                height: '100%'
            });

            this.$bottomsheets.remove();

            if (!$('.qor-bottomsheets').is(':visible')) {
                $('body').removeClass('qor-bottomsheets-open');
            }

            this.setValue();
            return false;
        },

        resetBoxSize: function(url, $bg) {
            let $canvas = this.$canvas,
                $iframe = this.$iframe,
                initWidth = this.initWidth,
                initHeight = this.initHeight,
                cSize,
                _this = this;

            if (!(initWidth && initHeight)) {
                getImgSize(url, function(width, height) {
                    if (width > 1200) {
                        cSize = _this.getContentSize(width, height);
                        width = cSize.width;
                        height = cSize.height;
                    }

                    width = initWidth || width;
                    height = initHeight || height;

                    $canvas.width(width).height(height);
                    $iframe.height(height);

                    $bg.attr({
                        'data-bannereditor-width': width,
                        'data-bannereditor-height': height
                    });

                    _this.bannerWidth = width;
                    _this.bannerHeight = height;
                    _this.setValue();
                });
            }
        },

        handleInlineEdit: function(e) {
            let $target = $(e.target).closest(CLASS_DRAGGABLE),
                $canvas = this.$canvas;

            $canvas.find('.qor-bannereditor__button-inline, .qor-bannereditor__draggable-coordinate').remove();
            $canvas.find(CLASS_DRAGGABLE).removeClass(CLASS_BANNEREDITOR_DRAGGING);
            $target.addClass(CLASS_BANNEREDITOR_DRAGGING).append(QorBannerEditor.inlineEdit);

            return false;
        },

        ajaxForm: function(url, title) {
            let $popover = this.$popover,
                _this = this;

            $.ajax(url, {
                method: 'GET',
                dataType: 'html',
                success: function(html) {
                    let $content = $(html).find('.qor-form-container'),
                        popupTitle =
                            title ||
                            $(html)
                                .find('.mdl-layout-title')
                                .html();

                    $content
                        .find('.qor-button--cancel')
                        .attr('data-dismiss', 'modal')
                        .removeAttr('href');
                    $popover.find('.qor-bannereditor__title').html(popupTitle);
                    $popover.find('.qor-bannereditor__content').html($content.html());
                    $popover.trigger('enable').qorModal('show');

                    $popover.off(EVENT_CLICK).on(EVENT_CLICK, '.qor-bannereditor__content button[type="submit"]', _this.renderElement.bind(_this));
                }
            });
        },

        showEdit: function(e) {
            let $target = $(e.target).closest('button'),
                type = $target.data('edit-type'),
                $element = $target.closest(CLASS_DRAGGABLE),
                data = $element.data();

            switch (type) {
                case 'edit':
                    this.showEditForm(data, $element);
                    break;

                case 'delete':
                    this.deleteElement($element);
                    break;

                case 'left':
                case 'center':
                case 'right':
                    this.alignHorizontally($element, type);
                    break;

                case 'top':
                case 'middle':
                case 'bottom':
                    this.alignVertically($element, type);
                    break;
            }

            e.stopPropagation();
            return false;
        },

        alignHorizontally: function($element, type) {
            $element.attr('align-horizontally', type);
            this.alignElement($element, type);
        },

        alignVertically: function($element, type) {
            $element.attr('align-vertically', type);
            this.alignElement($element, type);
        },

        alignElement: function($element, type) {
            let options = this.options,
                horizontally = $element.attr('align-horizontally'),
                vertically = $element.attr('align-vertically'),
                positionWidth = 300 - $element.width(),
                css = options[type];

            if (vertically === 'top') {
                $element.addClass(CLASS_TOP);
            } else if ($element.hasClass(CLASS_TOP)) {
                $element.removeClass(CLASS_TOP);
            }

            if (horizontally === 'left' && positionWidth > 0) {
                $element.addClass(CLASS_LEFT);
            } else if ($element.hasClass(CLASS_LEFT)) {
                $element.removeClass(CLASS_LEFT);
            }

            if (horizontally === 'center' && vertically === 'middle') {
                css = options.centermiddle;
            } else if (horizontally && vertically) {
                css = $.extend({}, options[horizontally], options[vertically]);
            }

            $element
                .css('transform', '')
                .css(css)
                .attr('data-position-left', parseInt($element.css('left')))
                .attr('data-position-top', parseInt($element.css('top')));

            this.setValue();
        },

        showInlineEdit: function(e) {
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
            let $target = ui.helper,
                positionWidth = 300 - $target.width();

            ui.position.left = parseInt(ui.position.left, 10);
            ui.position.top = parseInt(ui.position.top, 10);

            if ($target.css('transform')) {
                $target.css('transform', '');
            }

            if ($target.css('bottom') === '0px' || $target.css('right') === '0px') {
                $target.css({bottom: 'auto', right: 'auto'});
            }

            if ($target.attr('align-vertically') || $target.attr('align-horizontally')) {
                $target.removeAttr('align-vertically').removeAttr('align-horizontally');
            }

            if (ui.position.top < 40) {
                $target.addClass(CLASS_TOP);
            } else if ($target.hasClass(CLASS_TOP)) {
                $target.removeClass(CLASS_TOP);
            }

            if (positionWidth > 0 && ui.position.left < positionWidth) {
                $target.addClass(CLASS_LEFT);
            } else if ($target.hasClass(CLASS_LEFT)) {
                $target.removeClass(CLASS_LEFT);
            }

            this.$canvas.find('.qor-bannereditor__draggable-coordinate').remove();
            $target.addClass(CLASS_BANNEREDITOR_DRAGGING).append(window.Mustache.render(QorBannerEditor.dragCoordinate, ui.position));
            $target.find('.qor-bannereditor__button-inline').hide();
        },

        handleDragStop: function(event, ui) {
            let cWidth = this.$canvas.width(),
                cHeight = this.$canvas.height(),
                helperLeft = ui.position.left / cWidth * 100 + '%',
                helperTop = ui.position.top / cHeight * 100 + '%',
                helper = ui.helper,
                css = {
                    left: helperLeft,
                    top: helperTop
                };

            helper.css(css).attr({
                'data-position-left': ui.position.left,
                'data-position-top': ui.position.top
            });

            if (!helper.find('.qor-bannereditor__button-inline').length) {
                helper.removeClass(CLASS_BANNEREDITOR_DRAGGING);
            }

            ui.helper.find('.qor-bannereditor__button-inline').show();
            ui.helper.find('.qor-bannereditor__draggable-coordinate').remove();
            this.setValue();
        },

        handleResizeStop: function(event, ui) {
            let cWidth = this.$canvas.width(),
                helperWidth = ui.size.width / cWidth * 100 + '%';

            ui.helper.css('width', helperWidth);
            this.setValue();
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
                $popover = this.$popover,
                $editElement = this.$editElement,
                options = this.options,
                eleID = `qor-bannereditor__${(Math.random() + 1).toString(36).substring(7)}`;

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
                    if (!data.Template) {
                        return;
                    }

                    let $ele = $(`<span id="${eleID}" class="${CLASS_DRAGGABLE.slice(1)}">${data.Template}</span>`);

                    if ($editElement && $editElement.length) {
                        let left = $editElement[0].style.left,
                            top = $editElement[0].style.top,
                            width = $editElement[0].style.width,
                            attrs = $editElement.prop('attributes');

                        $ele
                            .css({
                                position: 'absolute',
                                left: left,
                                top: top,
                                width: width
                            })
                            .attr('data-edit-id', data.ID);

                        $.each(attrs, function() {
                            let name = this.name;

                            if (name == 'style' || name == 'class' || name == 'data-edit-id') {
                                return;
                            }

                            $ele.attr(this.name, this.value);
                        });

                        $ele
                            .appendTo($body)
                            .draggable(options.draggable)
                            .resizable(options.resizable);

                        $popover.qorModal('hide');

                        $editElement.remove();
                        _this.$editElement = null;
                    } else {
                        $ele
                            .css({
                                position: 'absolute',
                                left: '10%',
                                top: '10%'
                            })
                            .attr('data-edit-id', data.ID)
                            .appendTo($body)
                            .draggable(options.draggable)
                            .resizable(options.resizable);

                        $popover.qorModal('hide');
                    }
                    _this.setValue();
                    _this.$popover.off(EVENT_CLICK);
                },
                error: function(xhr, textStatus, errorThrown) {
                    if (xhr.status === 422 && xhr.responseJSON.errors[0]) {
                        _this.$popover.find('form').before(window.Mustache.render(QorBannerEditor.errorMessage, {message: xhr.responseJSON.errors[0]}));
                    } else {
                        window.alert([textStatus, errorThrown].join(': '));
                    }
                }
            });

            return false;
        },

        addElements: function(e) {
            let $target = $(e.target).closest('button'),
                url = $target.data('banner-url'),
                title = $target.data('title');

            this.ajaxForm(url, title);
        },

        setValue: function() {
            let $html = this.$canvas.clone();
            $html.find(CLASS_DRAGGABLE).removeClass('ui-draggable-handle ui-resizable ui-draggable-dragging qor-bannereditor__dragging');
            $html.find(CLASS_NEED_REMOVE).remove();
            this.$textarea.val($html.html().replace(/&quot;/g, ''));
        },

        destroy: function() {
            this.unbind();
            this.$element.removeData(NAMESPACE);
        }
    };

    QorBannerEditor.DEFAULTS = {
        draggable: {
            addClasses: false,
            distance: 10,
            snap: true,
            containment: 'parent',
            scroll: false
        },
        resizable: {
            handles: 'e'
        },
        left: {
            left: 0,
            right: 'auto'
        },
        center: {
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)'
        },
        right: {
            left: 'auto',
            right: 0
        },
        top: {
            top: 0,
            bottom: 'auto'
        },
        middle: {
            top: '50%',
            bottom: 'auto',
            transform: 'translateY(-50%)'
        },
        bottom: {
            top: 'auto',
            bottom: 0
        },
        centermiddle: {
            top: '50%',
            left: '50%',
            bottom: 'auto',
            right: 'auto',
            transform: 'translate(-50%,-50%)'
        }
    };

    QorBannerEditor.toolbar = `[[#toolbar]]
                                    <button class="mdl-button mdl-button--colored qor-bannereditor__button" data-banner-url="[[CreateURL]]" id="[[id]]" data-title="[[Name]]" type="button">
                                        [[#Icon]][[& Icon]][[/Icon]]
                                        [[^Icon]]
                                            [[Name]]
                                        [[/Icon]]
                                    </button>
                                    [[#Icon]]
                                        <span class="mdl-tooltip" data-mdl-for="[[id]]">
                                            [[Name]]
                                        </span>
                                    [[/Icon]]
                                [[/toolbar]]`;

    QorBannerEditor.dragCoordinate = `<div class="qor-bannereditor__draggable-coordinate"><span>x :<em>[[left]]</em></span><span>y :<em>[[top]]</em></span></div>`;

    QorBannerEditor.errorMessage = `<ul class="qor-error">
                                        <li>
                                            <label for="">
                                                <i class="material-icons">error</i>
                                                <span>[[message]]</span>
                                            </label>
                                        </li>
                                    </ul>`;

    QorBannerEditor.inlineEdit = `<div class="qor-bannereditor__button-inline">
                                    <button class="mdl-button mdl-button--icon" data-edit-type="left" type="button"><i class="material-icons">format_align_left</i></button>
                                    <button class="mdl-button mdl-button--icon" data-edit-type="center" type="button"><i class="material-icons">format_align_center</i></button>
                                    <button class="mdl-button mdl-button--icon" data-edit-type="right" type="button"><i class="material-icons">format_align_right</i></button>
                                    <hr />
                                    <button class="mdl-button mdl-button--icon" data-edit-type="top" type="button"><i class="material-icons">vertical_align_top</i></button>
                                    <button class="mdl-button mdl-button--icon" data-edit-type="middle" type="button"><i class="material-icons">vertical_align_center</i></button>
                                    <button class="mdl-button mdl-button--icon" data-edit-type="bottom" type="button"><i class="material-icons">vertical_align_bottom</i></button>
                                    <hr />
                                    <button class="mdl-button mdl-button--icon" data-edit-type="edit" type="button"><i class="material-icons">mode_edit</i></button>
                                    <button class="mdl-button mdl-button--icon" data-edit-type="delete" type="button"><i class="material-icons">delete_forever</i></button>
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

            if (typeof options === 'string' && $.isFunction((fn = data[options]))) {
                fn.apply(data);
            }
        });
    };

    $(function() {
        let selector = '[data-toggle="qor.bannereditor"]:visible'; // if element is hide, return fasle. (e.g., replicator)

        $(document)
            .on(EVENT_DISABLE, function(e) {
                QorBannerEditor.plugin.call($(selector, e.target), 'destroy');
            })
            .on(EVENT_ENABLE, function(e) {
                QorBannerEditor.plugin.call($(selector, e.target));
            })
            .triggerHandler(EVENT_ENABLE);
    });

    return QorBannerEditor;
});
