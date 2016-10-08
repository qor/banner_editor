(function($) {
  var vee = {
    defaults: {
      $this: undefined,
      actionSelect: ".veeEditorActionBar",
      contentSelect: ".veeEditorContent",
      width: "100%",
      height: "100%",
      flex: false,
      datas : {},
      editingElement: null
    },

    init : function (options){
      vee.defaults = $.extend({}, vee.defaults, options);

      this.initEditer();
      this.initStatus();
      this.bindEvent();
    },

    initEditer: function() {
      var $this = vee.defaults.$this;
      var editorTemplate =
        '<div class="veeEditor">' +
          '<div class="veeEditorActionBar">' +
          '</div>' +
          '<div class="veeEditorContent">' +
            '{originalContent}' +
          '</div>' +
        '</div>'

      $this.hide();
      $(editorTemplate.replace("{originalContent}", $this.val())).insertAfter($this);
    },

    initStatus : function (){
      if($('.veeContent', vee.defaults.contentSelect).size() == 0){
        var veeContentTemplate = $('<div class="veeContent"></div>');
        $(vee.defaults.contentSelect).html(veeContentTemplate);
      }
      var position = vee.defaults.flex ? 'absolute' : 'relative';
      var height = $(vee.defaults.contentSelect).width() * (vee.defaults.height / vee.defaults.width)
      $('.veeContent', vee.defaults.contentSelect).css({ 'position': position, 'width': "100%", 'height': height, border: '#ccc solid 1px' });

      var buttonHtml = [];
      $.each(vee.defaults.datas, function(k, v){
        buttonHtml.push('<a href="#" class="veeNewButton" data-type="'+k+'">'+k+'</a>');
      });

      $(vee.defaults.actionSelect).html(buttonHtml.join(""));

      $("body").on('click', ".veeNewButton", function(){
        var $veeElement = $('<div title="Click to edit" class="veeElement" style="position: absolute;" data-button="'+$(this).data("type")+'"></div>');
        /* Add action bar height to element due in Flex mode */
        if (vee.defaults.flex) { $veeElement.css({ top: vee.getActionBarHeight() + 'px' }); };
        $.each(vee.defaults.datas[$(this).data("type")]['keys'], function(key, value){
          $veeElement.attr("data-" + key, encodeURIComponent(value['default']))
        });
        $(".veeContent", vee.defaults.contentSelect).append(vee.renderAsData($veeElement));
        return false;
      });

      $(".veeContent", vee.defaults.contentSelect).append('<div id="veeRuler" style="display: none"><div id="veeRulerhw"><input class="veeHeight" value=""><input class="veeWidth" value=""></div></div>')

      vee.initElementRealPositionInFlexMode();
    },

    bindEvent : function (){
      $("body").on("click", ".veeEditor", function(evt){
        var target = evt.target || evt.srcElement;
        if($(target).parents(".veeEditForm").get(0) == undefined) {
          vee.hideForm();
        }
      });
      $("#veeTrash").unbind('click').bind('click', function() {
        var $this = $(this),
            $veeElement = $(".veeElement.hasVeeTrash");

        if (confirm($this.data('confirm'))) {
          vee.cleanHtml();
          $this.hide();
        };

        return false;
      });

      $("body").on("mouseover", ".veeElement", function(){
        var $veeElement = $(this);

        $(this).draggable({
          start: function() {
            $("#veeRuler").show();
          },
          drag: function() {
            cssleft = $(this).css("left");
            csstop = $(this).css("top");
            /* Rule displayed height = csstop - actionBarHeight in Flex mode */
            var veeHeight = vee.defaults.flex ? (Number(csstop.replace("px","")) - vee.getActionBarHeight()) + "px" : csstop;

            $("#veeRulerhw").css({'width': cssleft, 'height' : csstop})
            $("#veeRulerhw .veeWidth").attr('value', cssleft);
            $("#veeRulerhw .veeHeight").attr('value', veeHeight);
            vee.setEditFormStyle($veeElement);
          },
          stop: function() {
            $("#veeRuler").hide();
            var $container = $(this).parents(".veeEditorContent");
            $(this).css("left",parseInt($(this).css("left")) / ($container.width() / 100)+"%");
            $(this).css("top",parseInt($(this).css("top")) / ($container.height() / 100)+"%");
          },
          grid: [ 5,5 ],
          containment: 'parent'
        });
        return false;
      });

      $("body").on("click", ".veeElement", function(){
        $(this).siblings().removeClass("enable");
        $(this).addClass("enable");
        vee.hideForm();
        vee.editingElement = $(this);
        vee.displayForm(vee.editingElement);
        return false;
      });
      $("body").on("click", ".veeEditFormUpdate", function() {
        vee.hideForm();
      });
      $("body").on("click", ".veeEditFormDelete", function() {
        if (confirm("Are you sure to delete this element?")) {
          if(vee.editingElement){
            vee.editingElement.remove();
          } else {
            $(".veeElement.enable").remove();
          }
          vee.cleanHtml();
        };
      });

      var $this = vee.defaults.$this;
      $this.parents('form').submit(function() {
        vee.turnToNormalMode();
        if (vee.defaults.flex) {
          vee.restoreElementRealPosition();
        };
        $(".veeContent", vee.defaults.contentSelect).css({ "height" : "auto", "border": "" });
        $this.val($(vee.defaults.contentSelect).html());
      });
    },

    hideForm : function (){
      vee.editingElement = null;
      $(".veeEditForm").remove();
    },

    cleanHtml : function (){
      $(".veeEditForm").remove();
    },

    turnToNormalMode: function() {
      $("#veeRuler, .veeEditForm").remove();
    },

    displayForm : function ($veeElement){
      var datakeys = vee.defaults.datas[$veeElement.data('button')]['keys'],
          editHtml = '<div class="veeEditForm">';
      $.each( datakeys, function( key, value ) {
        editHtml += '<div class="veeEditFormField"><label>'+key+':</label><div id="'+key+'"></div></div>';
      });
      editHtml += '<div class="veeEditFormBtns"> \
                    <div class="veeEditFormBtn veeEditFormUpdate">Close</div> \
                    <div class="veeEditFormBtn veeEditFormDelete">Delete</div> \
                   </div> \
                  </div>';

      $(".veeContent", vee.defaults.contentSelect).append(editHtml);
      $(".veeEditForm").draggable({
        containment: "parent"
      });

      $.each( datakeys, function( key, value ) {
        if("color" == value['type']){
          vee.renderAsColorPick($veeElement, key)
        }else if('select' == value['type']){
          vee.renderAsSelect($veeElement, key)
        }else if('input' == value['type']){
          vee.renderAsInput($veeElement, key)
        }else if('textarea' == value['type']){
          vee.renderAsTextArea($veeElement, key)
        }else {
          alert('Not support type');
        }
      });
      vee.setEditFormStyle($veeElement);
      return false;
    },

    disableLinkInEditorMode : function (){
      return false;
    },

    setEditFormStyle : function (veeElement){
      var form_height = $(".veeContent").height();
      var form_width = $(".veeContent").width();
      var width_of_right_form_to_contain_dialog = form_width - veeElement.position().left - veeElement.width();
      var height_of_bottom_form_to_contain_dialog = form_height - veeElement.position().top - veeElement.height() - 40;

      if(height_of_bottom_form_to_contain_dialog > $(".veeEditForm").height()){
        var top = veeElement.position().top + veeElement.height();
      } else {
        var middle_layout_height = veeElement.position().top - veeElement.height() - $(".veeEditForm").height() - 15;
        var top = middle_layout_height > 0 ? middle_layout_height : 5;
      }
      if(top == 5) {
        var left = width_of_right_form_to_contain_dialog > $(".veeEditForm").width() ? veeElement.position().left + veeElement.width() + 10 : veeElement.position().left - $(".veeEditForm").width() - 40;
      } else {
        var left = width_of_right_form_to_contain_dialog > $(".veeEditForm").width() ? veeElement.position().left : veeElement.position().left - ($(".veeEditForm").width() - veeElement.width()) - 20;
      }

      if(veeElement.position().left > form_width || veeElement.position().left < 0) { left = (form_width/2 - 40) }
      if(veeElement.position().top > form_height || veeElement.position().top < 0) { top = (form_height/2 - 80) }

      $(".veeEditForm").css('left', left).css('top', top);
    },

    renderAsInput : function (veeElement, formKey){
      var value = decodeURIComponent(veeElement.attr("data-" + formKey));
      $("#" + formKey).html('<input name="" value="'+value+'" />')
      $("#"+formKey+" input").keyup(function(){
        veeElement.attr("data-"+formKey , encodeURIComponent($(this).val()));
        vee.renderAsData(veeElement);
      });
    },

    renderAsSelect : function (veeElement, formKey){
      var selected = decodeURIComponent(veeElement.attr("data-" + formKey));
      var selectkeys = vee.defaults.datas[veeElement.data('button')]['keys'][formKey]['options'];
      var selecthtml = ['<div id="selector"><select>']
      $.each(selectkeys, function(index, value){
        if(selected == value){
          selecthtml.push('<option selected="selected" value ="'+value+'">'+value+'</option>')
        }else{
          selecthtml.push('<option value ="'+value+'">'+value+'</option>')
        }
      });
      selecthtml.push('</select></div>')
      $("#"+ formKey).html(selecthtml.join(""));

      $("#"+formKey+" select").change(function(){
        veeElement.attr("data-"+formKey , encodeURIComponent($(this).val()) );
        vee.renderAsData(veeElement);
      });
    },

    renderAsTextArea : function (veeElement, formKey){
      var value = decodeURIComponent(veeElement.attr("data-" + formKey));
      $("#" + formKey).html('<textarea>'+value+'</textarea>')
      $("#"+formKey+" textarea").change(function(){
      veeElement.attr("data-"+formKey , encodeURIComponent($(this).val()) );
        vee.renderAsData(veeElement);
      });
    },

    renderAsColorPick : function (veeElement, formKey){
      var color = decodeURIComponent(veeElement.attr("data-" + formKey));
      $("#"+formKey).html('<div id="colorSelector"><div style="background-color: '+color+'"></div></div>')
      $('#colorSelector').ColorPicker({
        color: color,
        onShow: function (colpkr) {
          $(colpkr).fadeIn(500);
          return false;
        },
        onHide: function (colpkr) {
          $(colpkr).fadeOut(500);
          return false;
        },
        onChange: function (hsb, hex, rgb) {
          $('#colorSelector div').css('backgroundColor', '#' + hex);
          veeElement.attr("data-"+formKey , encodeURIComponent('#' + hex) );
          vee.renderAsData(veeElement);
        }
      });
    },

    renderAsData : function (veeElement){
      elementTemplate = vee.defaults.datas[veeElement.data('button')]['template'];
      var datakeys = vee.defaults.datas[veeElement.data('button')]['keys'];
      $.each(datakeys, function(key, value){
        elementTemplate = elementTemplate.replace(RegExp("{{"+key+"}}", 'g'), decodeURIComponent(veeElement.attr("data-" + key)))
      });
      return veeElement.html(elementTemplate);
    },

    /******************** Flex related methods  ************************/

    getActionBarHeight: function() {
      return document.getElementsByClassName("veeEditorActionBar")[0].offsetHeight;
    },

    restoreElementRealPosition: function() {
      $(".veeElement").each(function(i, e) {
        var $this = $(e);
        var realTop = Number($this.css("top").replace("px", "")) - vee.getActionBarHeight();
        $this.css({ top : realTop });
      });
    },

    initElementRealPositionInFlexMode: function() {
      if (vee.defaults.flex) {
        $(".veeElement").each(function(i, e) {
          var $this = $(e);
          var realTop = Number($this.css("top").replace("px", "")) + vee.getActionBarHeight();
          $this.css({ top : realTop });
        });
      };
    }
  };

  $.fn.vee = function(options) {
    vee.init($.extend(options, {
      $this: $(this)
    }));
  };
})(jQuery);
